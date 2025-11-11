import { Queue, QueueEvents } from "bullmq";
import connection from "../config/redis.js";



export const jobQueue = new Queue("job-import", { connection });
export const jobQueueEvents = new QueueEvents("job-import", { connection });

jobQueueEvents.on("completed", ({ jobId }) => {
  console.log(`✅ Job ${jobId} completed`);
});

jobQueueEvents.on("failed", ({ jobId, failedReason }) => {
  console.log(`❌ Job ${jobId} failed: ${failedReason}`);
});
