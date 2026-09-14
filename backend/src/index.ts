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

// Render's log stream for this service only carries build/app output, no
// separate HTTP access log -- log requests here so we can actually see
// what reached the backend when debugging from the logs alone.
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

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
