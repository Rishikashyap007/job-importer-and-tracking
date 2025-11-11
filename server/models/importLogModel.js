import mongoose from "mongoose";

const importLogSchema = new mongoose.Schema({
  sourceUrl: String,
  runAt: { type: Date, default: Date.now },
  totalFetched: Number,
  totalImported: Number,
  newJobs: Number,
  updatedJobs: Number,
  failedJobs: Number,
  failures: [
    {
      itemId: { type: String, default: "" },
      reason: String,
      payload: mongoose.Schema.Types.Mixed, // 👈 add this to store any extra data safely
    },
  ],
});

export default mongoose.model("ImportLog", importLogSchema);
