# PrivateOps — Intelligent Personal Knowledge & Secure Workspace

PrivateOps is a production-ready, full-stack personal knowledge management system and secure workspace. It enables users to store notes, documents, certificates, PDFs, images, links, voice notes, and finance records in a structured, hierarchical manner, allowing natural-language and semantic retrieval without external API keys.

## Architecture & Tech Stack

- **Frontend**: React.js, Tailwind CSS, React Router, React Query, Framer Motion, Recharts, Lucide Icons, Vite
- **Backend**: Node.js, Express.js
- **Database**: MySQL (using `mysql2/promise` pool)
- **Caching**: Redis (with automatic in-memory fallback)
- **Authentication**: JWT Access/Refresh tokens + bcrypt hashing
- **File Processing**: Multer upload middleware, `pdf-parse`, `tesseract.js` OCR
- **Local AI Layer**: Local text embeddings using `@xenova/transformers` (running the `all-MiniLM-L6-v2` model in-process)
- **Task Queue**: In-process sequential `BackgroundQueueHelper` (replacing heavy external message brokers)

---

## Features

1. **Intelligent Retrieval System**: Search notes, documents, transcripts, and transaction ledgers. Heuristics parse complex phrases like *"Find travel expenses from April"* or *"Show my internship certificate"*. Cosine similarity matches concepts (e.g., searching *"DBMS концепт"* yields notes containing B-Trees).
2. **Master Vault PIN Lock**: Sensitive documents (Aadhaar, Passport, private notes) are masked in searches and list views. Opening a locked record triggers a secure PIN check overlay, issuing a short-lived Vault JWT token.
3. **Onboarding focus prompt**: A greeting widget on login prompts the user for their workspace focus today (Education, Career, Finance, Personal) and organizes folders.
4. **Hierarchical Categorization**: Categories support subfolder recursion.
5. **Personal Ledger & Receipt Link**: Record transactions, view expense breakdown pie charts and net savings rate area charts via Recharts, and link transactions directly to vault upload receipts.
6. **Robust Caching**: Redis caches dashboard metrics, global searches, and timeline charts.

---

## Folder Structure

```
privateops/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── src/
│   │   ├── config/          # MySQL pool, Redis client configurations
│   │   ├── middleware/      # JWT validation, Vault PIN lock check
│   │   ├── routes/          # Express routing files
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Embedding vector generator, Tesseract OCR
│   │   ├── utils/           # Background queues, activity logs
│   │   ├── database/        # MySQL Schema DDL tables setup
│   │   └── app.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/      # Sidebar, LockModal keypads
    │   ├── context/         # AuthContext, VaultContext timers
    │   ├── pages/           # Pages (Dashboard, Vault folders, Ledger, search)
    │   ├── utils/           # Axios instance
    │   └── App.jsx
    └── package.json
```

---

## Running Locally

### Prerequisites
- Node.js (v18+)
- MySQL server running locally
- Redis server running locally (optional; falls back to local memory if offline)

### 1. Database Setup
Ensure MySQL is running, then edit the backend environment variables if needed.
On server startup, the database `privateops` and all required tables are automatically created if they do not exist.

### 2. Startup Backend
1. Navigate to `backend/`
2. Create `.env` file (see sample below)
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

**Backend `.env` sample:**
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=privateops
DB_PORT=3306
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=super_secret_private_ops_jwt_key
JWT_REFRESH_SECRET=super_secret_private_ops_refresh_jwt_key
```

### 3. Startup Frontend
1. Navigate to `frontend/`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run development build:
   ```bash
   npm run dev
   ```
4. Access app at `http://localhost:3000` (API endpoints are proxied via Vite config to port 5000).

---

## Running with Docker Compose

To orchestrate MySQL, Redis, Backend, and Frontend containers simultaneously:
1. In the project root, run:
   ```bash
   docker-compose up --build
   ```
2. Once container builds complete, open the application in your browser:
   - **Frontend application**: `http://localhost:3000`
   - **Backend API Server**: `http://localhost:5000`
