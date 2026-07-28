# Phase 02 — Users & Roles / Permissions

**Status:** ✅ API Passed — UI manual pending  
**Depends on:** Phase 01 (need an authenticated Admin account)

---

## Scope

| Area | Detail |
|------|--------|
| Frontend pages | `http://localhost:3001/users` |
| API routes | `/api/roles`, `/api/roles/[id]`, `/api/users`, `/api/users/[id]` |
| Models | `Role`, `User` |
| Components | `src/components/users/RoleList.tsx`, `RoleModal.tsx`, `UserList.tsx`, `UserModal.tsx` |

---

## API Endpoints

### Roles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/roles` | List all roles for the org |
| POST | `/api/roles` | Create a new role |
| GET | `/api/roles/[id]` | Get single role |
| PATCH | `/api/roles/[id]` | Update role name/permissions |
| DELETE | `/api/roles/[id]` | Delete role (non-system roles only) |

**Role payload:**
```json
{
  "name": "Site Engineer",
  "permissions": ["projects:view", "workprogress:view", "workprogress:create", "site:view"]
}
```
Permissions are stored as flat string array. The UI converts to/from a nested object (`{ projects: { view: true } }`).

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users in the org |
| POST | `/api/users` | Invite/create a new user |
| PATCH | `/api/users/[id]` | Update user (name, phoneNumber, roleId, projectIds) |
| DELETE | `/api/users/[id]` | Delete user |

> **⚠️ `GET /api/users/[id]` does NOT exist** — returns 405. Use `GET /api/users` list only.

**User create payload (correct field names):**
```json
{
  "name": "John Doe",
  "email": "john@test.com",
  "phoneNumber": "9876543210",
  "roleId": "<roleId>",
  "projectIds": ["<projectId1>"],
  "password": "Test@1234"
}
```

---

## Permission Modules (15 total)

| Module ID | Title |
|-----------|-------|
| `projects` | Project Management |
| `financials` | Financials & Payments |
| `inventory` | Inventory & Assets |
| `team` | User & Team Mgmt |
| `site` | Site Operations |
| `plans` | Plan Management |
| `annotations` | Plan Annotations |
| `sitesurvey` | Site Survey Management |
| `budget` | Budget Management |
| `land` | Land Documents Mgmt |
| `boq` | BOQ Management |
| `tasks` | Task Management |
| `workprogress` | Work Progress |
| `snag` | Snag Management |
| `escalation` | Escalation Matrix |

**Actions per module:** `view`, `create`, `update`, `delete`, `approve`, `complete`

---

## Test Results (API — automated)

| ID | Scenario | Result | Notes |
|----|----------|--------|-------|
| 02-A | GET /api/roles | ✅ PASS | Admin role returned with `permissions: ["*"]`, `userCount: 1` |
| 02-B | POST /api/roles (Site Engineer) | ✅ PASS | `201`, ID: `6a02ff825b036645c8f40a9f` |
| 02-C | GET /api/roles/[id] | ✅ PASS | Role data returned correctly |
| 02-D | PATCH /api/roles/[id] | ✅ PASS | Permissions updated |
| 02-E | PATCH Admin role | ✅ PASS | Blocked: "Forbidden: System roles cannot be modified" |
| 02-F | DELETE Admin role | ✅ PASS | Blocked: "Forbidden: Global Administrator roles cannot be deleted" |
| 02-G | POST /api/users (new user) | ✅ PASS | `201`, ID: `6a02ffab5b036645c8f40aa5` |
| 02-H | PATCH /api/users/[id] with roleId | ✅ PASS | Role updated correctly |
| 02-I | DELETE /api/users/[id] | ✅ PASS | `200`, user removed |
| 02-J | GET /api/users/[id] | ❌ 405 | No GET single-user endpoint — by design |

---

## Test Scenarios (UI — manual)

### 02-A — View Roles tab
1. Open `http://localhost:3001/users` → Roles tab
2. **Assert:** Admin role visible with a lock icon (cannot be edited/deleted)
3. **Assert:** Permissions badge or count shown

### 02-B — Create a new Role
1. Click "Create Role"
2. Name: `"Site Engineer"`
3. Toggle on: `projects:view`, `workprogress:view`, `workprogress:create`
4. Save
5. **Assert:** `POST /api/roles` returns `201`
6. **Assert:** New role appears in list

### 02-C — Edit a Role
1. Click edit on `Site Engineer`
2. Add `workprogress:delete`, remove `workprogress:create`
3. Save
4. **Assert:** `PATCH /api/roles/[id]` returns `200`

### 02-D — All 15 modules visible in RoleModal
1. Open any role for editing
2. **Assert:** All 15 module cards visible (scroll through modal)
3. **Assert:** Each module has 6 action toggles
4. **Assert:** "Grant All" preset works; "View Only" preset works

### 02-E — Admin role is locked
1. Try to edit the Admin role
2. **Assert:** All toggles are disabled
3. **Assert:** Cannot delete Admin role

### 02-F — Create a new User
1. Switch to Users tab, click "Add Member"
2. Fill in: Name, Email, Mobile (10 digits), select `Site Engineer` role, select a project
3. Submit
4. **Assert:** User appears in list with correct role pill
5. **Assert:** Phone number shows in user card

### 02-G — Edit User
1. Click edit on the user created above
2. Change role, add another project
3. Save
4. **Assert:** User card reflects updated role

### 02-H — Delete User
1. Delete the test user
2. **Assert:** User removed from list

### 02-I — Permission enforcement (login as limited user)
1. Log out of Admin, log in as `Site Engineer` user
2. Navigate to `/users` — role management tab should be hidden or blocked
3. Navigate to `/projects` — should be accessible (has `projects:view`)

---

## Frontend Fixes Applied (this phase)

| File | Fix |
|------|-----|
| `UserModal.tsx` | Payload keys corrected: `mobile` → `phoneNumber`, `role` → `roleId`, edit-mode read `initialData.mobile` → `initialData.phoneNumber` |
| `UserList.tsx` | Phone display corrected: `user.mobile \|\| user.phone` → `user.phoneNumber \|\| user.mobile \|\| user.phone` |

---

## Shared Test Data

```
Site Engineer Role ID:  6a02ff825b036645c8f40a9f
Test User ID (deleted): 6a02ffab5b036645c8f40aa5
```

---

## Notes
- `phoneNumber` in `User` model validates 10-digit format `/^[0-9]{10}$/` — no dashes or spaces
- `*` wildcard in role permissions = full access to all modules
- Admin role is identified by `role.name.toLowerCase().includes('admin')` on the frontend
- Deleting a user does not cascade-delete their work; audit trails keep `userName` as string
