import { config } from "../config.js";
import type { SolveRequest, SolveResponse } from "../types/index.js";

export async function solveRoutes(request: SolveRequest): Promise<SolveResponse> {
  const response = await fetch(`${config.solverUrl}/solve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Solver request failed (${response.status}): ${await response.text()}`);
  }

  return (await response.json()) as SolveResponse;
}
