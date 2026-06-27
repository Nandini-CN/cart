# Adaptive E-Commerce Cart Engine

A production-ready Shopping Cart Engine microservice built with Node.js, Express, and MongoDB.

## Features
- **Multi-Tenant Cart Isolation**: Uses unique header-based session tokens (`x-session-token`) to isolate user carts.
- **Item Ingestion Engine**: RESTful endpoints to add, patch quantities, remove, or clear items.
- **Tiered Campaigns & Category Diversity Checkout**: Dynamic calculation of discounts based on order value tiers and product categories.
- **Production Enhancements (Feature X)**:
  - **Rate Limiting**: Defends API boundaries from brute force and denial of service.
  - **Request Logging**: Morgan HTTP logger integrated with Winston file rotators.
  - **Cart TTL Expiration**: Inactive carts auto-expire and are removed from MongoDB after 7 days.
- **Robust Model Validations**: Built-in input constraints (e.g. valid emails, non-negative prices, integer quantities) with unified error response formats.

---

## Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [MongoDB](https://www.mongodb.com/) (running locally or a connection string from Atlas)

### Local Steps
1. **Clone & Install**:
   ```bash
   cd Cart
   npm install
   ```
2. **Environment File**:
   Copy `.env.example` to `.env` and fill in details:
   ```bash
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/cart_engine
   NODE_ENV=development
   ```
3. **Start the service**:
   - For development auto-reload:
     ```bash
     npm run dev
     ```
   - For production run:
     ```bash
     npm start
     ```

---

## API Specifications

### 1. User onboarding & Auth
- **POST `/api/users/register`**: Registers a user (or logins if already exists) and yields a `sessionToken`.
  - *Payload*:
    ```json
    { "username": "mohan_dev", "email": "mohan@example.com" }
    ```
  - *Response*:
    ```json
    {
      "success": true,
      "data": {
        "userId": "64a27f6...",
        "username": "mohan_dev",
        "email": "mohan@example.com",
        "sessionToken": "d4e21a78-295b-4c07-b3ea-1577e163cb7e"
      }
    }
    ```
- **GET `/api/users/me`**: Fetches user info. Must supply `x-session-token` header.

### 2. Cart Operations (Requires header `x-session-token`)
- **GET `/api/cart`**: Get current active cart.
- **POST `/api/cart/items`**: Add item or increment quantity.
  - *Payload*:
    ```json
    {
      "productId": "prod_101",
      "name": "Mechanical Keyboard",
      "category": "Electronics",
      "price": 1200,
      "quantity": 1
    }
    ```
- **PATCH `/api/cart/items/:productId`**: Direct update of product quantity.
  - *Payload*:
    ```json
    { "quantity": 3 }
    ```
- **DELETE `/api/cart/items/:productId`**: Delete product from cart.
- **DELETE `/api/cart`**: Clear all items.

### 3. Checkout Calculations (Requires header `x-session-token`)
- **GET `/api/checkout/summary`**: Calculates subtotal, applies campaign tier and diversity bonus discount, and returns final totals.
  - *Response*:
    ```json
    {
      "success": true,
      "data": {
        "cartId": "64a27f9...",
        "items": [...],
        "campaignName": "Default Storewide Tiered Campaign",
        "subtotal": 1200,
        "appliedDiscounts": {
          "tier": { "name": "Silver Discount", "percentage": 10, "amount": 120 },
          "diversity": { "name": "No category diversity bonus", "percentage": 0, "amount": 0, "distinctCategoriesCount": 1 }
        },
        "totalDiscount": 120,
        "finalTotal": 1080
      }
    }
    ```

---

## Testing / Verification Guide

To test the application locally, you can use the following `curl` sequences.

### Step 1: Register User A
```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username": "user_a", "email": "usera@example.com"}'
```
*Note the returned `"sessionToken"` from the response.*

### Step 2: Add Items to User A's Cart
*(Replace `<TOKEN_A>` with the sessionToken from Step 1)*
```bash
curl -X POST http://localhost:5000/api/cart/items \
  -H "Content-Type: application/json" \
  -H "x-session-token: <TOKEN_A>" \
  -d '{"productId": "p1", "name": "MacBook", "category": "Electronics", "price": 1500, "quantity": 1}'
```

### Step 3: Trigger Multi-Tenant Validation
Try fetching the cart with an invalid token:
```bash
curl -X GET http://localhost:5000/api/cart \
  -H "x-session-token: invalid-token-xyz"
```
*Expected: 401 Unauthorized*

### Step 4: Verify Promo Checkout Summary
```bash
curl -X GET http://localhost:5000/api/checkout/summary \
  -H "x-session-token: <TOKEN_A>"
```
*Verify that the MacBook subtotal (1500) matches the Silver Discount (10% = 150) resulting in finalTotal = 1350.*

---

## Architectural Choices & Design

Refer to [DESIGN.md](./DESIGN.md) for detailed reasoning on database models, promo schemas, rate limiting, logging choices, validation, and design decisions.
