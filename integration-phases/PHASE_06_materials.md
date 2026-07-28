# Phase 06 — Materials & Supply Chain

**Status:** ✅ Audited — 3 bugs fixed (bulk-action payload, purchase item field, usage field names)  
**Depends on:** Phase 03 (need project ID)

---

## Scope

| Area | Detail |
|------|--------|
| Frontend | Project workspace → Materials tab |
| API routes | `/api/projects/[id]/materials`, `/api/projects/[id]/materials/bulk-action`, `/api/projects/[id]/material-requests`, `/api/projects/[id]/material-purchase`, `/api/projects/[id]/material-receipts`, `/api/projects/[id]/material-usage` |
| Components | `MaterialsTab.tsx`, `MaterialModal.tsx`, `MaterialRequestModal.tsx`, `MaterialPurchaseModal.tsx`, `MaterialReceiptModal.tsx`, `MaterialUsageModal.tsx` |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[id]/materials` | List all materials (inventory) |
| POST | `/api/projects/[id]/materials` | Create material |
| PATCH | `/api/projects/[id]/materials` | Update material |
| POST | `/api/projects/[id]/materials/bulk-action` | Stock-in / Stock-out |
| GET/POST | `/api/projects/[id]/material-requests` | Material requests |
| GET/POST | `/api/projects/[id]/material-purchase` | Purchase orders |
| GET/POST | `/api/projects/[id]/material-receipts` | GRN (goods receipt) |
| GET/POST | `/api/projects/[id]/material-usage` | Usage logs |

**Create material payload:**
```json
{ "name": "Cement (OPC 53)", "unit": "Bags", "initialStock": 500 }
```

**Bulk-action payload (stock-in or stock-out):**
```json
{ "materialIds": ["<id>"], "actionType": "In", "quantity": 100, "note": "New delivery" }
```
`actionType`: `"In"` (stock-in) | `"Out"` (stock-out)

---

## Test Scenarios

### 06-A — Add Material to Inventory
1. Materials tab → "Add Material"
2. Fill: name, unit, initial stock
3. **Assert:** `POST /api/projects/[id]/materials` called
4. **Assert:** Material card appears with stock level

### 06-B — Stock In
1. Click "+" on a material → Stock In modal
2. Enter quantity and note
3. **Assert:** `POST /api/projects/[id]/materials/bulk-action` with `{ actionType: "In" }`
4. **Assert:** Stock level increases

### 06-C — Stock Out
1. Click "−" on a material → Stock Out modal
2. **Assert:** Stock level decreases
3. **Assert:** Stock cannot go below 0 (should show error)

### 06-D — Material Request
1. "Request Materials" → fill request form
2. **Assert:** `POST /api/projects/[id]/material-requests` called

### 06-E — Purchase Order
1. Create a purchase order for a vendor
2. **Assert:** PO saved and listed

### 06-F — Goods Receipt (GRN)
1. Record material receipt against a PO
2. **Assert:** Receipt saved, inventory updated

### 06-G — Material Usage Log
1. Log usage of a material
2. **Assert:** Usage entry saved, available stock decremented

---

## Frontend Fixes Applied (this phase)

| File | Bug | Fix |
|------|-----|-----|
| `MaterialModal.tsx` | Stock-in/out sent `{ actionType, materialIds, quantity, note }` — API expects `{ type, items: [{materialId, quantity, note}] }` | Restructured payload; also changed `'In'/'Out'` → `'Received'/'Used'` so inventory totals actually update |
| `MaterialPurchaseModal.tsx` | Item field `rate` used — API reads `unitPrice` (totalPrice computed as `qty * unitPrice`) | Renamed `rate` → `unitPrice` in state and payload |
| `MaterialPurchaseModal.tsx` | Top-level `advancePaid` sent — API reads `advancePayment` (determines payment status) | Renamed to `advancePayment` |
| `MaterialUsageModal.tsx` | Sent `location` + `notes` — API reads `locationOrTask` + `commonNote` | Remapped to correct field names in payload |

---

## Dead UI (API route missing)

| Feature | Frontend action | API status |
|---------|-----------------|------------|
| Material request approval | `PATCH /material-requests/:id` or `bulk-status` | Only GET + POST exist — no update routes |
| Receipt verify button | `PATCH /material-receipts/:id` | Only GET + POST exist; receipts auto-verify on creation |

---

## Known Observations

| Item | Notes |
|------|-------|
| `initialStock` vs `quantity` | Create uses `initialStock`; stock movements use `quantity` in bulk-action `items[]` |
| Receipts auto-verified | API sets `status: "Verified"` immediately on POST; no separate verify step |
| `inventory:*` permission | Most inventory routes require `inventory:view` / `inventory:create` etc. |
