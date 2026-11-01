# 🍽️ CanteenQueue
### AI-Powered Smart Queue & Kitchen Optimization Platform for College Canteens

[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://mongodb.com/atlas)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black)](https://socket.io)

---

## 🚀 Project Overview

CanteenQueue eliminates cafeteria chaos by combining real-time queue tracking, AI-driven wait-time prediction, smart kitchen load balancing, and QR-based pickup verification — all in one futuristic, mobile-first platform.

---

## ✨ Core Features

| Feature | Description |
|---|---|
| **AI Wait-Time Prediction** | `ETA = BasePrepTime + (PendingOrders × 0.3) + KitchenLoadMultiplier` |
| **Smart Kitchen Load Balancer** | Prioritises urgent orders, surfaces batch cooking opportunities |
| **Batch Cooking Suggestions** | Detects repeated items across queue, recommends batch prep |
| **QR Pickup Verification** | UUID-based QR generated on order; kitchen scans to confirm pickup |
| **Inventory-Aware Ordering** | Real-time stock deduction, auto-disables sold-out items |
| **Smart Recommendation Engine** | Blends user history, trending, fast-prep, and low-ETA scoring |

---

## 🗂️ Folder Structure

```
canteenqueue/
├── backend/
│   ├── controllers/
│   │   ├── authController.js       # Register, login, JWT
│   │   ├── menuController.js       # CRUD menu items
│   │   └── orderController.js      # Create/track/verify orders + ETA engine
│   ├── middleware/
│   │   └── auth.js                 # JWT protect + role guard
│   ├── models/
│   │   ├── User.js                 # Student / Kitchen / Admin
│   │   ├── Menu.js                 # Menu item with stock virtuals
│   │   ├── Order.js                # Order with QR token & status history
│   │   └── InventoryLog.js         # Stock change audit trail
│   ├── routes/
│   │   ├── auth.js                 # POST /api/auth/register|login
│   │   ├── menu.js                 # GET/POST/PATCH /api/menu
│   │   ├── orders.js               # Full order lifecycle
│   │   ├── inventory.js            # PATCH /api/inventory/update
│   │   ├── recommendations.js      # GET /api/recommendations[/batch]
│   │   └── admin.js                # GET /api/admin/analytics
│   ├── services/
│   │   └── recommendationService.js  # Scoring engine + batch engine
│   ├── socket/
│   │   └── socketHandlers.js       # Real-time event hub
│   ├── server.js                   # Express + Socket.IO entry
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── common/
    │   │       ├── Navbar.tsx       # Sticky glass navbar, role-aware
    │   │       ├── MenuCard.tsx     # Item card with qty controls
    │   │       ├── StatusBadge.tsx  # Colour-coded order status
    │   │       ├── StatCard.tsx     # Reusable metric card
    │   │       └── LoadingSpinner.tsx
    │   ├── context/
    │   │   ├── AuthContext.tsx      # Global auth state + JWT refresh
    │   │   └── CartContext.tsx      # Cart reducer
    │   ├── pages/
    │   │   ├── LoginPage.tsx
    │   │   ├── RegisterPage.tsx
    │   │   ├── student/
    │   │   │   ├── StudentHome.tsx  # Hero banner, recommendations, quick menu
    │   │   │   ├── MenuPage.tsx     # Full menu with search/filter/sort
    │   │   │   ├── QueuePage.tsx    # Live ETA + formula breakdown + chart
    │   │   │   ├── CartPage.tsx     # Cart with ETA summary + order placement
    │   │   │   ├── TrackPage.tsx    # Step tracker + QR code display
    │   │   │   └── OrderHistoryPage.tsx
    │   │   ├── kitchen/
    │   │   │   └── KitchenDashboard.tsx  # Live queue, inventory, QR verify
    │   │   └── admin/
    │   │       └── AdminDashboard.tsx    # Revenue, peaks, top items
    │   ├── types/index.ts           # Shared TypeScript interfaces
    │   ├── utils/
    │   │   ├── api.ts               # Axios instance + interceptors
    │   │   ├── socket.ts            # Socket.IO singleton
    │   │   └── eta.ts               # Client-side ETA calculator
    │   ├── App.tsx                  # Router + protected routes
    │   ├── main.tsx
    │   └── index.css
    ├── tailwind.config.js
    ├── vite.config.ts
    └── package.json
```

---

## 🛠️ Tech Stack

**Frontend:** React 18 · TypeScript · Tailwind CSS · Framer Motion · Socket.IO Client · React Router v6 · Axios · react-qr-code

**Backend:** Node.js · Express.js · Socket.IO · JWT · bcryptjs · Mongoose

**Database:** MongoDB Atlas

**Deployment:** Vercel (frontend) · Render (backend)

---

## ⚡ Quick Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)

### 1 — Clone & Install

```bash
git clone https://github.com/your-username/canteenqueue.git
cd canteenqueue

# Backend
cd backend
npm install
cp .env.example .env
# → fill in MONGODB_URI, JWT_SECRET

# Frontend
cd ../frontend
npm install
cp .env.example .env
# → fill in VITE_API_URL, VITE_SOCKET_URL
```

### 2 — MongoDB Atlas Setup

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user
3. Whitelist your IP (or 0.0.0.0/0 for dev)
4. Copy the connection string into `backend/.env`

### 3 — Seed Demo Data (optional)

```bash
cd backend
node scripts/seed.js     # seeds menu items + demo users
```

### 4 — Run Locally

```bash
# Terminal 1 — backend
cd backend
npm run dev          # starts on :5000

# Terminal 2 — frontend
cd frontend
npm run dev          # starts on :5173
```

Open **http://localhost:5173** 🎉

### 5 — Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Student | student@demo.com | demo1234 |
| Kitchen | kitchen@demo.com | demo1234 |
| Admin | admin@demo.com | demo1234 |

---

## 🌐 API Reference

### Auth
| Method | Endpoint | Body | Auth |
|--------|----------|------|------|
| POST | `/api/auth/register` | name, email, password, role | — |
| POST | `/api/auth/login` | email, password | — |
| GET | `/api/auth/me` | — | JWT |

### Menu
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/menu` | List all items (filterable) | — |
| POST | `/api/menu` | Add item | Admin/Kitchen |
| PATCH | `/api/menu/:id` | Update item | Admin/Kitchen |
| DELETE | `/api/menu/:id` | Delete item | Admin |

### Orders
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/orders/queue-status` | Live queue length + ETA | — |
| POST | `/api/orders` | Place order | Student |
| GET | `/api/orders/my` | My order history | Student |
| GET | `/api/orders/kitchen` | Active kitchen queue | Kitchen/Admin |
| PATCH | `/api/orders/:id/status` | Update order status | Kitchen/Admin |
| POST | `/api/orders/verify-qr` | Verify QR pickup | Kitchen/Admin |

### Other
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/recommendations` | Smart recommendations | Student |
| GET | `/api/recommendations/batch` | Batch cooking suggestions | Kitchen/Admin |
| PATCH | `/api/inventory/update` | Update stock | Kitchen/Admin |
| GET | `/api/admin/analytics` | Full analytics | Admin |

---

## 🔌 Socket.IO Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `joinOrder` | Client→Server | orderId |
| `joinKitchen` | Client→Server | — |
| `queueUpdate` | Server→All | { queueLength, eta } |
| `newOrder` | Server→Kitchen | { order, queueLength } |
| `myOrderUpdate` | Server→Student | { status, orderId } |
| `orderStatusUpdate` | Server→All | { orderId, status } |
| `inventoryUpdate` | Server→All | { menuItemId, currentStock, isAvailable } |
| `menuUpdate` | Server→All | { type, item } |

---

## 🚀 Deployment

### Backend → Render

1. Push backend to GitHub
2. New Web Service on [render.com](https://render.com)
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add environment variables from `.env`

### Frontend → Vercel

1. Push frontend to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Framework preset: **Vite**
4. Add `VITE_API_URL` and `VITE_SOCKET_URL` in Vercel env settings
5. Deploy!

---

## 🧠 AI ETA Engine

```
ETA = BasePrepTime + (PendingOrders × DelayFactor) + KitchenLoadMultiplier

Where:
  BasePrepTime         = max prep time of items in order (from menu)
  PendingOrders        = confirmed + preparing orders in DB
  DelayFactor          = 0.3 min per pending order
  KitchenLoadMultiplier = 1.0 (low) | 1.5 (medium) | 2.5 (high)
```

---

---

## 💳 Payment System V3 (Razorpay Integration)

CanteenQueue V2 features **Payment System V3**, an automated payment-gateway architecture powered by **Razorpay**. Manual UTR entry is disabled, ensuring that orders can **NEVER** reach the Kitchen queue without server-verified payment.

### 🔒 Security Architecture & Rules
1. **Authoritative Backend Pricing**: Cart totals are calculated strictly on the backend using menu item prices in MongoDB. Frontend-provided price overrides are rejected.
2. **Server-Side HMAC-SHA256 Signature Verification**: Verification is performed on the server using cryptographic HMAC SHA256 hashing.
3. **Exact Amount Security Check**: Backend verifies that the amount captured by Razorpay matches the exact order total down to the paise.
4. **Secret Key Isolation**: Gateway secrets (`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) remain strictly server-side and are **NEVER** exposed to the React frontend or in API responses.
5. **Idempotency & Duplicate Protection**: Duplicate webhooks or double-click verifications trigger no duplicate inventory deductions or double Kitchen notifications.

