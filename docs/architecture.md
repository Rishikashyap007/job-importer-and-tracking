# System Architecture & Design Decisions

## 📐 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                              │
│                    (Next.js React App)                          │
│  - User Interface for job browsing                              │
│  - Import history dashboard                                     │
│  - Import trigger endpoints                                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                      HTTP/REST API
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                       API LAYER                                 │
│                  (Express.js Server)                            │
│  - REST Endpoints                                               │
│  - Request validation & routing                                 │
│  - CORS handling                                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐         ┌─────▼──────┐      ┌────▼─────┐
   │ Service │         │  Queue     │      │ Database │
   │ Layer   │         │  (BullMQ)  │      │ Access   │
   └────┬────┘         └─────┬──────┘      └────┬─────┘
        │                    │                   │
   ┌────▼──────────────────┐ │          ┌────────▼───────┐
   │ XML Fetching          │ │          │  Mongoose ORM  │
   │ XML Parsing           │ │          │  (Models)      │
   │ Job Deduplication     │ │          └────────┬───────┘
   └───────────────────────┘ │                   │
                             │          ┌────────▼───────┐
                        ┌────▼──────┐   │   MongoDB      │
                        │  Redis    │   │   (Data)       │
                        │  (Queue & │   └────────────────┘
                        │   Cache)  │
                        └───────────┘
        
┌──────────────────────────────────────────────────────────────┐
│                      WORKER LAYER                            │
│              (BullMQ Job Processors)                         │
│  - Process enqueued jobs                                    │
│  - Upsert jobs into MongoDB                                 │
│  - Update import logs with results                          │
│  - Handle job failures & retries                            │
└──────────────────────────────────────────────────────────────┘
```

## 🏗️ System Components

### 1. **Express API Server** (`server/app.js` & `server/server.js`)

**Purpose**: Acts as the main HTTP interface for the application.

**Responsibilities**:
- Accept incoming requests for job imports
- Serve API endpoints for fetching import logs
- Handle CORS for frontend communication
- Parse JSON request bodies
- Route requests to appropriate handlers

**Key Configurations**:
```javascript
- CORS enabled for frontend integration
- JSON middleware for request parsing
- Port: 5000 (configurable via .env)
```

**Design Decision**: 
- ✅ Used Express.js for simplicity and popularity
- ✅ Separate concerns: app setup vs. server startup
- ✅ Middleware pattern allows easy extensibility

---

### 2. **Service Layer** (`server/services/fetcherServices.js`)

**Purpose**: Business logic for fetching and queueing jobs from external feeds.

**Responsibilities**:
- Fetch XML feeds using HTTP
- Parse XML using fast-xml-parser
- Create import log records
- Add parsed jobs to job queue
- Handle errors with logging

**Key Flow**:
```javascript
fetchXML → parseXML → createImportLog → addJobsToQueue → return importLogId
```

**Design Decisions**:
- ✅ **Separated from routes**: Keeps business logic reusable and testable
- ✅ **Asynchronous design**: Allows other imports while processing
- ✅ **Error handling**: Import logs capture failure details for debugging

---

### 3. **Job Queue System** (`server/queues/jobQueue.js`)

**Purpose**: Manages asynchronous job processing using BullMQ.

**Why BullMQ?**
- Reliable job processing with persistence (stored in Redis)
- Built-in retry mechanisms for failed jobs
- Event-driven architecture for monitoring
- Supports multiple workers and horizontal scaling
- Better than simple async/await for critical operations

**Key Features**:
```javascript
// Queue setup
const jobQueue = new Queue("job-import", { connection });
const jobQueueEvents = new QueueEvents("job-import", { connection });

// Event listeners for monitoring
jobQueueEvents.on("completed", handleCompletion);
jobQueueEvents.on("failed", handleFailure);
```

**Design Decisions**:
- ✅ **Queue name**: "job-import" for clarity
- ✅ **Event handling**: Enables logging and monitoring without blocking
- ✅ **Redis persistence**: Jobs survive application crashes
- ✅ **Separation from API**: Workers can run in separate processes/servers

---

### 4. **Job Worker** (`server/workers/jobWorkers.js`)

**Purpose**: Processes individual jobs from the queue and updates the database.

**Responsibilities**:
- Dequeue and process jobs
- Upsert jobs into MongoDB (create if new, update if exists)
- Update import log statistics
- Handle job failures
- Retry failed jobs automatically

**Key Process**:
```javascript
// Upsert pattern: Update existing or create new
const result = await jobModel.findOneAndUpdate(
  { sourceUrl, externalId: payload.externalId },  // Find criteria
  { ...payload },                                   // Update data
  { upsert: true, new: true }                      // Options
);
```

**Design Decisions**:
- ✅ **Separate process**: Workers run independently, can be scaled horizontally
- ✅ **Upsert pattern**: Prevents duplicates while allowing updates
- ✅ **Import log tracking**: Every success/failure updates the log
- ✅ **Error capture**: Failures stored with reason and item ID for auditing

---

### 5. **Data Models** (`server/models/`)

#### **Job Model** (`jobModel.js`)
```javascript
{
  externalId: String (indexed),           // Unique ID from feed
  sourceUrl: String,                      // Which feed it came from
  title: String,
  company: String,
  location: String,
  description: String,
  url: String,
  postedAt: Date,
  createdAt: Date (auto),
  updatedAt: Date (auto)
}

