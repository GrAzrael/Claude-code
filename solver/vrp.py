from dataclasses import dataclass

from ortools.constraint_solver import pywrapcp, routing_enums_pb2

# Nodes that can't be fit into any feasible route are dropped instead of
# making the whole solve infeasible. This is a large but finite cost so the
# solver still strongly prefers serving every order over leaving it out.
UNASSIGNED_PENALTY = 1_000_000

# Depot (hub) operating window, in minutes since midnight. Vehicles may
# start/return any time within this window. 0..1440 covers the full day —
# tighten this once real operating hours are known.
DEFAULT_DEPOT_WINDOW = (0, 24 * 60)

# Max minutes a stop may wait at a location before service starts, to allow
# the solver flexibility when a node's window opens later than the vehicle
# would otherwise arrive.
TIME_SLACK_MIN = 60

# Scaling factors so OR-Tools (which wants integers) can still respect
# fractional m3/kg capacities.
VOLUME_SCALE = 100  # 0.01 m3 resolution
WEIGHT_SCALE = 10  # 0.1 kg resolution

UNBOUNDED_CAPACITY = 10**9


@dataclass
class VrpInput:
    distance_matrix_m: list[list[float]]
    duration_matrix_s: list[list[float]]
    demands_volume_m3: list[float]  # index 0 (depot) must be 0
    demands_weight_kg: list[float]  # index 0 (depot) must be 0
    service_times_min: list[int]  # index 0 (depot) must be 0
    time_windows_min: list[tuple[int, int]]  # per node, index 0 is depot window
    vehicle_capacity_volume_m3: list[float | None]
    vehicle_capacity_weight_kg: list[float | None]


@dataclass
class VrpVehicleRoute:
    vehicle_index: int
    node_sequence: list[int]  # excludes depot at both ends
    arrival_min: list[int]  # arrival time (minutes since midnight) per node in node_sequence
    total_distance_m: float
    total_duration_min: int


@dataclass
class VrpSolution:
    routes: list[VrpVehicleRoute]
    unassigned_nodes: list[int]


def solve_vrp(vrp_input: VrpInput, time_limit_seconds: int = 10) -> VrpSolution:
    num_nodes = len(vrp_input.distance_matrix_m)
    num_vehicles = len(vrp_input.vehicle_capacity_volume_m3)
    depot_index = 0

    manager = pywrapcp.RoutingIndexManager(num_nodes, num_vehicles, depot_index)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index: int, to_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return int(round(vrp_input.distance_matrix_m[from_node][to_node]))

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    def make_capacity_callback(demands: list[float], scale: int):
        def callback(from_index: int) -> int:
            node = manager.IndexToNode(from_index)
            return int(round(demands[node] * scale))

        return callback

    volume_capacities = [
        int(round(c * VOLUME_SCALE)) if c is not None else UNBOUNDED_CAPACITY
        for c in vrp_input.vehicle_capacity_volume_m3
    ]
    weight_capacities = [
        int(round(c * WEIGHT_SCALE)) if c is not None else UNBOUNDED_CAPACITY
        for c in vrp_input.vehicle_capacity_weight_kg
    ]

    volume_callback_index = routing.RegisterUnaryTransitCallback(
        make_capacity_callback(vrp_input.demands_volume_m3, VOLUME_SCALE)
    )
    routing.AddDimensionWithVehicleCapacity(volume_callback_index, 0, volume_capacities, True, "Volume")

    weight_callback_index = routing.RegisterUnaryTransitCallback(
        make_capacity_callback(vrp_input.demands_weight_kg, WEIGHT_SCALE)
    )
    routing.AddDimensionWithVehicleCapacity(weight_callback_index, 0, weight_capacities, True, "Weight")

    def time_callback(from_index: int, to_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        travel_min = vrp_input.duration_matrix_s[from_node][to_node] / 60.0
        return int(round(travel_min)) + vrp_input.service_times_min[from_node]

    time_callback_index = routing.RegisterTransitCallback(time_callback)
    routing.AddDimension(
        time_callback_index,
        TIME_SLACK_MIN,
        DEFAULT_DEPOT_WINDOW[1],
        False,  # don't force cumulative time to start at zero
        "Time",
    )
    time_dimension = routing.GetDimensionOrDie("Time")

    for node in range(num_nodes):
        if node == depot_index:
            continue
        index = manager.NodeToIndex(node)
        window_start, window_end = vrp_input.time_windows_min[node]
        time_dimension.CumulVar(index).SetRange(window_start, window_end)

    depot_start, depot_end = vrp_input.time_windows_min[depot_index]
    for vehicle_id in range(num_vehicles):
        start_index = routing.Start(vehicle_id)
        time_dimension.CumulVar(start_index).SetRange(depot_start, depot_end)
        routing.AddVariableMinimizedByFinalizer(time_dimension.CumulVar(start_index))
        routing.AddVariableMinimizedByFinalizer(time_dimension.CumulVar(routing.End(vehicle_id)))

    for node in range(1, num_nodes):
        routing.AddDisjunction([manager.NodeToIndex(node)], UNASSIGNED_PENALTY)

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.FromSeconds(time_limit_seconds)

    solution = routing.SolveWithParameters(search_parameters)
    if solution is None:
        raise RuntimeError("OR-Tools found no solution (even with droppable stops) — check inputs")

    routes: list[VrpVehicleRoute] = []
    visited_nodes: set[int] = set()

    for vehicle_id in range(num_vehicles):
        index = routing.Start(vehicle_id)
        node_sequence: list[int] = []
        arrival_min: list[int] = []
        total_distance_m = 0.0

        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            next_index = solution.Value(routing.NextVar(index))
            if node != depot_index:
                node_sequence.append(node)
                arrival_min.append(solution.Value(time_dimension.CumulVar(index)))
                visited_nodes.add(node)
            next_node = manager.IndexToNode(next_index)
            total_distance_m += vrp_input.distance_matrix_m[node][next_node]
            index = next_index

        if node_sequence:
            end_time = solution.Value(time_dimension.CumulVar(routing.Start(vehicle_id)))
            total_duration_min = arrival_min[-1] - end_time if arrival_min else 0
            routes.append(
                VrpVehicleRoute(
                    vehicle_index=vehicle_id,
                    node_sequence=node_sequence,
                    arrival_min=arrival_min,
                    total_distance_m=total_distance_m,
                    total_duration_min=max(total_duration_min, 0),
                )
            )

    unassigned_nodes = [node for node in range(1, num_nodes) if node not in visited_nodes]

    return VrpSolution(routes=routes, unassigned_nodes=unassigned_nodes)
