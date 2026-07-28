# Phase 05 — BOQ & Budget

**Status:** ✅ Audited — 1 bug fixed (bulk-status payload key)  
**Depends on:** Phase 03 (need project ID)

---

## Scope

| Area | Detail |
|------|--------|
| Frontend | Project workspace → BOQ tab, Budget tab |
| API routes | `/api/projects/[id]/boq`, `/api/projects/[id]/boq/[itemId]`, `/api/projects/[id]/boq/[itemId]/status`, `/api/projects/[id]/boq/bulk-status`, `/api/projects/[id]/boq/import`, `/api/projects/[id]/boq-approvers`, `/api/projects/[id]/budget-request`, `/api/projects/[id]/budget-action` |
| Components | `BOQTab.tsx`, `BOQModal.tsx`, `BOQImportModal.tsx`, `BOQHistoryModal.tsx`, `BOQApproversModal.tsx`, `BudgetTab.tsx` |

---

## BOQ API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[id]/boq` | List BOQ items (`isLatest: true`) |
| POST | `/api/projects/[id]/boq` | Add item(s) — body: `{ items: [{...}] }` |
| PATCH | `/api/projects/[id]/boq/[itemId]` | Update item (creates new version, marks old as not latest) |
| DELETE | `/api/projects/[id]/boq/[itemId]` | Delete item |
| PATCH | `/api/projects/[id]/boq/[itemId]/status` | Change approval status |
| POST | `/api/projects/[id]/boq/bulk-status` | Bulk status change |
| POST | `/api/projects/[id]/boq/import` | CSV/Excel import |

**BOQ item create payload:**
```json
{
  "items": [{
    "groupName": "Civil Works",
    "itemNumber": "CW-01",
    "itemDescription": "Excavation",
    "unit": "Cu.m",
    "quantity": 100,
    "unitCost": 500,
    "remark": ""
  }]
}
```
`totalCost` is auto-computed as `quantity * unitCost`.  
BOQ uses version history — PATCH creates a new version with `isLatest: true`, old version gets `isLatest: false`.

---

## Budget API

Budget changes go through `PUT /api/projects/[id]` with `{ newBudget, budgetReason }`.  
Budget is stored as an array `project.budgetHistory[]` — latest entry is the current budget.

**Budget update payload:**
```json
{ "newBudget": "6000000", "budgetReason": "Client-requested scope change" }
```

---

## Test Scenarios

### 05-A — Add BOQ Item
1. Open project workspace → BOQ tab → "Add Item"
2. Fill group name, description, qty, unit cost
3. Save
4. **Assert:** `POST /api/projects/[id]/boq` called with `{ items: [item] }`
5. **Assert:** Item appears in BOQ grouped by `groupName`
6. **Assert:** Total cost auto-calculated and shown

### 05-B — Edit BOQ Item (creates new version)
1. Click edit on a BOQ item
2. Change quantity or unit cost
3. Save
4. **Assert:** `PATCH /api/projects/[id]/boq/[itemId]` called
5. **Assert:** Item updated; old version stored in history

### 05-C — BOQ Version History
1. Click history icon on an item
2. **Assert:** Previous versions listed with timestamps and values

### 05-D — Delete BOQ Item
1. Delete a BOQ item
2. **Assert:** `DELETE /api/projects/[id]/boq/[itemId]` called
3. **Assert:** Item removed from list

### 05-E — Update Project Budget
1. Open Budget tab → "Update Budget"
2. Enter new budget amount and reason
3. Save
4. **Assert:** `PUT /api/projects/[id]` called with `{ newBudget, budgetReason }`
5. **Assert:** Budget history table shows new entry
6. **Assert:** Current budget amount updated in summary cards

### 05-F — BOQ Import
1. Download template (if available), prepare CSV/Excel
2. Upload via BOQ Import modal
3. **Assert:** Items appear in BOQ list after import

### 05-G — BOQ Approvers
1. Open BOQ Approvers modal
2. Select team members as approvers
3. **Assert:** Approvers saved to project

---

## Frontend Fixes Applied (this phase)

| File | Bug | Fix |
|------|-----|-----|
| `BOQTab.tsx` | Bulk-status PATCH sent `ids` — API expects `itemIds` | Changed `ids:` → `itemIds:` in payload |

---

## Dead UI (API route missing)

| Feature | Frontend action | API status |
|---------|-----------------|------------|
| BOQ Approvers modal | PATCH item with `{ approvers: [] }` | BOQ PATCH ignores unknown fields — approvers not saved |

---

## Known Observations

| Item | Notes |
|------|-------|
| BOQ versioning | PATCH creates a new document with `isLatest: true`; old doc set to `isLatest: false` |
| Budget request email | `POST /api/projects/[id]/budget-request` sends email to approver if survey affects budget |
| Budget action | `POST /api/projects/[id]/budget-action` — approver approves/rejects the budget change |
