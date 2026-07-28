# Phase 04 — Project Workspace: Plans, Milestones, DPR

**Status:** ✅ Audited — 3 bugs fixed, renders correctly  
**Depends on:** Phase 03 (need a created project with its ID)

---

## Scope

| Area | Detail |
|------|--------|
| Frontend | `http://localhost:3001/projects/[id]` — tabs: Milestones, Plans, Progress (DPR) |
| API routes | `/api/projects/[id]/milestones`, `/api/projects/[id]/milestones/[milestoneId]`, `/api/projects/[id]/folders`, `/api/projects/[id]/work-progress` |
| Components | `MilestonesTab.tsx`, `DPRTab.tsx`, `DPRModal.tsx`, `PlansTab.tsx`, `PlanRoom.tsx` |

---

## API Endpoints

### Milestones

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[id]/milestones` | List milestones (sorted by dueDate asc) |
| POST | `/api/projects/[id]/milestones` | Create milestone |
| PATCH | `/api/projects/[id]/milestones/[milestoneId]` | Update milestone (status, tasks, etc.) |
| DELETE | `/api/projects/[id]/milestones/[milestoneId]` | Delete milestone |

**Create payload:**
```json
{
  "name": "Foundation Complete",
  "description": "All foundation work done",
  "dueDate": "2026-07-01",
  "tasks": [
    { "title": "Pour concrete", "isCompleted": false },
    { "title": "Curing period", "isCompleted": false }
  ]
}
```
Status defaults to `"Pending"`. Valid statuses: `Pending`, `In Progress`, `Completed`, `On Hold`, `Delayed`.

---

### Plans (Folders & Documents)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[id]/folders` | List plan folders |
| POST | `/api/projects/[id]/folders` | Create a folder (auto-moves project to Planning if Initialized) |
| PATCH | `/api/projects/[id]/folders/[folderId]` | Update folder (rename) |
| DELETE | `/api/projects/[id]/folders/[folderId]` | Delete folder |
| GET | `/api/projects/[id]/folders/[folderId]/annotations` | Get annotations on a plan |
| POST | `/api/projects/[id]/folders/[folderId]/annotations` | Add annotation |

**Create folder payload:** `{ "name": "Structural Plans" }`

---

### Work Progress (DPR)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[id]/work-progress` | List logs (query: `?period=today\|week\|month&milestoneId=xxx`) |
| POST | `/api/projects/[id]/work-progress` | Create progress log (requires `workprogress:create` permission) |
| DELETE | `/api/projects/[id]/work-progress?logId=xxx` | Delete log (requires `workprogress:delete`) |

**DPR create payload (correct field names):**
```json
{
  "milestoneId": "<milestoneId or null>",
  "milestoneName": "Foundation Complete",
  "description": "Concrete poured on north wing",
  "photos": ["https://cloudinary.com/..."],
  "date": "2026-05-12"
}
```
> **⚠️ `progressPercent` is ignored by the API** — always stored as `0` regardless of form slider value.  
> **⚠️ At least one photo is required** — API returns `400` if `photos` array is empty.  
> **⚠️ `workprogress:view` permission required** — Admin bypasses this.

---

## Frontend Fixes Applied (this phase)

| File | Bug | Fix |
|------|-----|-----|
| `DPRModal.tsx` | Sent `milestone: id` via spread — API expects `milestoneId` | Rewrote payload to send explicit `milestoneId: formData.milestone` |
| `DPRModal.tsx` | Used `selectedMilestone?.title` (undefined) — model field is `name` | Changed to `selectedMilestone?.name` |
| `DPRModal.tsx` | Dropdown rendered `{m.title}` (blank) | Changed to `{m.name}` |

---

## Test Scenarios

### 04-A — Create a Milestone
1. Open project workspace → Milestones tab
2. Click "Add Milestone"
3. Fill name, description, due date; add 2 tasks
4. Save
5. **Assert:** `POST /api/projects/[id]/milestones` returns `201`
6. **Assert:** Milestone card appears with task list

### 04-B — Toggle a Task
1. Click a task checkbox on a milestone card
2. **Assert:** `PATCH /api/projects/[id]/milestones/[milestoneId]` called with updated `tasks`
3. **Assert:** Task shows as completed (strikethrough or check)

### 04-C — Change Milestone Status
1. Open milestone context menu → change status to "In Progress"
2. **Assert:** PATCH called, status badge updates
3. Mark as "Completed" — **Assert:** `completedAt` set (milestone shows completion date)

### 04-D — Delete Milestone
1. Delete a milestone
2. **Assert:** `DELETE /api/projects/[id]/milestones/[id]` returns `200`
3. **Assert:** Milestone removed from list

### 04-E — Create Plan Folder
1. Open Plans tab → Create Folder
2. Enter folder name: `"Structural Plans"`
3. **Assert:** `POST /api/projects/[id]/folders` returns `201`
4. **Assert:** If project was in "Initialized" status, it auto-moves to "Planning"
5. **Assert:** Folder appears in Plans tab

### 04-F — Post DPR (Daily Progress)
1. Open Progress tab → "Post Update"
2. Select a milestone, enter description, upload at least one photo
3. Submit
4. **Assert:** `POST /api/projects/[id]/work-progress` returns `201`
5. **Assert:** Log appears in DPR list grouped by date

### 04-G — DPR without photo fails
1. Try submitting DPR with no photos
2. **Assert:** API returns `400 "At least one site photo is required"`
3. **Assert:** Error toast shown

### 04-H — DPR period filter
1. On Progress tab, filter by "Today" / "Week" / "Month"
2. **Assert:** API called with `?period=today` etc.
3. **Assert:** List updates accordingly

---

## Known Observations

| Item | Notes |
|------|-------|
| `progressPercent` slider in DPR modal | Cosmetic only — API ignores this field, stores `0` |
| Plan folder creates project auto-status | `Initialized` → `Planning` automatically on first folder create |
| `workprogress:view` permission | GET endpoint uses `withPermission(..., "workprogress:view")` — Admin bypasses |
| Socket events | `milestone:created/updated/deleted`, `workprogress:created/deleted`, `plans:updated` emitted — only active if socket-server runs |
