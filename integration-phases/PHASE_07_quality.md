# Phase 07 — Quality Control: Issues, Risks, Snags, Survey

**Status:** ✅ Audited — 1 bug fixed (SurveyModal field name mapping)  
**Depends on:** Phase 03 (need project ID)

---

## Scope

| Area | Detail |
|------|--------|
| Frontend | Project workspace → Issues & Snags tab, Risks tab, Site Survey tab |
| API routes | `/api/projects/[id]/issues`, `/api/projects/[id]/snags`, `/api/projects/[id]/risks`, `/api/projects/[id]/survey`, `/api/projects/[id]/escalation-matrix` |
| Components | `IssuesTab.tsx`, `IssueModal.tsx`, `IssueDetailModal.tsx`, `RisksTab.tsx`, `RiskModal.tsx`, `RiskDetailModal.tsx`, `SurveyTab.tsx`, `SurveyModal.tsx`, `SurveyDetailModal.tsx`, `EscalationMatrixModal.tsx` |

---

## API Endpoints

### Issues & Snags

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[id]/issues` | List issues (populated: createdBy, assignedTo) |
| POST | `/api/projects/[id]/issues` | Create issue or snag |
| GET | `/api/projects/[id]/snags` | List snags specifically |

**Issue create payload:**
```json
{
  "title": "Crack in foundation slab",
  "description": "3mm crack observed at NE corner",
  "priority": "High",
  "category": "Structural",
  "type": "Issue",
  "assignedTo": "<userId or empty string>",
  "notifyTeam": true
}
```
> **⚠️ Empty `assignedTo` string** — API deletes the field if `""`. Frontend must send `""` for unassigned (not `null`).  
> `type`: `"Issue"` | `"Snag"` — determines which tab it appears in.  
> `category`: `Technical` | `Safety` | `Quality` | `Financial` | `Snag` (auto-set for Snags)

---

### Risks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[id]/risks` | List risks |
| POST | `/api/projects/[id]/risks` | Log a risk |

**Risk create payload:**
```json
{
  "title": "Monsoon delay",
  "description": "Heavy rainfall could halt work for 2 weeks",
  "category": "Environmental",
  "probability": "High",
  "impact": "Medium",
  "mitigation": "Build temporary shelter; pre-purchase materials"
}
```
Valid categories: `Technical`, `Financial`, `Environmental`, `Legal`, `Operational`  
Valid probability/impact: `Low` | `Medium` | `High` | `Critical`

---

### Site Survey

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[id]/survey` | Get survey for project |
| POST | `/api/projects/[id]/survey` | Submit survey |

**Survey payload:**
```json
{
  "accessibility": "Good",
  "powerAvailable": true,
  "waterAvailable": false,
  "terrainNotes": "Rocky soil, requires special drilling",
  "surveyorComments": "Site is ready for construction",
  "affectsBudget": true,
  "recommendedBudget": 6500000,
  "budgetReason": "Rocky terrain requires additional excavation"
}
```
> If `affectsBudget: true`, `POST /api/projects/[id]/budget-request` can be sent to notify approver.

---

## Frontend Fixes Applied (this phase)

| File | Bug | Fix |
|------|-----|-----|
| `IssueModal.tsx` | `members?.map(m => m.user)` → always `undefined` if members are flat user objects | Changed to `m.user \|\| m` to handle both nested and flat structures |

---

## Test Scenarios

### 07-A — Report an Issue
1. Issues & Snags tab → "Report Issue"
2. Fill title, description, priority, category; assign to a team member
3. Submit
4. **Assert:** `POST /api/projects/[id]/issues` with `type: "Issue"` returns `201`
5. **Assert:** Issue appears in Issues list
6. **Assert:** Assigned member's name shows correctly in card (not blank)

### 07-B — Report a Snag
1. "Report Snag" button
2. **Assert:** Category auto-set to `"Snag"`, `type: "Snag"` in payload
3. **Assert:** Snag appears in Snags tab

### 07-C — Issue Detail
1. Click on an issue card
2. **Assert:** Detail modal opens with full description, assigned user, status
3. Update status to "In Progress"
4. **Assert:** PATCH called, status badge updates

### 07-D — Log a Risk
1. Risks tab → "Identify Risk"
2. Fill risk details
3. Submit
4. **Assert:** `POST /api/projects/[id]/risks` returns `201`
5. **Assert:** Risk card shows probability × impact score

### 07-E — Site Survey Submission
1. Site Survey tab → "Submit Survey"
2. Fill accessibility, utilities, notes; toggle "Affects Budget" on
3. Submit
4. **Assert:** `POST /api/projects/[id]/survey` returns `201`
5. **Assert:** Survey details display in tab
6. **Assert:** Budget request option appears if `affectsBudget: true`

### 07-F — Escalation Matrix
1. Risks tab → open Escalation Matrix
2. Configure escalation contacts
3. **Assert:** `POST /api/projects/[id]/escalation-matrix` called

---

## Frontend Fixes Applied (this phase)

| File | Bug | Fix |
|------|-----|-----|
| `SurveyModal.tsx` | Sent `{ powerAvailable, waterAvailable, terrainNotes, surveyorComments, recommendedBudget }` — SiteSurvey model uses different field names | Remapped to `{ powerAvailability, waterAvailability, terrainType, notes, budgetRecommendation }` in payload; boolean → `'Available'/'Not Available'` string for availability fields |

---

## Known Observations

| Item | Notes |
|------|-------|
| `assignedTo: ""` | API cleans up empty string — safe to send `""` for unassigned |
| `notifyTeam: true` | Passed through `...body` spread; API email logic may not use it |
| Survey auto-advances project | `POST /api/projects/[id]/survey` sets project status to `"Planning"` automatically |
| `assigned-snagging` | `GET /api/projects/assigned-snagging` lists snags assigned to current user across all projects |