// Composite index: (sourceUrl + externalId) unique combination
// Allows same externalId from different sources
```

**Design Decision**:
- ✅ **Composite index**: `{ sourceUrl: 1, externalId: 1, unique: true }`
  - Allows duplicate external IDs from different sources
  - Enables feed-specific deduplication
  - Example: Job "101" can exist from both Jobicy and LinkedIn

#### **Import Log Model** (`importLogModel.js`)
```javascript
{
  sourceUrl: String,                      // Source feed URL
  runAt: Date (auto),                     // When import started
  totalFetched: Number,                   // Items in feed
  totalImported: Number,                  // Successfully saved
  newJobs: Number,                        // Newly created
  updatedJobs: Number,                    // Previously existing, updated
  failedJobs: Number,                     // Processing failed
  failures: [
    {
      itemId: String,                     // Which item failed
      reason: String,                     // Error message
      payload: Mixed                      // Full job data for debugging
    }
  ]
}
```

**Design Decision**:
- ✅ **Detailed tracking**: Enables root cause analysis
- ✅ **Separate from jobs**: Doesn't pollute job collection
- ✅ **Failure details**: Allows admin to retry specific failed items

---

### 6. **XML Parsing** (`server/utils/xmlParser.js`)

**Purpose**: Convert RSS/XML feeds to structured job objects.

**Key Features**:
```javascript
// Handle attribute variations from different feed sources
- Supports multiple author field names (dc:creator, creator)
- Handles both text and object formats for guid and link
- Generates MD5 hash fallback for missing external IDs
- Preserves raw XML for debugging
```

**Design Decisions**:
- ✅ **Flexible parsing**: Different feeds have different schemas
- ✅ **Fallback IDs**: MD5 hash of title+link ensures uniqueness
- ✅ **Raw data preservation**: Original XML stored for debugging
- ✅ **Default values**: "Unknown" company, "Remote" location for missing fields

---

### 7. **Redis Configuration** (`server/config/redis.js`)

**Purpose**: Connection management and configuration for Redis.

**Key Settings**:
```javascript
maxRetriesPerRequest: null   // 👈 CRITICAL: Allows BullMQ queue operations
enableReadyCheck: false      // 👈 Recommended: Improves performance
```

**Why These Settings?**
- `maxRetriesPerRequest: null` allows BullMQ to manage queue operations independently
- Without this, queue operations could timeout waiting for Redis readiness
- `enableReadyCheck: false` skips the INFO command on every request

**Design Decision**:
- ✅ **Proper BullMQ configuration**: Follows official recommendations
- ✅ **Error handling**: Logs connection events for debugging

---

### 8. **MongoDB Configuration** (`server/config/db.js`)

**Purpose**: Database connection management.

**Features**:
- Connection pooling
- Error handling with console logging
- Graceful connection events

---

## 🔄 Data Flow Diagrams

### Import Process (Happy Path)

```
User clicks "Import"
        │
        ▼
POST /api/import/start { sourceUrl }
        │
        ▼
fetcherServices.importJobsFromFeed(sourceUrl)
        │
        ├─▶ axios.get(sourceUrl)  // Fetch XML
        │
        ├─▶ parseXMLToJobs(xml)   // Convert to JSON
        │
        ├─▶ Create ImportLog       // Track this run
        │
        ├─▶ For each job:
        │   └─▶ jobQueue.add("import-job", { payload, sourceUrl, importLogId })
        │
        ▼
Return { importLogId }
        │
        ▼
BullMQ Queue (Redis)
        │
        ▼
Worker processes job
        │
        ├─▶ findOneAndUpdate Job (upsert)
        │
        ├─▶ Update ImportLog statistics
        │
        ▼
Job complete
```

### Error Handling Flow

```
Job Processing Error
        │
        ▼
