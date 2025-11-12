# Job Importer and History Tracking

A full-stack application for importing job listings from external feeds (XML sources) and tracking the import history. The system fetches jobs asynchronously using job queues, stores them in a MongoDB database, and provides a modern frontend for viewing and managing the imports.

## 🎯 Features

- **Job Feed Importing**: Automatically fetch and parse job listings from multiple XML feeds
- **Asynchronous Processing**: Uses BullMQ job queue for handling large imports without blocking the API
- **Import History Tracking**: Detailed logs of all import operations with statistics
- **Database Storage**: MongoDB for persistent job and import log storage
- **Real-time Caching**: Redis for efficient caching and queue management
- **Modern Frontend**: Next.js React interface for intuitive job management
- **Scheduled Imports**: Automated cron jobs for periodic feed updates
- **Error Handling**: Comprehensive error tracking with failed job logging

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (Local or Cloud) - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **Redis** (Local or Cloud) - [Redis Official](https://redis.io/)
- **npm** or **yarn** - Package manager (comes with Node.js)

## 🛠️ Tech Stack

### Backend
- **Express.js** - Web framework for REST API
- **MongoDB** with **Mongoose** - Document database and ODM
- **BullMQ** - Job queue for asynchronous processing
- **Redis** - In-memory cache and queue backend
- **axios** - HTTP client for API calls
- **fast-xml-parser** - XML parsing utility
- **node-cron** - Scheduled task execution
- **CORS** - Cross-origin resource sharing support

### Frontend
- **Next.js 16** - React framework for production
- **React 19** - UI library
- **TypeScript** - Static typing
- **Tailwind CSS** - Utility-first CSS framework
- **axios** - HTTP client

## 📁 Project Structure

```
job-importer-and-history-tracking/
├── server/                          # Backend API
│   ├── app.js                      # Express app configuration
│   ├── server.js                   # Server entry point
│   ├── package.json                # Backend dependencies
│   ├── config/
│   │   ├── db.js                  # MongoDB connection
│   │   └── redis.js               # Redis configuration
│   ├── models/
│   │   ├── jobModel.js            # Job schema
│   │   └── importLogModel.js      # Import log schema
│   ├── queues/
│   │   └── jobQueue.js            # BullMQ job queue setup
│   ├── routes/
│   │   └── importRoutes.js        # API routes for imports
│   ├── services/
│   │   └── fetcherServices.js     # XML feed fetching logic
│   ├── utils/
│   │   └── xmlParser.js           # XML parsing utility
│   └── workers/
│       └── jobWorkers.js          # Job queue worker processes
│
└── client/                          # Frontend Application
    ├── src/
    │   └── app/
    │       ├── page.tsx           # Home page
    │       ├── layout.tsx         # App layout
    │       ├── globals.css        # Global styles
    │       └── utils/
    │           └── api.ts         # API client utilities
    ├── public/                    # Static assets
    ├── package.json              # Frontend dependencies
    ├── tsconfig.json             # TypeScript configuration
    ├── next.config.ts            # Next.js configuration
    └── eslint.config.mjs         # Linting configuration
```

## 🚀 Installation & Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/Rishikashyap007/job-importer-and-tracking.git
cd job-importer-and-history-tracking
```

### Step 2: Environment Configuration

Create a `.env` file in the `server` directory with the following variables:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/job-importer
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/job-importer

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
# For cloud Redis (e.g., Redis Cloud):
# REDIS_URL=redis://:password@host:port

# Server Configuration
PORT=5000
NODE_ENV=development

# API Configuration
TIMEOUT=30000
```

### Step 3: Install Backend Dependencies

```bash
cd server
npm install
```

### Step 4: Install Frontend Dependencies

```bash
cd ../client
npm install
```

## 🗄️ Database Setup

### MongoDB Setup

#### Option A: Local MongoDB
```bash
# On Windows (if installed)
mongod

# On macOS (using Homebrew)
brew services start mongodb-community

# On Linux
sudo systemctl start mongod
```

#### Option B: MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string
4. Add it to your `.env` file

### Redis Setup

#### Option A: Local Redis
```bash
# On Windows (using WSL or native Redis)
redis-server

# On macOS (using Homebrew)
brew services start redis

# On Linux
sudo systemctl start redis-server
```

#### Option B: Redis Cloud
1. Go to [Redis Cloud](https://redis.com/try-free/)
2. Create a free tier database
3. Get your connection URL
4. Update `REDIS_URL` in `.env`

## 🎬 Running the Application

### Option 1: Run Both Server and Client Simultaneously

**Terminal 1 - Start the Backend API:**
```bash
cd server
npm run dev
# Server will run at http://localhost:5000
```

**Terminal 2 - Start the Job Worker:**
```bash
cd server
npm run worker
# Worker will process jobs from the queue
```

**Terminal 3 - Start the Frontend:**
```bash
cd client
npm run dev
# Client will run at http://localhost:3000
```

### Option 2: Production Build

**Backend:**
```bash
cd server
npm start
```

**Frontend:**
```bash
cd client
npm run build
npm start
```

## 📡 API Endpoints

### Import Routes

#### Start Import from Feed
```http
POST /api/import/start
Content-Type: application/json

{
  "sourceUrl": "https://jobicy.com/?feed=job_feed"
}
```

**Response:**
```json
{
  "message": "Jobs added to queue",
  "importLogId": "65f123abc456def789"
}
```

#### Get All Import Logs
```http
GET /api/import/logs
```

**Response:**
```json
[
  {
    "_id": "65f123abc456def789",
    "sourceUrl": "https://jobicy.com/?feed=job_feed",
    "totalFetched": 150,
    "newJobs": 145,
    "updatedJobs": 5,
    "failedJobs": 0,
    "totalImported": 150,
    "runAt": "2024-03-15T10:30:00Z",
    "status": "completed"
  }
]
```

#### Get Import Log Details
```http
GET /api/import/logs/:id
```

## 🔄 How It Works

### Job Importing Flow

1. **User Initiates Import** (via Frontend)
   - User clicks "Start Import" button or requests via API
   - System receives the XML feed URL

2. **Fetch XML Feed** (fetcherServices.js)
   - `axios` fetches the XML from the provided URL
   - fast-xml-parser converts XML to JSON objects
   - Creates an import log entry

3. **Queue Processing** (jobQueue.js)
   - Each job is added to BullMQ queue
   - Jobs are stored in Redis for persistence
   - Status is tracked for retry and failure handling

4. **Worker Processing** (jobWorkers.js)
   - Worker processes jobs from the queue
   - Checks if job already exists in database
   - Creates new job or updates existing one
   - Updates import log statistics

5. **Data Storage** (MongoDB)
   - Jobs stored in `jobs` collection
   - Import logs stored in `import_logs` collection
   - Relationships maintained through IDs

6. **Frontend Display** (Next.js)
   - Real-time updates show import progress
   - Historical logs displayed with statistics
   - Error messages shown for failed imports

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│           Frontend (Next.js)                        │
│  - Import interface                                 │
│  - Historical logs display                          │
└────────────────────┬────────────────────────────────┘
                     │ HTTP/REST
┌────────────────────▼────────────────────────────────┐
│           Backend (Express.js)                      │
│  - API Routes                                       │
│  - Service Layer (fetcherServices)                  │
│  - XML Parsing                                      │
└────────────┬────────────────────────────┬───────────┘
             │                            │
      ┌──────▼──────┐            ┌────────▼────────┐
      │ BullMQ      │            │   MongoDB       │
      │ (Job Queue) │            │   (Data Store)  │
      │             │            │                 │
      └──────┬──────┘            └─────────────────┘
             │
      ┌──────▼──────┐
      │  Redis      │
      │  (Cache)    │
      │             │
      └─────────────┘
      
┌───────────────────────────────────────────────────┐
│     Job Workers (jobWorkers.js)                   │
│  - Process queue jobs                             │
│  - Validate & deduplicate                         │
│  - Update database & logs                         │
└───────────────────────────────────────────────────┘
```

## 🔧 Configuration Files

### Server Environment (.env)
```env
MONGODB_URI=mongodb://localhost:27017/job-importer
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=5000
NODE_ENV=development
```

### Client Configuration (src/app/utils/api.ts)
```typescript
// Configure API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
```

## 📊 Scheduled Jobs

Jobs can be scheduled to run automatically using node-cron:

```javascript
// Example: Run import every day at 2 AM
import cron from 'node-cron';

cron.schedule('0 2 * * *', async () => {
  console.log('Running scheduled job import...');
  await importJobsFromFeed('https://jobicy.com/?feed=job_feed');
});
```

## 🐛 Troubleshooting

### Issue: MongoDB Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:**
- Ensure MongoDB is running: `mongod` (local) or check MongoDB Atlas cluster is online
- Verify connection string in `.env` is correct
- Check firewall settings for port 27017

### Issue: Redis Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solution:**
- Start Redis server: `redis-server`
- Verify Redis connection string in `.env`
- For cloud Redis, ensure IP whitelisting is configured

### Issue: Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:**
```bash
# Find process using port 5000
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill the process or change PORT in .env
```

### Issue: CORS Errors
**Solution:**
- Ensure CORS is enabled in `app.js`
- Verify frontend URL is allowed in CORS configuration
- Update `.env` with correct API URL

## 📦 Available Scripts

### Backend
```bash
npm run dev      # Start server with hot-reload (nodemon)
npm start        # Start server in production
npm run worker   # Start job worker process
```

### Frontend
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## 🚢 Deployment

### Deploy Backend (Node.js)

**Options:**
- Heroku, Railway, Render, AWS EC2, DigitalOcean, etc.

**Steps:**
1. Ensure `.env` is configured with production values
2. Set `NODE_ENV=production`
3. Run `npm install` and `npm start`

### Deploy Frontend (Next.js)

**Options:**
- Vercel (recommended), Netlify, AWS S3 + CloudFront, etc.

**Vercel Deployment:**
```bash
npm install -g vercel
vercel
# Follow prompts to deploy
```

## 📝 Development Notes

- **XML Parser**: Uses `fast-xml-parser` for efficient parsing
- **Queue System**: BullMQ provides robust job management with retries
- **Error Handling**: All errors are logged with import log tracking
- **Caching**: Redis caches frequently accessed data
- **Hot Reload**: Use `nodemon` for backend development
- **TypeScript**: Frontend uses TypeScript for type safety

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 👥 Author

**Rishi Kashyap**
- GitHub: [@Rishikashyap007](https://github.com/Rishikashyap007)

## 📞 Support

For issues or questions:
1. Check the Troubleshooting section
2. Open an issue on GitHub
3. Review the code comments for implementation details

## 🔗 Useful Links

- [Node.js Documentation](https://nodejs.org/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Redis Documentation](https://redis.io/documentation)
- [Express.js Guide](https://expressjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Mongoose Documentation](https://mongoosejs.com/)

---

**Last Updated:** November 2024
**Version:** 1.0.0
