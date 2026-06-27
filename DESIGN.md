# Adaptive E-Commerce Cart Engine — DESIGN.md

## 1. System Architecture & Separation of Concerns
The microservice is built using Node.js, Express, and MongoDB. We follow a clean layered architecture to decouple presentation, business rules, validation, and data persistence layers:

```
┌────────────────────────────────────────────────────────┐
│                      Client                            │
└───────────────────┬───────────────▲────────────────────┘
                    │ Request       │ Response
                    ▼               │
┌───────────────────────────────────┴────────────────────┐
│                  Middleware Layer                      │
│  - Rate Limiting (DoS Defense)                         │
│  - Morgan HTTP Request Logger                          │
│  - Session Auth Header Resolver (Tenant Isolation)     │
│  - Input Schema Validators (express-validator)        │
└───────────────────┬────────────────────────────────────┘
                    │ Validated Input + User Context
                    ▼
┌────────────────────────────────────────────────────────┐
│                   Controller Layer                     │
│  - Maps HTTP requests, routes, parameters              │
│  - Handles status response mappings                    │
└───────────────────┬────────────────────────────────────┘
                    │ Service Calls
                    ▼
┌────────────────────────────────────────────────────────┐
│                    Service Layer                       │
│  - Encapsulates cart state manipulation                │
│  - Computes promotions (Tiered & Diversity formulas)   │
└───────────────────┬────────────────────────────────────┘
                    │ Schema Queries & Mutations
                    ▼
┌────────────────────────────────────────────────────────┐
│                   Data Access Layer                    │
│  - MongoDB (Mongoose ODM) Schema models                │
│  - Database constraints & TTL indices                  │
└────────────────────────────────────────────────────────┘
```

- **Routes**: Declare URI endpoints and bind validation & auth middleware chains before matching controllers.
- **Validators**: Enforce defensive schema structures at the edge, blocking bad client data before running service code.
- **Controllers**: Thin orchestration handlers. They catch errors via a global Express wrapper and output structured JSON.
- **Services**: Pure business logic (e.g., adding quantities, computing discount thresholds, calculating totals). Independent of Express req/res.
- **Models**: Native Mongoose models defining indexes, validations, defaults, and MongoDB options.

---

## 2. Multi-Tenant Session & Schema Isolation
In multi-tenant e-commerce environments, cart cross-talk (User A viewing or mutating User B's cart) is a high-risk security hazard. 

### Session Isolation Strategy
We implement a **session-based isolation header**:
1. When a user registers or logs in via `/api/users/register`, they receive a UUIDv4 `sessionToken` stored in the `User` collection.
2. Subsequent requests to protected endpoints (`/api/cart/*` and `/api/checkout/*`) must supply the `x-session-token` header.
3. The `authenticate` middleware matches the header against the `User` collection, resolves the tenant, and binds `req.userId` for controller actions.

### Schema Modeling Relationships
We use a **1-to-Many User to Cart relationship**, but enforce that only **one cart can be active** at a time per user:
- Users have an `_id` and `sessionToken`.
- Carts have a `userId` reference and a `status` field (`active`, `checked_out`, `abandoned`).
- Items are **embedded directly within the Cart document** as an array of sub-documents:
  ```json
  {
    "userId": "ObjectId(User)",
    "status": "active",
    "items": [
      { "productId": "p_1", "name": "Shirt", "category": "Apparel", "price": 49.99, "quantity": 2 }
    ]
  }
  ```
- **Why Embed Items?** Embedded sub-documents provide atomic writes. We can push/pull/update cart items in a single MongoDB document write query, eliminating race conditions or out-of-sync multi-table joints.

---

## 3. Tiered Promotional Campaign & Diversity Math
Discounts are calculated at checkout `/api/checkout/summary`. The promotional engine combines two rules:

### A. Subtotal Tiered Discounts
The subtotal is first computed as `Σ(price × quantity)`. We matching it against the active Campaign tiers:
- **Bronze Tier**: Cart Value ₹500 to ₹999 $\rightarrow$ 5% discount.
- **Silver Tier**: Cart Value ₹1000 to ₹1999 $\rightarrow$ 10% discount.
- **Gold Tier**: Cart Value ₹2000+ $\rightarrow$ 15% discount.

### B. Category Diversity Reward
To incentivize catalog exploration, buying items across at least **3 distinct categories** grants an **additional 2% discount** on the subtotal.

### Formula
$$Subtotal = \sum (ItemPrice \times Quantity)$$
$$TierPct = \text{discount\% matching subtotal range}$$
$$DiversityPct = \begin{cases} 2\%, & \text{if unique categories} \ge 3 \\ 0\%, & \text{otherwise} \end{cases}$$
$$TotalDiscount = Subtotal \times (TierPct + DiversityPct)$$
$$FinalTotal = Subtotal - TotalDiscount$$

*Rounding: Subtotals, discount amounts, and final totals are rounded to 2 decimal places to avoid standard floating-point representation bugs (e.g., 0.1 + 0.2 = 0.30000000004).*

---

## 4. Feature X: Production-Ready Additions
To make this shopping cart engine production-ready, we implemented a triad of essential microservice features:

1. **Rate Limiting Middleware (`express-rate-limit`)**
   - *Why*: Protects database and backend loops from malicious spikes, bulk crawling, and brute-force register attempts.
   - *Detail*: 100 requests per 15-minute window per IP. Registration endpoint is throttled strictly to 10 requests per 15 minutes.

2. **Structured Request Logging (`winston` + `morgan`)**
   - *Why*: Critical for observability. In production, logs write to standard JSON logs (`combined.log`, `error.log`) with timestamp, IP, method, route, and current tenant ID to trace bugs.

3. **Cart Abandonment TTL Expiry (MongoDB TTL index)**
   - *Why*: Carts are often abandoned. Leaving them indefinitely in MongoDB bloats memory and storage indexes.
   - *Detail*: We add an `expiresAt` timestamp set to 7 days in the future. We run a background index on MongoDB that automatically cleans up carts once `expiresAt` is reached. Whenever a user interacts with their cart, the `expiresAt` timestamp is pushed 7 days forward.

---

## 5. Defensive Input Validation
Validation is performed at the router level before hitting the controllers:
- Using `express-validator`, we assert data types (e.g., quantities must be integers $\ge 1$, prices must be float $> 0$).
- All schema validation errors are caught by `validateRequest` middleware, returning a structured `400 Bad Request` payload:
  ```json
  {
    "success": false,
    "error": "Validation failed",
    "details": [
      { "field": "price", "message": "Price must be a number greater than 0", "value": -10 }
    ]
  }
  ```

---

## 6. Edge Cases & Architectural Trade-offs
1. **Price Denormalization**: We store item price, name, and category in the cart items array at write-time, instead of querying a catalog database at checkout.
   - *Trade-off*: If product catalogs change their price, the cart retains the price locked at the time the item was added.
   - *Justification*: This matches real-world cart expectations (locking prices, avoiding database join bottlenecks during peak checkout loads).
2. **State Transition**: Once a cart checkout occurs, its status transitions to `checked_out`. This marks the cart inactive and preserves transaction audit records.
