import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { supabase } from "../services/supabase.js";
import { geocodeAddress } from "../services/geocoding.js";
import { config } from "../config.js";

export const ordersRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

const orderInputSchema = z.object({
  order_type: z.enum(["delivery", "pickup", "reverse_pickup"]).default("delivery"),
  pickup_address: z.string().optional(),
  dropoff_address: z.string().optional(),
  package_volume_m3: z.coerce.number().nullable().optional(),
  package_weight_kg: z.coerce.number().nullable().optional(),
  preferred_window_start: z.string().nullable().optional(),
  preferred_window_end: z.string().nullable().optional(),
  recipient_name: z.string().nullable().optional(),
  recipient_phone: z.string().nullable().optional(),
  special_notes: z.string().nullable().optional(),
});

type OrderInput = z.infer<typeof orderInputSchema>;

interface GeocodeIssue {
  address: string;
  reason: string;
}

async function geocodeOrder(input: OrderInput) {
  const issues: GeocodeIssue[] = [];

  const [pickup, dropoff] = await Promise.all([
    input.pickup_address ? geocodeAddress(input.pickup_address) : Promise.resolve(null),
    input.dropoff_address ? geocodeAddress(input.dropoff_address) : Promise.resolve(null),
  ]);

  if (input.pickup_address && !pickup) {
    issues.push({ address: input.pickup_address, reason: "pickup address not found" });
  }
  if (input.dropoff_address && !dropoff) {
    issues.push({ address: input.dropoff_address, reason: "dropoff address not found" });
  }

  return { pickup, dropoff, issues };
}

async function insertOrder(input: OrderInput, pickup: { lat: number; lng: number } | null, dropoff: { lat: number; lng: number } | null) {
  const { data, error } = await supabase.rpc("create_order", {
    p_tenant_id: config.defaultTenantId,
    p_order_type: input.order_type,
    p_pickup_address: input.pickup_address ?? null,
    p_pickup_lat: pickup?.lat ?? null,
    p_pickup_lng: pickup?.lng ?? null,
    p_dropoff_address: input.dropoff_address ?? null,
    p_dropoff_lat: dropoff?.lat ?? null,
    p_dropoff_lng: dropoff?.lng ?? null,
    p_package_volume_m3: input.package_volume_m3 ?? null,
    p_package_weight_kg: input.package_weight_kg ?? null,
    p_preferred_window_start: input.preferred_window_start ?? null,
    p_preferred_window_end: input.preferred_window_end ?? null,
    p_recipient_name: input.recipient_name ?? null,
    p_recipient_phone: input.recipient_phone ?? null,
    p_special_notes: input.special_notes ?? null,
  });

  if (error) throw new Error(error.message);
  return data as string; // new order id
}

ordersRouter.get("/", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;

  let query = supabase
    .from("orders_view")
    .select("*")
    .eq("tenant_id", config.defaultTenantId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

ordersRouter.post("/", async (req, res) => {
  const parsed = orderInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const { pickup, dropoff, issues } = await geocodeOrder(parsed.data);
    if (issues.length > 0) {
      return res.status(422).json({ error: "Could not geocode one or more addresses", issues });
    }
    const id = await insertOrder(parsed.data, pickup, dropoff);
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// CSV columns: order_type,pickup_address,dropoff_address,package_volume_m3,
// package_weight_kg,preferred_window_start,preferred_window_end,
// recipient_name,recipient_phone,special_notes
ordersRouter.post("/csv", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Missing 'file' upload (multipart/form-data, field name 'file')" });
  }

  let rows: Record<string, string>[];
  try {
    rows = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    return res.status(400).json({ error: `Invalid CSV: ${(err as Error).message}` });
  }

  const created: string[] = [];
  const failed: Array<{ row: number; error: string }> = [];

  for (const [index, row] of rows.entries()) {
    const parsed = orderInputSchema.safeParse(row);
    if (!parsed.success) {
      failed.push({ row: index + 1, error: JSON.stringify(parsed.error.flatten()) });
      continue;
    }
    try {
      const { pickup, dropoff, issues } = await geocodeOrder(parsed.data);
      if (issues.length > 0) {
        failed.push({ row: index + 1, error: issues.map((i) => `${i.address}: ${i.reason}`).join("; ") });
        continue;
      }
      const id = await insertOrder(parsed.data, pickup, dropoff);
      created.push(id);
    } catch (err) {
      failed.push({ row: index + 1, error: (err as Error).message });
    }
  }

  res.status(created.length > 0 ? 201 : 422).json({
    created_count: created.length,
    failed_count: failed.length,
    created_ids: created,
    failed,
  });
});
