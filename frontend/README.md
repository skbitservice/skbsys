# TravelTrack - Frontend Web Applications

This directory contains the user interface, styling, client-side logic, and map integrations for the **Engineer Travel Distance & Payout System**.

---

## 📁 Frontend Directory Structure

```
frontend/
├── admin.html              # Dedicated Admin Operations Portal (Full Desktop/Tablet)
├── engineer.html           # Dedicated Field Engineer Web App (Mobile PWA)
├── index.html              # Main Entry Point
├── portal.html             # Central App Launcher Hub
├── css/
│   ├── style.css           # Global typography & layout styles
│   ├── admin.css           # Admin dashboard responsive layout
│   └── engineer.css        # Mobile-first PWA & safe-area styles
├── js/
│   ├── config.js           # Constants & rate settings (₹2.50/km)
│   ├── db.js               # Client database & session isolation engine
│   ├── distance.js         # Distance calculation & route breakdown
│   ├── gps.js              # HTML5 GPS tracker & reverse geocoding
│   ├── map.js              # Leaflet & Google Maps tile renderer
│   ├── reports.js          # Excel parser & PDF statement generator
│   ├── admin.js            # Admin portal controller
│   └── engineer.js         # Field engineer app controller
└── sample-data/
    ├── seed-data.json      # Sample engineers, jobs, and customers
    └── jobs_import_sample.csv # Excel bulk import template
```

---

## 🚀 How to Run

Directly open in your web browser:
- 👨‍🔧 **Field Engineer App**: [`engineer.html`](file:///C:/Users/KANHAIYA%20SHARMA/.gemini/antigravity/scratch/engineer-travel-payout-system/frontend/engineer.html)
- 🏢 **Admin Operations Portal**: [`admin.html`](file:///C:/Users/KANHAIYA%20SHARMA/.gemini/antigravity/scratch/engineer-travel-payout-system/frontend/admin.html)
- 🚀 **Central Launcher**: [`portal.html`](file:///C:/Users/KANHAIYA%20SHARMA/.gemini/antigravity/scratch/engineer-travel-payout-system/frontend/portal.html)
