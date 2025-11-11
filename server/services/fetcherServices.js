import axios from "axios";
import { parseXMLToJobs } from "../utils/xmlParser.js";
import importLogModel from "../models/importLogModel.js";
import { jobQueue } from "../queues/jobQueue.js";




export async function importJobsFromFeed(sourceUrl) {
  console.log(`🌐 Fetching from ${sourceUrl}`);

  try {
    const response = await axios.get(sourceUrl);
    const xml = response.data;

    const jobs = parseXMLToJobs(xml);
    console.log(`📦 Parsed ${jobs.length} jobs from ${sourceUrl}`);

    // Create import log
    const importLog = await importLogModel.create({
      sourceUrl,
      totalFetched: jobs.length,
      newJobs: 0,
      updatedJobs: 0,
      failedJobs: 0,
      totalImported: 0,
    });

    // Add each job to queue
    for (const jobData of jobs) {
      await jobQueue.add("import-job", {
        sourceUrl,
        importLogId: importLog._id,
        payload: jobData,
      });
    }

    return importLog;
  } catch (err) {
    console.error(`❌ Error fetching ${sourceUrl}:`, err.message);
    throw err;
  }
}
