import os

import httpx

from models import GeoPoint

OSRM_BASE_URL = os.environ.get("OSRM_BASE_URL", "http://localhost:5000")


class OsrmError(Exception):
    pass


async def get_distance_duration_matrix(
    points: list[GeoPoint],
) -> tuple[list[list[float]], list[list[float]]]:
    """
    Calls OSRM's /table service for the full points list (index 0 is the
    hub, the rest are order stops) and returns (distance_m, duration_s)
    matrices, both len(points) x len(points).
    """
    coords = ";".join(f"{p.lng},{p.lat}" for p in points)
    url = f"{OSRM_BASE_URL}/table/v1/driving/{coords}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, params={"annotations": "distance,duration"})

    if response.status_code != 200:
        raise OsrmError(f"OSRM table request failed ({response.status_code}): {response.text}")

    body = response.json()
    if body.get("code") != "Ok":
        raise OsrmError(f"OSRM table returned error: {body.get('message', body.get('code'))}")

    distances = body.get("distances")
    durations = body.get("durations")
    if distances is None or durations is None:
        raise OsrmError("OSRM table response missing distances/durations")

    return distances, durations
