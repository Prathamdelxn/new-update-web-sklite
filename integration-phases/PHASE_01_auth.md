# Phase 01 — Authentication & Organization

**Status:** ✅ API Passed / 🔄 UI needs manual verification  
**Depends on:** Nothing (entry point)

---

## Infrastructure Map (confirmed)

| Server | Port | What runs there |
|--------|------|-----------------|
| sky-lite-api | `localhost:3000` | Next.js backend — all `/api/*` routes |
| sky-lite-web | `localhost:3001` | Next.js frontend — the actual UI |

> `NEXT_PUBLIC_API_URL=http://localhost:3000/api` in `.env.local` is correct.

**Token storage:** `localStorage` (`token`, `refreshToken`, `user`) + cookie `token` (via js-cookie for Next.js middleware).  
**Auth header:** `Authorization: Bearer <token>` on every API request.

---

## Scope

| Area | Detail |
|------|--------|
| Frontend pages | `http://localhost:3001/login`, `http://localhost:3001/register`, `http://localhost:3001/profile` |
| API routes | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/refresh` |
| Models | `User`, `Organization`, `Role` |

---

## API Endpoints

### POST `/api/auth/register`

**Request:**
```json
{ "name": "Test Admin", "email": "admin@test.com", "password": "Test@1234" }
```
**Response `201`:**
```json
{
  "message": "User registered successfully",
  "user": { "id": "...", "name": "Test Admin", "email": "admin@test.com", "role": "Admin" }
}
```
Auto-creates: Organization (`"Test Admin's Workspace"`), Admin Role (`permissions: ["*"]`), User.  
**Note:** register does NOT return a token — user must login separately.

---

### POST `/api/auth/login`

**Request:**
```json
{ "email": "admin@test.com", "password": "Test@1234" }
```
**Response `200`:**
```json
{
  "token": "<jwt>",
  "refreshToken": "<jwt>",
  "user": {
    "id": "...",
    "name": "Test Admin",
    "email": "admin@test.com",
    "role": { "_id": "...", "name": "Admin", "permissions": ["*"] },
    "organizationId": "..."
  }
}
```

---

### POST `/api/auth/logout` _(requires Bearer token)_
**Response `200`:** `{ "message": "Logged out successfully" }`

---

### POST `/api/auth/refresh`
**Request:** `{ "refreshToken": "<jwt>" }`  
**Response `200`:** `{ "token": "<new_access_jwt>" }`

---

## Test Results (API — automated)

| ID | Scenario | Result | Notes |
|----|----------|--------|-------|
| 01-A | Register new admin | ✅ PASS | `201`, org + role + user created |
| 01-B | Duplicate email rejected | ✅ PASS | `400`, `"User already exists"` |
| 01-C | Login valid credentials | ✅ PASS | `200`, token + refreshToken returned |
| 01-D | Login wrong password | ✅ PASS | `401`, `"Invalid credentials"` |
| 01-F | Logout | ✅ PASS | `200`, audit trail updated |
| 01-R | Token refresh | ✅ PASS | `200`, new access token issued |

---

## Test Scenarios (UI — manual)

### 01-A — Register via UI
1. Open `http://localhost:3001/register`
2. Fill Name, Email, Password (≥6 chars), Confirm Password
3. Submit
4. **Assert:** Redirected to `/login?registered=true` (green banner shows)

### 01-C — Login via UI
1. Open `http://localhost:3001/login`
2. Enter credentials
3. **Assert:** Redirected to `/dashboard`
4. **Assert:** `localStorage.token` and `localStorage.user` set (check DevTools → Application → Local Storage)
5. **Assert:** Cookie `token` set (DevTools → Application → Cookies)

### 01-D — Wrong password via UI
1. Enter wrong password
2. **Assert:** Red toast error appears, no redirect

### 01-E — Protected route redirect
1. Clear localStorage and cookies
2. Navigate to `http://localhost:3001/projects`
3. **Assert:** Redirected to `/login`

### 01-F — Logout via UI
1. Click the logout/avatar button in the topnav
2. **Assert:** Redirected to `/login`
3. **Assert:** `localStorage.token` removed

### 01-G — Profile page name update
1. Login and navigate to `http://localhost:3001/profile`
2. Change Full Name field
3. Save
4. **Assert:** `PATCH /api/users/${userId}` called with `{ name, phoneNumber }`
5. **Assert:** Success toast shown
6. **Assert:** Name updates in topnav (AuthContext state refreshed)

---

## Known Issues / Limitations

| Issue | Severity | Notes |
|-------|----------|-------|
| `PATCH /auth/me` doesn't exist | Fixed (frontend) | Profile page now calls `PATCH /users/${user.id}` |
| `PATCH /auth/change-password` doesn't exist | ⚠️ Known | Password change form will error — no API endpoint |
| Avatar upload on profile page | ⚠️ Known | Cloudinary upload works but User model has no `avatar` field — URL not persisted |
| `GET /api/users/[id]` doesn't exist | ⚠️ Known | Can't fetch individual user by ID — use `GET /api/users` (list) |
| Login debug code: `User.find({})` | ⚠️ Performance | Fetches all users on every login (API-side, not frontend) |
| `refreshUser` was missing from AuthContext | Fixed | Added `refreshUser(updatedFields?)` method |
| `not-found.tsx` missing `'use client'` | Fixed | `onClick` on "Go Back" button caused RSC serialization error |
| `GlassCard.tsx` missing `'use client'` | Fixed | Had `onClick` prop without client directive |

---

## Shared Test Data (fill in)

```
Email:           testadmin@skylite.test
Password:        Test@1234
User ID:         6a02fdc05b036645c8f402cf
Org ID:          6a02fdc05b036645c8f402cd
Role ID:         6a02fdc05b036645c8f402ce
Access token:    (short-lived — re-login to get fresh one)
```
