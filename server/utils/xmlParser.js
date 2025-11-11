import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";

const parser = new XMLParser({ ignoreAttributes: false });

function generateId(input) {
  return crypto.createHash("md5").update(input).digest("hex");
}

export function parseXMLToJobs(xmlString) {
  const parsed = parser.parse(xmlString);
  const items = parsed?.rss?.channel?.item || [];
  if (!Array.isArray(items)) return [];

  return items.map((item) => ({
    title: item.title || "",
    company: item["dc:creator"] || item.creator || "Unknown",
    description: item["content:encoded"] || item.description || "",
    location: item.location || "Remote",
    // url: item.link || "",
    url: typeof item.link === "object" ? item.link["#text"] : item.link || "",
    // externalId: item.guid || generateId(item.link || item.title),
    externalId:
      typeof item.guid === "object"
        ? item.guid["#text"]
        : item.guid || generateId(item.link || item.title),

    postedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
    raw: item,
  }));
}
