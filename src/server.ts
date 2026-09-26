import { buildApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

buildApp()
  .then((app) => app.listen({ port, host }))
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
