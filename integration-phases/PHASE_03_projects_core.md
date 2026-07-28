# Phase 03 — Project Core CRUD

**Status:** ⬜ Not Started  
**Depends on:** Phase 01 (auth token), Phase 02 (have at least one role created)

---

## Scope

| Area | Detail |
|------|--------|
| Frontend pages | `http://localhost:3001/projects`, `http://localhost:3001/projects/[id]` |
| API routes | `GET/POST /api/projects`, `GET/PUT/PATCH/DELETE /api/projects/[id]` |
| Components | `src/components/ui/CreateProjectModal.tsx`, `src/components/ui/ProjectCard.tsx`, `app/projects/page.tsx`, `app/projects/[id]/page.tsx` |
| Models | `Project` |

---

## API Endpoints

### `GET /api/projects`
Returns all projects for the current user's organization.  
**Response:** Array of project objects, each with extra computed field:
```json
[
  {
    "_id": "...",
    "name": "Skyline Residency",
    "status": "Initialized",
    "priority": "Medium",
    "startDate": "2026-01-01T00:00:00.000Z",
    "endDate": "2026-12-31T00:00:00.000Z",
    "needSiteSurvey": false,
    "members": [],
    "createdBy": { "name": "...", "email": "..." },
    "budgetHistory": [{ "amount": 5000000, "reason": "Estimated Budget" }],
    "hasPendingPlans": false
  }
]
```

---

### `POST /api/projects`
**Request body:**
```json
{
  "name": "Test Project",
  "description": "Optional description",
  "clientName": "Raj Kumar",
  "clientEmail": "raj@client.com",
  "clientPhone": "9876543210",
  "priority": "High",
  "startDate": "2026-06-01",
  "endDate": "2026-12-31",
  "needSiteSurvey": false,
  "budget": "5000000"
}
```
**Response `201`:** Full project object.  
> `budget` creates a `budgetHistory` entry with `reason: "Estimated Budget"`.  
> `status` defaults to `"Initialized"` if omitted.

---

### `GET /api/projects/[id]`
Returns single project deeply populated (createdBy, members, siteSurveyor, snaggedBy all with role objects).

---

### `PUT /api/projects/[id]` — Full update
Used for budget versioning in addition to field updates:
```json
{
  "name": "Updated Name",
  "status": "In Progress",
  "newBudget": "6000000",
  "budgetReason": "Scope change"
}
```
> If `newBudget` + `budgetReason` are present, a new `budgetHistory` entry is pushed.

---

### `PATCH /api/projects/[id]` — Partial update
Used by the frontend edit modal. Budget and area excluded.
```json
{ "name": "New Name", "status": "Planning" }
```

---

### `DELETE /api/projects/[id]`
**Response `200`:** `{ "message": "Project deleted successfully" }`

---

## Status Values (valid enum)

`Initialized` | `Planning` | `Site Survey` | `In Progress` | `Under Snagging` | `Snagging Completed` | `Completed` | `On Hold` | `Cancelled`

## Priority Values

`Low` | `Medium` | `High` | `Urgent`

---

## Frontend Behaviour Notes

- **Create flow** (3 steps): Category → Template → Configure. Template pre-fills `name` and `budget`. Custom skips template.
- **Edit flow**: Modal skips to Configure step, sends `PATCH` (budget and area excluded).
- **Budget edit** is separate — done from the Budget tab using `PUT` with `newBudget` + `budgetReason`.
- **Progress bar** on `ProjectCard` is derived from `status`, not stored in DB.
- The `hasPendingPlans` flag comes from the list API and shows a red badge on the card.
- Socket event `project:updated` triggers a re-fetch via `useProjectSocket` hook.

---

## Test Scenarios

### 03-A — View Projects List
1. Navigate to `http://localhost:3001/projects`
2. **Assert:** All org projects listed as cards (grid view)
3. **Assert:** Status badge, priority, member count, budget display correctly
4. **Assert:** List view toggle works

### 03-B — Create Project (custom, no template)
1. Click "New Project"
2. Select any category → "Custom Requirement"
3. Fill: Name, Location, Budget, Priority, Start/End dates, Client details
4. Click "Finalize & Create"
5. **Assert:** `POST /api/projects` returns `201`
6. **Assert:** New card appears in list
7. **Assert:** Budget shows in card (reads from `budgetHistory[last].amount`)

### 03-C — Create Project (from template)
1. Click "New Project"
2. Select a category with templates → select a template
3. **Assert:** Form pre-fills name and budget from template
4. Submit
5. **Assert:** `POST /api/projects` returns `201`

### 03-D — Edit Project (basic fields)
1. Open project context menu → Edit Project
2. Change name, description, priority
3. Save
4. **Assert:** `PATCH /api/projects/[id]` called
5. **Assert:** Card reflects updated values after list refresh

### 03-E — Delete Project
1. Open project context menu → Delete Project
2. Confirm
3. **Assert:** `DELETE /api/projects/[id]` returns `200`
4. **Assert:** Card removed from list

### 03-F — Open Project Workspace
1. Click "Workspace" on a project card
2. **Assert:** Navigates to `/projects/[id]`
3. **Assert:** Project name in header, all 13 tabs visible
4. **Assert:** Details tab shows client info, dates, description, status/priority

### 03-G — Status Change
1. On workspace details tab, change status
2. **Assert:** `PATCH /api/projects/[id]` called with updated status
3. **Assert:** Status badge in workspace header updates

### 03-H — Search & Filter
1. On projects list, type a project name
2. **Assert:** Cards filter in real time (client-side)
3. Select a status from the dropdown filter
4. **Assert:** Only matching-status cards shown

---

## Known Observations

| Item | Notes |
|------|-------|
| `area` field in create form | Collected in form but excluded from PATCH payload — Project model may not persist it |
| Budget edit in main modal | Budget stripped from edit PATCH; budget changes require Budget tab flow |
| `console.log` in API routes | Present in GET handlers (cosmetic, harmless) |
| Socket optional | `project:updated` works only if socket-server is running; absence doesn't break CRUD |

---

## Shared Test Data (fill in)

```
Test Project ID: 
```
