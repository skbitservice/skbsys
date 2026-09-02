# 🚀 Deployment Guide: Engineer Travel Distance & Payout System

This project is 100% production-ready and configured for instant deployment across multiple cloud platforms.

---

## ⚡ Method 1: Deploy on Vercel (Recommended - 1 Click)

1. Push this folder to a GitHub Repository.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Vercel will automatically detect `vercel.json` and build the project.
5. Click **"Deploy"** &mdash; your live app will be ready in under 1 minute!

> Or deploy via CLI:
```bash
npm install -g vercel
vercel
```

---

## ⚡ Method 2: Deploy on Render.com (Free Node.js Fullstack)

1. Push your code to GitHub.
2. Go to [render.com](https://render.com) and click **"New Web Service"**.
3. Select your GitHub repository.
4. Settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **"Create Web Service"**.

---

## ⚡ Method 3: Deploy on Netlify (Static Frontend)

1. Go to [netlify.com](https://netlify.com).
2. Drag and drop the `frontend/` folder into the Netlify dashboard, or connect your GitHub repository.
3. Publish directory: `frontend`.

---

## ⚡ Method 4: Run Locally & Test on Mobile Phone via WiFi / Ngrok

### A. Run on Localhost:
```bash
npm install
npm start
```
- Open in browser: `http://localhost:3000`

### B. Open on Mobile Phone via WiFi:
1. Ensure your laptop and mobile phone are on the same WiFi.
2. Find your laptop's IP address (e.g. `192.168.1.15`).
3. Open `http://192.168.1.15:3000/engineer.html` on your mobile phone browser.

### C. Open Globally on Mobile via LocalTunnel:
```bash
npx localtunnel --port 3000
```
This gives you a public HTTPS URL (e.g. `https://traveltrack-demo.loca.lt`) to open on any smartphone anywhere in the world!

---

## 🔑 Default Login Credentials:
- **🏢 Admin Portal**: ID `admin` / Password `admin123`
- **👨‍🔧 Field Engineer App**: ID `rahul9876` / Password `1234`
