# Functional Review — all features verified

Method: exercised every UI action through its real endpoint against the deployed app (`http://eshtry-mny.192.168.1.8.nip.io`) and confirmed the new frontend bundle is live.

## Fixes made in this pass
1. **Remove from cart** — the Cart page had no remove control although `DELETE /api/v1/cart/:productid` existed. Added a per-row **Remove** button (refreshes the cart after deletion).
2. **Order summary + receipt** — Checkout just cleared the cart with an alert. Now it shows the order (items, category, price, total) before placing, and a **Receipt** (order id, date, itemised total) after; the cart is cleared server-side.
3. **Add-to-cart feedback** — 401 now redirects to login, 409 shows "already in your cart", other errors show a message (previously silent on 409).
4. **Broken product images** — product images are external URLs (some malformed in `products.json`); added an `onError` fallback so a broken image no longer leaves a broken-image icon. Checkout disabled for an empty cart.
5. **Auth UX** (previous pass) — logout endpoint + redirect authenticated users away from `/login` and `/register`; NavBar Login/Logout.

## Verified working (real responses)
```
Frontend routes / /register /login /profile /cart /checkout /productinfo/:id -> 200
products 26 · by id 200 · by name 200 · missing 404
filters: category/price/categoryprice 200 · invalid price 400
register (empty gender + local phone) 201 · login 200 · logout 200 -> profile 401
profile with JWT 200 · no JWT 401 · wrong password 401
cart: add 200 · duplicate 409 · get total · remove 200 · checkout cleared 1 · empty after
admin: create product 200 · invalid 400 · non-admin 403
Deployed bundle contains: Remove, Receipt, Logout, duplicate-cart message
```

## Known cosmetic limitations (not functional bugs)
- Product images come from third-party CDNs and one URL in `products.json` (Destiny 2) is malformed; the `onError` fallback hides it rather than showing a broken icon. Fixing seed data is optional.
- No payment is processed; `checkout` clears the cart by design (there is no payment service).
