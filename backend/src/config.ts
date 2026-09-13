import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  locationIqApiKey: required("LOCATIONIQ_API_KEY"),
  solverUrl: process.env.SOLVER_URL ?? "http://localhost:8000",
  defaultTenantId: required(
    "DEFAULT_TENANT_ID",
    "00000000-0000-0000-0000-000000000001"
  ),
};
