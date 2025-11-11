// import express from "express";
// import { jobQueue } from "../queues/jobQueue.js";
// import importLogModel from "../models/importLogModel.js";

// const router = express.Router();

// // Trigger import (for now: just adds dummy jobs)
// router.post("/start", async (req, res) => {
//   const sourceUrl = "https://jobicy.com/?feed=job_feed";
//   const importLog = await importLogModel.create({
//     sourceUrl,
//     totalFetched: 2,
//     newJobs: 0,
//     updatedJobs: 0,
//     failedJobs: 0,
//     totalImported: 0,
//   });

//   // Just simulate two jobs for now
//   const jobs = [
//     { externalId: "101", title: "Backend Developer", company: "ABC" },
//     { externalId: "102", title: "Frontend Developer", company: "XYZ" },
//   ];

//   for (const payload of jobs) {
//     await jobQueue.add("import-job", { payload, sourceUrl, importLogId: importLog._id });
//   }

//   res.json({ message: "Jobs added to queue", importLogId: importLog._id });
// });

// // Get all import logs
// router.get("/logs", async (req, res) => {
//   const logs = await importLogModel.find().sort({ runAt: -1 });
//   res.json(logs);
// });

// export default router;


import express from "express";
import { importJobsFromFeed } from "../services/fetcherServices.js";
import importLogModel from "../models/importLogModel.js";


const router = express.Router();

const FEEDS = [
  "https://jobicy.com/?feed=job_feed",
  "https://jobicy.com/?feed=job_feed&job_categories=design-multimedia",
  "https://jobicy.com/?feed=job_feed&job_categories=data-science",
  "https://jobicy.com/?feed=job_feed&job_categories=copywriting",
  "https://jobicy.com/?feed=job_feed&job_categories=business",
  "https://jobicy.com/?feed=job_feed&job_categories=management",
  "https://www.higheredjobs.com/rss/articleFeed.cfm",
];

// Trigger import for all feeds
router.post("/start", async (req, res) => {
  try {
    const results = [];
    for (const feed of FEEDS) {
      const log = await importJobsFromFeed(feed);
      results.push(log);
    }
    res.json({ message: "Feeds imported successfully", logs: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get import logs
router.get("/logs", async (req, res) => {
  const logs = await importLogModel.find().sort({ runAt: -1 });
  res.json(logs);
});

export default router;