Worker catch block
        │
        ├─▶ Increment failedJobs counter
        │
        ├─▶ Push to failures array with:
        │   - itemId
        │   - error message
        │   - original payload
        │
        ▼
ImportLog updated
        │
        ▼
User can see failed items in import history
```

---

## 💾 Database Schema Design

### Why MongoDB?

1. **Flexible Schema**: Job fields vary by source
2. **Document Model**: Jobs are naturally stored as documents
3. **Scalability**: Can shard by sourceUrl or externalId
4. **Ease of Use**: Mongoose ORM simplifies queries

### Indexing Strategy

```javascript
// Job collection indexes
1. externalId (ascending)
   - Speed up deduplication checks
   
2. Composite: { sourceUrl, externalId } (unique, sparse)
   - Prevent duplicates within a source
   - Allow same external ID from different sources
   - Sparse allows NULL values for external imports
```

### Why Composite Index?

Without it:
```javascript
// ❌ Problem: Can't have duplicate externalId from different sources
Job { externalId: "123", sourceUrl: "jobicy.com" }
Job { externalId: "123", sourceUrl: "linkedin.com" }  // Rejected!
```

With composite index:
```javascript
// ✅ Solution: The pair (sourceUrl, externalId) must be unique
Job { externalId: "123", sourceUrl: "jobicy.com" }    // OK
Job { externalId: "123", sourceUrl: "linkedin.com" }  // OK - different pair
```

---

## 🔀 Queue Architecture Details

### Why Not Simple Async/Await?

```javascript
// ❌ Problem with async/await in API handler
app.post('/import', async (req, res) => {
  for (const job of jobs) {
    await jobModel.save(job);  // Blocks if slow!
  }
  // If 1000 jobs × 100ms = 100 seconds total!
  res.json({ success: true });
});

// ✅ Solution with BullMQ
app.post('/import', async (req, res) => {
  for (const job of jobs) {
    await jobQueue.add('import-job', job);  // Fast! Just enqueues.
  }
  res.json({ importLogId });  // Returns immediately!
});

// Worker processes in background
worker.process(async (job) => {
  await jobModel.save(job.data);  // Runs separately
});
```

### BullMQ Features Used

| Feature | Purpose |
|---------|---------|
| **Job Persistence** | Jobs survive server restarts (stored in Redis) |
| **Retries** | Failed jobs auto-retry (configurable attempts) |
| **Events** | Monitor job completion/failure without polling |
| **Scalability** | Multiple workers can process simultaneously |
| **Priority** | Can prioritize critical imports |

---

## 🔐 Data Integrity Features

### 1. **Deduplication**

```javascript
// Upsert prevents duplicates
await jobModel.findOneAndUpdate(
  { sourceUrl, externalId: payload.externalId },
  { ...payload },
  { upsert: true, new: true }
);

// Result:
// - First import: Creates new job
// - Second import: Updates existing job
// - No duplicates, only newest version
```

### 2. **Failure Tracking**

```javascript
// Import logs capture every failure
failures: [
  {
    itemId: "job-123",
    reason: "Invalid title format",
    payload: { /* original data */ }
  }
]

// Allows:
// - Root cause analysis
// - Retry logic
// - Feed source validation
```

### 3. **Source Tracking**

```javascript
// Every job knows its source
{ sourceUrl: "https://jobicy.com/?feed=job_feed", ... }

// Enables:
// - Feed-specific analytics
// - Source-level deduplication
// - Feed health monitoring
```

---

## 📊 Performance Considerations

### 1. **Queue Processing Speed**

**Bottleneck**: Database writes
```
Typical Timeline:
- Fetch 100 jobs: 500ms (network)
- Parse XML: 50ms (parsing)
- Queue jobs: 100ms (Redis writes)
- Process jobs: 1-5 seconds (depends on worker count)
  - 1 worker: 100 jobs × 50ms = 5 seconds
  - 5 workers: 100 jobs / 5 = 1 second (parallel)
```

### 2. **Scaling Strategy**

```javascript
// Single instance (dev)
npm run worker  // 1 worker processes jobs

// Multiple instances (production)
PM2 cluster mode or Kubernetes:
  worker-1: processes jobs
  worker-2: processes jobs
  worker-3: processes jobs
// All read from same Redis queue = parallel processing
```

### 3. **Index Impact**

```javascript
// Without indexes
findOneAndUpdate scan: 100,000 jobs → slow

// With indexes
findOneAndUpdate scan: 1-10 jobs → fast
```

---

## 🛡️ Error Handling Strategy

### Levels of Error Handling

```
1. Network Layer (axios)
   └─▶ Catch: Connection errors, timeouts
       Action: Log error, mark import as failed

