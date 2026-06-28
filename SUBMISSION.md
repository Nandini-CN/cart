# Submission Overview

This document summarizes how the Shopping Cart Engine codebase meets all requirements in the Submission Guidelines.

---

## 1. Organized Codebase (Node.js/Express Patterns)
* **Separation of Concerns (Layered Architecture):**
  * **Routes:** Express routers map API endpoints and bind validation & auth middleware chains.
  * **Middleware:** Handles rate limiting, request logging, input schema validation, and session authorization.
  * **Controller Layer:** Clean orchestrators that process incoming HTTP requests and delegate logic to services.
  * **Service Layer:** Houses pure business rules (e.g., discount computations, subtotal logic) independent of Express request/response cycles.
  * **Models:** Define standard MongoDB structures, defaults, and automated TTL indexes using Mongoose ODM.

---

## 2. Database Configuration & Environment Variables
* **Security & Environment Isolation:**
  * Uses a `.env` file loaded via the `dotenv` package to keep database credentials secure.
  * System environment variables configured:
    * `PORT`: Service port (defaults to `5000`).
    * `MONGO_URI`: MongoDB connection string.
    * `NODE_ENV`: Runs in `development` or `production` mode to optimize performance/logs.
  * Database logic connects cleanly on startup and handles connection error events gracefully.

---

## 3. README.md Specifications & Structure
* **API Specifications:**
  * **Auth & Onboarding:** `POST /api/users/register` (registers/logins users and issues session tokens) and `GET /api/users/me` (verifies session).
  * **Cart Actions:** `GET /api/cart`, `POST /api/cart/items` (add/increment item), `PATCH /api/cart/items/:productId` (set quantity), `DELETE /api/cart/items/:productId` (remove item), and `DELETE /api/cart` (clear cart).
  * **Checkout:** `GET /api/checkout/summary` (provides subtotal, active promo tiers, and final total).
* **Session Strategy & Promotion Formulas:**
  * **Session Isolation:** Uses a custom header `x-session-token` to map requests to specific users, isolating carts between tenants.
  * **Tiered Promo Math:** Tiered discount percentage applied based on subtotal (Bronze 5% for ₹500+, Silver 10% for ₹1000+, Gold 15% for ₹2000+).
  * **Diversity Bonus:** Additional 2% discount applied if the cart contains items from 3 or more distinct product categories.
* **Feature X (Production Additions):**
  * **Rate Limiting:** Protects registration and cart paths from brute-force/DoS attacks.
  * **Structured Logging:** Uses `morgan` + `winston` to log HTTP request metadata and error logs in JSON format.
  * **Cart TTL Expiry:** Sets an automated MongoDB TTL index to delete inactive carts after 7 days, preventing database bloat.
* **Setup Instructions:**
  * Straightforward pre-requisites list (Node.js & MongoDB).
  * 3-step installation guide: `npm install`, copying `.env.example` to `.env`, and starting with `npm run dev` or `npm start`.

---

## 4. DESIGN.md Architecture & Strategy
* **Schema Decisions:**
  * Uses a **1-to-Many User to Cart relationship** where items are **embedded directly within the Cart document**.
  * Embedded items ensure atomic MongoDB updates (`$push`, `$pull`, `$set`), eliminating race conditions and complex multi-table joints.
* **Validation Strategy:**
  * Implemented defensive validation at the API boundary using `express-validator`.
  * Quantities are validated to be integers $\ge 1$, prices as floats $> 0$, and emails format-checked before reaching business logic.
  * Yields structured `400 Bad Request` JSON error summaries on validation failures.
* **Edge Cases & Trade-offs Considered:**
  * **Price Denormalization:** Items in the cart copy their price, name, and category at add-to-cart time. 
    * *Trade-off:* If product prices change later in the database catalog, the cart retains the original locked price. 
    * *Justification:* Prevents surprise price updates during checkout and reduces DB query overhead.
  * **State Transitions:** Once checked out, carts transition from `active` to `checked_out`, serving as an immutable record and freeing the user to start a new cart.
