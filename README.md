# Engineer Travel Distance & Payout System (₹2.50 / KM)

> An end-to-end Field Service Logistics & Travel Mileage Reimbursement platform.

---

## 📁 Clean Project Architecture (`frontend/` & `backend/`)

```
engineer-travel-payout-system/
│
├── 📂 frontend/                     # All Client-Side Apps & UI
│   ├── admin.html                  # Dedicated Admin Operations Portal
│   ├── engineer.html               # Dedicated Field Engineer Web App (Private)
│   ├── index.html                  # Main Entry Web App
│   ├── portal.html                 # 1-Click Central Dual-App Launcher
│   ├── css/                        # Responsive Stylesheets (admin, engineer, style)
│   ├── js/                         # Controllers, Distance, GPS & Map Engines
│   └── sample-data/                # Demo seeds & Excel templates
│
├── 📂 backend/                      # Server-Side REST API & Database
│   ├── server.js                   # Node.js & Express REST API Server
│   ├── package.json                # API dependencies & scripts
│   ├── routes/                     # Modular API endpoints (engineers, jobs, trips, gps)
│   └── database/                   # PostgreSQL / Supabase Schema & seed data
│
├── admin.html                      # Root direct shortcut to Admin Portal
├── engineer.html                   # Root direct shortcut to Engineer App
├── index.html                      # Root direct shortcut
├── portal.html                     # Root direct shortcut to Launcher
└── README.md                       # Project overview documentation
```

---

## 🔄 Travel & Mileage Calculation Flow

$$\text{Route: Main Office (Okhla Hub) } \to \text{ Customer 1 } \to \text{ Customer 2 } \to \text{ Customer 3 } \to \text{ Engineer Home}$$
$$\text{Reimbursement Amount} = 45.0\text{ km} \times ₹2.50 = ₹112.50$$

| Route Leg | From | To | Distance | Rate | Amount |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **Leg 1** | Main Office (Okhla Hub) | Customer 1 (Lajpat Nagar) | 12.0 km | ₹2.50 | ₹30.00 |
| **Leg 2** | Customer 1 (Lajpat Nagar) | Customer 2 (Nehru Place) | 8.0 km | ₹2.50 | ₹20.00 |
| **Leg 3** | Customer 2 (Nehru Place) | Customer 3 (Noida Sec 62) | 15.0 km | ₹2.50 | ₹37.50 |
| **Leg 4** | Customer 3 (Noida Sec 62) | Engineer Home | 10.0 km | ₹2.50 | ₹25.00 |
| **TOTAL** | **Okhla $\to$ Customers $\to$ Home** | | **45.0 km** | | **₹112.50** |

---

## 🚀 Quick Links to Open

1. 👨‍🔧 **Field Engineer Web App**:
   - Direct: [`frontend/engineer.html`](file:///C:/Users/KANHAIYA%20SHARMA/.gemini/antigravity/scratch/engineer-travel-payout-system/frontend/engineer.html)
2. 🏢 **Admin Operations Portal**:
   - Direct: [`frontend/admin.html`](file:///C:/Users/KANHAIYA%20SHARMA/.gemini/antigravity/scratch/engineer-travel-payout-system/frontend/admin.html)
3. 🚀 **Central Launcher Hub**:
   - Direct: [`frontend/portal.html`](file:///C:/Users/KANHAIYA%20SHARMA/.gemini/antigravity/scratch/engineer-travel-payout-system/frontend/portal.html)
4. ⚙️ **Backend Server**:
   - [`backend/server.js`](file:///C:/Users/KANHAIYA%20SHARMA/.gemini/antigravity/scratch/engineer-travel-payout-system/backend/server.js)