---

### 🔑 Razorpay Setup & Environment Configuration

#### 1. Obtaining Razorpay API Keys (Test Mode)
1. Sign up / log in to [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Switch to **Test Mode** using the toggle on the top right.
3. Navigate to **Account & Settings** → **API Keys** → **Generate Key**.
4. Copy the generated **Key ID** (`rzp_test_...`) and **Key Secret**.

#### 2. Backend Environment Variables
Add the following to `backend/.env`:
```env
# Server-Side Only Secrets (Never expose to frontend!)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

#### 3. Webhook Setup & Local Testing
1. In Razorpay Dashboard, go to **Settings** → **Webhooks** → **Add New Webhook**.
2. Set Webhook URL to: `https://<your-domain>/api/payment/webhook`
   - For local development, use [ngrok](https://ngrok.com): `ngrok http 5000` -> `https://<ngrok-id>.ngrok-free.app/api/payment/webhook`
3. Active Events: `payment.captured`, `order.paid`, `payment.failed`.
4. Copy Secret into `RAZORPAY_WEBHOOK_SECRET`.

---

### 🔄 Payment Flow Sequence
```
Student Cart → Pay Click → POST /api/payment/create-order
       ↓
Backend calculates exact total from DB → Creates Razorpay Order
       ↓
Razorpay Checkout Modal opens (UPI / Card / NetBanking)
       ↓
Student completes payment → Receives razorpay_payment_id & signature
       ↓
Frontend submits to POST /api/payment/verify
       ↓
Backend verifies HMAC-SHA256 signature + exact amount check
       ↓
Payment Verified → Order Status: "confirmed" → Stock Deducted
       ↓
Socket.IO emits `newOrder` → Kitchen Dashboard receives order
```

---

### 🚀 Switching from Test Mode to Production Safely
1. Complete KYC verification in [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Toggle dashboard from **Test Mode** to **Live Mode**.
3. Generate **Live API Keys** (`rzp_live_...`) and Live Webhook Secret.
4. Update `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in production server environment settings (Render/Heroku/AWS).
5. Ensure HTTPS is enabled on your production backend API.

Official Documentation: [Razorpay Standard Web Checkout Docs](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/)

---

## 📝 Environment Variables

### Backend `.env`
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/canteenqueue
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🏆 Hackathon Highlights

- **Zero config AI** — ETA prediction works out of the box, no external ML service
- **Real-time first** — every state change propagates via Socket.IO instantly
- **Role-based UX** — single codebase, three completely different experiences
- **Inventory-aware** — stock deducted atomically on order placement
- **QR verification loop** — student generates, kitchen scans, order closes

---

## 📄 License
MIT — free to use, fork, and build on.
