import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    externalId: { type: String, index: true },
    sourceUrl: String,
    title: String,
    company: String,
    location: String,
    description: String,
    url: String,
    postedAt: Date,
  },
  { timestamps: true }
);

jobSchema.index({ sourceUrl: 1, externalId: 1 }, { unique: true, sparse: true });

export default mongoose.model("Job", jobSchema);
