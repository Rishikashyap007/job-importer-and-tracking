import { Worker } from "bullmq";
import connection from "../config/redis.js";
import dotenv from "dotenv";
import connectDB from "../config/db.js";
import jobModel from "../models/jobModel.js";
import importLogModel from "../models/importLogModel.js";

dotenv.config();
await connectDB();

const worker = new Worker(
  "job-import",
  async (job) => {
    const { payload, importLogId, sourceUrl } = job.data;

    try {
      const filter = { sourceUrl, externalId: payload.externalId };
      const update = { ...payload };

      const result = await jobModel.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
      });

      await importLogModel.findByIdAndUpdate(importLogId, {
        $inc: { newJobs: 1, totalImported: 1 },
      });

      return result;
    } catch (err) {
      await importLogModel.findByIdAndUpdate(importLogId, {
        $inc: { failedJobs: 1 },
        $push: { failures: { reason: err.message, itemId: payload.externalId } },
      });
      throw err;
    }
  },
  { connection }
);

worker.on("completed", (job) =>
  console.log(`✅ Worker completed job ${job.id}`)
);
worker.on("failed", (job, err) =>
  console.log(`❌ Worker failed job ${job.id}: ${err.message}`)
);
