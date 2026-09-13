import { Router } from "express";
import { z } from "zod";
import { supabase } from "../services/supabase.js";
import { config } from "../config.js";

export const vehiclesRouter = Router();

vehiclesRouter.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("tenant_id", config.defaultTenantId)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

const createVehicleSchema = z.object({
  plate_number: z.string().min(1),
  vehicle_type: z.enum(["van", "truck_ramp", "forklift_lift", "truck_box", "motorbike"]),
  home_hub_id: z.string().uuid().nullable().optional(),
  capacity_volume_m3: z.number().positive().nullable().optional(),
  capacity_weight_kg: z.number().positive().nullable().optional(),
});

vehiclesRouter.post("/", async (req, res) => {
  const parsed = createVehicleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { data, error } = await supabase
    .from("vehicles")
    .insert({ tenant_id: config.defaultTenantId, ...parsed.data })
    .select("id")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});
