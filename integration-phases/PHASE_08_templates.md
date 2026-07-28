# Phase 08 — Templates & Categories

**Status:** ✅ Audited — clean, no bugs found  
**Depends on:** Phase 01 (auth token)

---

## Scope

| Area | Detail |
|------|--------|
| Frontend pages | `http://localhost:3001/templates` |
| API routes | `GET/POST /api/templates`, `GET/PATCH/DELETE /api/templates/[id]`, `GET/POST /api/template-categories`, `GET/PATCH/DELETE /api/template-categories/[id]` |
| Components | `src/components/templates/TemplateList.tsx`, `TemplateModal.tsx`, `TemplateDetailModal.tsx`, `CategoryList.tsx` |

---

## API Endpoints

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List all templates for the org |
| POST | `/api/templates` | Create a new template |
| GET | `/api/templates/[id]` | Get single template |
| PATCH | `/api/templates/[id]` | Update template |
| DELETE | `/api/templates/[id]` | Delete template |

**Create payload:**
```json
{
  "name": "Luxury 3BHK",
  "description": "Premium 3-bedroom apartment template",
  "category": "<categoryId>",
  "area": 1800,
  "estimatedDays": 365,
  "maxBudget": 8000000,
  "milestones": ["Foundation", "Structure", "Finishing"],
  "checklistItems": ["Site survey done", "Permits obtained"]
}
```

---

### Template Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/template-categories` | List all categories for the org |
| POST | `/api/template-categories` | Create a category |
| PATCH | `/api/template-categories/[id]` | Update category |
| DELETE | `/api/template-categories/[id]` | Delete category |

**Create payload:** `{ "name": "Residential", "description": "...", "icon": "Home" }`

---

## Test Scenarios

### 08-A — Create Template Category
1. Navigate to `http://localhost:3001/templates`
2. Go to Categories tab → "Add Category"
3. Enter name: "Residential"
4. **Assert:** `POST /api/template-categories` returns `201`
5. **Assert:** Category appears in list and in project creation modal Step 1

### 08-B — Create Template
1. "Create Template" → select category
2. Fill name, area, estimated days, max budget
3. **Assert:** `POST /api/templates` returns `201`
4. **Assert:** Template appears in list

### 08-C — Template used in Project Creation
1. Create a new project (Phase 03 flow)
2. Select the category created in 08-A, then select the template
3. **Assert:** Form pre-fills from template (`area`, `budget`, `name`)
4. **Assert:** `payload.templateId` sent in `POST /api/projects`

### 08-D — Edit / Delete Template
1. Edit template name and budget
2. **Assert:** `PATCH /api/templates/[id]` called
3. Delete template
4. **Assert:** Template removed from list and no longer appears in project creation

---

## Known Observations

| Item | Notes |
|------|-------|
| Templates are org-scoped | Templates only visible to the creating org |
| Category is required | Template POST requires a valid `category` ID |
