# Phase 09 — Super Admin

**Status:** ✅ Audited — 2 bugs fixed (cookie-based auth, logout API call)  
**Depends on:** Nothing — separate auth from org-level admin

---

## Scope

| Area | Detail |
|------|--------|
| Frontend pages | `http://localhost:3001/superadmin/login`, `http://localhost:3001/superadmin/dashboard` |
| API routes | `POST /api/superadmin/auth/login`, `POST /api/superadmin/auth/logout`, `GET /api/superadmin/admins` |
| Auth | Separate JWT — cookie `superadmin_token`; middleware `withSuperAdmin` validates it |

---

## Super Admin vs Org Admin

| | Org Admin | Super Admin |
|--|-----------|-------------|
| Auth route | `POST /api/auth/login` | `POST /api/superadmin/auth/login` |
| Scope | One org | All orgs on platform |
| Data access | Own org's projects/users | All orgs, all users (read-only aggregates) |
| Cookie | `token` | `superadmin_token` |

---

## API Endpoints

### `POST /api/superadmin/auth/login`
```json
{ "email": "superadmin@platform.com", "password": "SuperSecretPwd" }
```
**Response `200`:** `{ "token": "<jwt>" }` — stored in `superadmin_token` cookie.

### `POST /api/superadmin/auth/logout`
Clears `superadmin_token` cookie.

### `GET /api/superadmin/admins`
Returns all orgs with their admin details and stats:
```json
[
  {
    "orgId": "...",
    "orgName": "Test Admin's Workspace",
    "createdAt": "...",
    "admin": { "name": "Test Admin", "email": "...", "status": "active" },
    "stats": { "userCount": 3, "projectCount": 5, "templateCount": 2 }
  }
]
```

---

## Test Scenarios

### 09-A — Super Admin Login
1. Navigate to `http://localhost:3001/superadmin/login`
2. Enter super admin credentials
3. **Assert:** Redirected to `/superadmin/dashboard`
4. **Assert:** `superadmin_token` cookie set

### 09-B — Dashboard — Platform Stats
1. On dashboard, **Assert:** Total orgs, users, and projects shown
2. **Assert:** Each org row shows admin name, user count, project count

### 09-C — Org Detail View
1. Click on an org row (if detail view exists)
2. **Assert:** Org's users and projects listed

### 09-D — Super Admin Logout
1. Click logout
2. **Assert:** `superadmin_token` cookie cleared
3. **Assert:** Redirected to `/superadmin/login`

### 09-E — Protected route guard
1. Clear `superadmin_token` cookie
2. Navigate to `/superadmin/dashboard`
3. **Assert:** Redirected to `/superadmin/login`

---

## Frontend Fixes Applied (this phase)

| File | Bug | Fix |
|------|-----|-----|
| `app/superadmin/login/page.tsx` | `localStorage.setItem('superadmin_token', response.data.token)` — API returns no `token` in body (uses httpOnly `sa_token` cookie) | Removed the localStorage write; `withCredentials: true` already correct |
| `app/superadmin/dashboard/page.tsx` | All data fetches used `{ headers: getHeaders() }` (Bearer from localStorage) — `withSuperAdmin` reads `sa_token` cookie, ignores Authorization header | Changed all axios calls to `{ withCredentials: true }` |
| `app/superadmin/dashboard/page.tsx` | Logout only cleared localStorage — `sa_token` cookie remained active | Logout now calls `POST /superadmin/auth/logout` to clear the cookie server-side |

---

## Dead UI (API route missing)

| Feature | Frontend action | API status |
|---------|-----------------|------------|
| Create admin | `POST /superadmin/admins` | Route has only GET — 405 Method Not Allowed |
| Delete admin | `DELETE /superadmin/admins/:id` | No dynamic route — 404 |
| Platform stats | `GET /superadmin/stats` | No such route — handled gracefully via `allSettled` |

---

## Known Observations

| Item | Notes |
|------|-------|
| Super admin credentials | Seeded separately — check `SuperAdmin` model seed script or `.env` |
| `withSuperAdmin` middleware | Reads `sa_token` httpOnly cookie via `next/headers` — not an Authorization header |
| `sa_token` cookie | Set with `sameSite: lax` — requires `withCredentials: true` for cross-origin requests (API on `:3000`, web on `:3001`) |
| GET `/superadmin/admins` | Returns `[{ orgId, orgName, admin: { name, email, status }, stats: { userCount, projectCount, templateCount } }]` — note `admin` not `owner` |