2. Parsing Layer (XML parser)
   └─▶ Catch: Invalid XML, missing fields
       Action: Use defaults, store raw for debugging

3. Database Layer (Mongoose)
   └─▶ Catch: Validation errors, connection issues
       Action: Increment failedJobs, log failure

4. Queue Layer (BullMQ)
   └─▶ Catch: Job processing errors
       Action: Auto-retry, move to dead-letter queue

5. Worker Layer
   └─▶ Catch: Processing errors
       Action: Log with full context for investigation
```

---

## 📝 Design Patterns Used

### 1. **Service Layer Pattern**
```
Routes → Services → Database Models
```
- Separates API concerns from business logic
- Makes services reusable and testable

### 2. **Worker Pattern**
```
API Queue → Multiple Workers → Database
```
- Decouples request handling from processing
- Enables horizontal scaling

### 3. **Upsert Pattern**
```
Check exists → If yes: update | If no: create
```
- Prevents duplicates
- Allows data refresh

### 4. **Log/Audit Pattern**
```
Every import creates a log record
Each log tracks success/failure details
```
- Enables debugging and compliance
- Allows performance monitoring

### 5. **Composite Index Pattern**
```
Index: (sourceUrl + externalId)
```
- Allows multi-source deduplication
- Improves query performance

---

## 🚀 Deployment Architecture

### Development
```
Single Server
├─ API (Express)
├─ Worker (Node process)
├─ MongoDB (local)
└─ Redis (local)
```

### Production (Recommended)
```
API Server (Scalable)
├─ Multiple Express instances (load balanced)
└─ Separate from workers

Worker Server (Scalable)
├─ Multiple worker processes
├─ Each processes queue jobs
└─ All share same Redis

Data Layer (Managed)
├─ MongoDB Atlas (managed cloud)
└─ Redis Cloud (managed cloud)
```

### Benefits of Separation
- API scales independently of workers
- Workers can process large batches without affecting API responsiveness
- Easy to add workers during high load
- Easy to monitor each component separately

---

## 🔮 Future Architecture Improvements

### 1. **Scheduled Imports**
```javascript
// Add node-cron for automatic imports
cron.schedule('0 * * * *', async () => {
  await importJobsFromFeed(sourceUrl);
});
```

### 2. **Dead Letter Queue**
```javascript
// For jobs that fail after retries
const dlq = new Queue('job-import-dlq');
// Manually review and retry later
```

### 3. **Import Deduplication Across Runs**
```javascript
// Check if job already exists before adding to queue
const exists = await jobModel.findOne({ sourceUrl, externalId });
if (!exists) {
  await jobQueue.add(job);
}
```

### 4. **Feed Health Monitoring**
```javascript
// Track metrics per feed
const feedStats = {
  'jobicy.com': { successRate: 98%, avgItems: 150 },
  'linkedin.com': { successRate: 95%, avgItems: 200 }
};
// Alert if feed becomes unhealthy
```

### 5. **Caching Layer**
```javascript
// Cache popular job searches in Redis
cache.set('jobs:remote:backend', jobs, 3600);
```

---

## 📚 Technology Choice Justification

| Component | Choice | Why? |
|-----------|--------|------|
| **API Framework** | Express.js | Lightweight, popular, easy to extend |
| **Job Queue** | BullMQ | Reliable, persistent, supports scaling |
| **Database** | MongoDB | Flexible schema, easy to scale, document model fits jobs |
| **Cache/Queue Store** | Redis | Fast, in-memory, perfect for queues |
| **Frontend** | Next.js | React with SSR, TypeScript support, Vercel deployment |
| **XML Parser** | fast-xml-parser | Fast, handles attributes, supports attributes |
| **ORM** | Mongoose | Validation, middleware, relationships |

---

## 🎯 Architectural Goals Achieved

✅ **Scalability**: Queue-based architecture supports multiple workers
✅ **Reliability**: Job persistence ensures no data loss
✅ **Observability**: Import logs track every operation
✅ **Maintainability**: Separation of concerns (routes, services, workers)
✅ **Flexibility**: XML parser handles various feed formats
✅ **Performance**: Indexes and async processing optimize speed
✅ **Recoverability**: Error details enable debugging and retry
✅ **Multi-Source**: Composite indexes support multiple feed sources

---

## 📖 Related Documentation

- See [../README.md](../README.md) for setup and usage
- See [./API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for endpoint details
- See [./DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for detailed schema info

---

**Last Updated**: November 2024
**Architecture Version**: 1.0.0
**Status**: Production Ready
