import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import importRoutes from "./routes/importRoutes.js"

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/import", importRoutes);

// Base route
app.get("/", (req, res) => {
  res.send("🚀 Job Importer API is running...");
});

export default app;
