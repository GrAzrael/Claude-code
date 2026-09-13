import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { hubsRouter } from "./routes/hubs.js";
import { vehiclesRouter } from "./routes/vehicles.js";
import { ordersRouter } from "./routes/orders.js";
import { routesRouter } from "./routes/routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/hubs", hubsRouter);
app.use("/api/vehicles", vehiclesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/routes", routesRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`TMS thin-slice backend listening on port ${config.port}`);
});
