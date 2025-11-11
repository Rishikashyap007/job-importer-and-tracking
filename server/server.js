import dotenv from "dotenv";
import app from "./app.js";
import { importJobsFromFeed } from "./services/fetcherServices.js";
import cron from "node-cron";

dotenv.config();

const PORT = process.env.PORT || 5000;

const FEEDS = [
//   "https://jobicy.com/?feed=job_feed",
//   "https://jobicy.com/?feed=job_feed&job_categories=design-multimedia",
//   "https://jobicy.com/?feed=job_feed&job_categories=data-science",
//   "https://jobicy.com/?feed=job_feed&job_categories=copywriting",
//   "https://jobicy.com/?feed=job_feed&job_categories=business",
//   "https://jobicy.com/?feed=job_feed&job_categories=management",
//   "https://www.higheredjobs.com/rss/articleFeed.cfm",
"https://jobicy.com/?feed=job_feed",
"https://jobicy.com/?feed=job_feed&job_categories=smm&job_types=full-time",
"https://jobicy.com/?feed=job_feed&job_categories=seller&job_types=full-time&search_region=france",
"https://jobicy.com/?feed=job_feed&job_categories=design-multimedia",
"https://jobicy.com/?feed=job_feed&job_categories=data-science",
"https://jobicy.com/?feed=job_feed&job_categories=copywriting",
"https://jobicy.com/?feed=job_feed&job_categories=business",
"https://jobicy.com/?feed=job_feed&job_categories=management",
"https://www.higheredjobs.com/rss/articleFeed.cfm"
];

// ⏰ Schedule a cron job to run every hour
cron.schedule("0 * * * *", async () => {
  console.log("⏰ [CRON] Running automatic job import...");
  for (const feed of FEEDS) {
    try {
      await importJobsFromFeed(feed);
    } catch (err) {
      console.error(`❌ [CRON] Failed for ${feed}: ${err.message}`);
    }
  }
});

// cron.schedule("* * * * *", async () => {
//   console.log("⏰ Running every minute...");
// });

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
