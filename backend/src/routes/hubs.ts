import { Router } from "express";
import { z } from "zod";
import { supabase } from "../services/supabase.js";
import { geocodeAddress } from "../services/geocoding.js";
import { config } from "../config.js";

export const hubsRouter = Router();

hubsRouter.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("hubs_view")
    .select("*")
    .eq("tenant_id", config.defaultTenantId)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

const createHubSchema = z.object({
  name: z.string().min(1),
  hub_type: z.enum(["main_hub", "warehouse", "depot", "partner_hub"]).default("main_hub"),
  address: z.string().min(1),
});

hubsRouter.post("/", async (req, res) => {
  const parsed = createHubSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { name, hub_type, address } = parsed.data;

  const point = await geocodeAddress(address);
  if (!point) {
    return res.status(422).json({ error: `Could not geocode address: ${address}` });
  }

  const { data, error } = await supabase.rpc("create_hub", {
    p_tenant_id: config.defaultTenantId,
    p_name: name,
    p_hub_type: hub_type,
    p_address: address,
    p_lat: point.lat,
    p_lng: point.lng,
  });

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ id: data });
});
