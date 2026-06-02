# 🍽️ Zaiqa Mahal - Premium POS & Restaurant Management System

A high-performance, offline-capable, and beautifully animated Point of Sale (POS) and Restaurant Operations suite designed specifically for **Zaiqa Mahal**.

---

## ✨ Features

### 1. 🖥️ Interactive Front-of-House POS
*   **Table Management & Selector:** Live table tracking, area classification (Male/Female/Family), and seat capacity indicators.
*   **Dynamic Cart & Billing:** Instant subtotal, tax calculations, dynamic remarks, and cashier management.
*   **Premium Print Receipts:** Instant high-fidelity thermal printable receipt format tailored for POS printers.

### 2. 🍳 Kitchen Display System (KDS)
*   **Real-time KDS Board:** Active ticket tracking by order status (`pending`, `preparing`, `ready`).
*   **Auto-Sync & Polling:** Reactive updates when orders are ready or modified.
*   **Completed History Log:** Immediate checkout review of historic tickets with direct cascade deletes.

### 3. 📦 Kitchen Stock (Raw Materials)
*   **Auto-Deduct Recipe System (BOM):** Deducts raw materials (e.g. Ghee, Chicken, Eggs) automatically when menu items are ordered.
*   **Low Stock Alerts:** Visually flags items falling below safe thresholds.
*   **Premium Inventory logs:** Historical tracking for every stock adjustment (IN/OUT).
*   **Sleek Custom Modal Confirmations:** Modern dialog overrides replacing native browser alerts.

### 4. 🚚 Supplier Network & Ledger
*   **Full procurement ledger:** Tracks raw material purchases, custom payment logs, and outstanding payable balances.
*   **Inventory Sync:** Automatically increments raw material stock during purchases.

### 5. 💳 Executive Khata Hub & Expenses
*   **Credit/Debt Logs:** Easy tracking of client & company khata balances.
*   **Ledger History:** Comprehensive debit/credit transaction entries.
*   **Printable Invoice/Statements:** Generate clean statement slips to share directly with clients.

---

## 🛠️ Technology Stack

*   **Frontend:** React (Vite), Lucide Icons, Custom Premium Glassmorphic Vanilla CSS.
*   **Backend:** Node.js, Express.js.
*   **Database:** SQLite3 with **WAL (Write-Ahead Logging)** mode enabled and custom exponential retry handlers for concurrent read/write locks (`SQLITE_BUSY`).

---

## 🚀 Setup & Installation

### Prerequisite
Ensure you have [Node.js](https://nodejs.org/) installed.

### 1. Run the Backend Server
```bash
cd server
npm install
node index.js
```
The server will start at `http://localhost:5005` and establish a connection with `pos.db`.

### 2. Run the React Web App
```bash
cd web
npm install
npm run dev
```
The client app will launch locally (usually at `http://localhost:5173`).

---

## ⚠️ Database Note
This system uses **SQLite** for robust offline stability. 
> [!IMPORTANT]
> **Always close "DB Browser for SQLite"** during active web app operations to prevent write file locks (`database is locked` error).

---

## 📝 License
Proprietary software built and maintained by **Asper Infotech** 🧡 for **Zaiqa Mahal**. All Rights Reserved.
