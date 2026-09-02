# TravelTrack - Backend REST API Server (₹2.50 / KM)

This directory contains the backend server, API routes, and database schemas for the **Engineer Travel Distance & Payout System**.

---

## 📁 Directory Structure

```
backend/
├── server.js               # Main Node.js & Express REST API Server
├── package.json            # Dependencies and npm scripts
├── routes/                 # Modular API Route Handlers
│   ├── engineers.js        # /api/engineers endpoints
│   ├── jobs.js             # /api/jobs endpoints
│   ├── trips.js            # /api/trips & reimbursement statements
│   └── gps.js              # /api/gps live fleet tracking
└── database/
    ├── schema.sql          # PostgreSQL / Supabase SQL Schema
    └── seed-data.json      # Initial mock seed database
```

---

## 🚀 How to Run the Backend Server

1. Open terminal inside the `backend` folder:
   ```bash
   cd backend
   npm install
   npm start
   ```
2. The server will start at `http://localhost:3000`.
3. It automatically serves the frontend applications:
   - 👨‍🔧 **Field Engineer App**: `http://localhost:3000/engineer.html`
   - 🏢 **Admin Operations Portal**: `http://localhost:3000/admin.html`

---

## 📡 Key REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service status, active rate (₹2.50/km) |
| `GET` | `/api/engineers` | Get list of all field engineers |
| `POST` | `/api/engineers` | Register new engineer with home GPS |
| `GET` | `/api/jobs` | Get assigned service visits by date & engineer |
| `POST` | `/api/jobs` | Assign new customer job |
| `POST` | `/api/calculate-journey` | Calculate distance & payout for full route |
| `POST` | `/api/gps/ping` | Ingest live phone GPS coordinates |
| `GET` | `/api/gps/live` | Live fleet positions for Admin Radar |
