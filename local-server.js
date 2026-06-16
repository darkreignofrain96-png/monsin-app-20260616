import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import app from "./api/app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.argv.includes("--production") || process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 5173);

if (isProduction) {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);
}

app.listen(port, () => {
  console.log(`Intake app is running at http://127.0.0.1:${port}/intake`);
});
