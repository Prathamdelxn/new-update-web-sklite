# Sky-Lite Web — Development Status

> **API Base (prod):** `https://v2-lite-backend-saas-dtw3.vercel.app/api`  
> **API Base (local):** `http://localhost:3000/api`  
> **Socket URL:** `https://socket-7ezc.onrender.com`  
> **Cloudinary cloud:** `dfyu429bz`  
> **Web Stack:** Next.js · TypeScript · Tailwind CSS v4 · React 19  
> **Reference App:** `C:\2026\v2\sky-lite` (React Native / Expo — same backend, same APIs)  
> **Last updated:** 2026-05-06  
> **Legend:** ✅ Done · ⬜ Pending

---

## Design System (Active — Light Theme)

The entire UI has been migrated to a **light theme**. All components use the following tokens:

| Token | Value |
|-------|-------|
| Page background | `bg-[#F8FAFF]` |
| Card background | `bg-white` |
| Card border | `border border-gray-200` |
| Primary heading | `text-gray-900` |
| Secondary text | `text-slate-500` |
| Primary button | `bg-blue-600 hover:bg-blue-500 text-white` |
| Input fields | `bg-gray-50 border border-gray-200 text-gray-900` |
| Success badge | `text-emerald-700 bg-emerald-100 border-emerald-200` |
| Danger badge | `text-red-700 bg-red-100 border-red-200` |
| Warning badge | `text-amber-700 bg-amber-100 border-amber-200` |
| Card radius | `rounded-2xl` |
| Font | Inter |

> **No dark theme classes remain** in any `.tsx` file. `bg-slate-9xx`, `border-white/5`, `bg-white/[0.0x]` have all been removed.

---

## Phase 0 — Foundation & Infrastructure

| # | Task | Status | Notes |
|---|------|--------|-------|
| 0.1 | `.env.local` — `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_CLOUDINARY_*` | ✅ | Both `.env.local` (localhost) and `.env.production` (deployed) created |
| 0.2 | `src/lib/api.ts` — Axios wrapper, attaches Bearer token from localStorage | ✅ | Request interceptor attaches token |
| 0.3 | HTTP interceptor — auto-refresh access token on 401 via `POST /auth/refresh` | ✅ | Response interceptor handles 401, retries, redirects to `/login` on failure |
| 0.4 | `src/types/index.ts` — TypeScript interfaces for all API models | ✅ | All 21 models defined: User, Role, Organization, Project, BOQItem, Material, MaterialRequest, MaterialPurchase, MaterialReceipt, MaterialUsage, Issue, Snag, Risk, Milestone, MilestoneTask, Transaction, Template, TemplateCategory, SiteSurvey, WorkProgress, PlanFolder, PlanDocument |
| 0.5 | `src/context/AuthContext.tsx` — user/token state + login/logout/register | ✅ | Token stored in localStorage + cookie (for middleware) |
| 0.6 | `src/context/ToastContext.tsx` — global toast (success/error/info/loading) | ✅ | Via `react-hot-toast` |
| 0.7 | `src/context/SocketContext.tsx` — socket.io-client singleton | ✅ | Connects with `auth: { token }`, exposes `joinProject`/`leaveProject` |
| 0.8 | `src/middleware.ts` — route protection (redirect → /login) | ✅ | Reads cookie `token`, redirects unauthenticated users |
| 0.9 | Root providers wrapper | ✅ | `AuthProvider → ToastProvider → SocketProvider` in `app/layout.tsx` |
| 0.10 | Inter font via `next/font/google` | ✅ | Loaded with CSS variable |
| 0.11 | Global gradient background orbs | ✅ | Blue top-right, purple bottom-left in `app/layout.tsx` |
| 0.12 | `GlassCard` component | ✅ | `src/components/ui/GlassCard.tsx` — `bg-white border border-gray-200 shadow-sm rounded-2xl` |
| 0.13 | Sidebar + topnav shell layout with mobile drawer | ✅ | `Shell.tsx` + `Sidebar.tsx` + `Topnav.tsx` |
| 0.14 | `ConfirmModal` component | ✅ | `src/components/ui/ConfirmModal.tsx` — danger/success/info variants |
| 0.15 | Toast component (auto-dismiss) | ✅ | Via `react-hot-toast` |

---

## Phase 1 — Authentication

> **API routes:** `POST /api/auth/login`, `/register`, `/refresh`, `/logout`

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.1 | `/login` page — email + password, show/hide toggle | ✅ | `app/login/page.tsx` |
| 1.2 | Store `token` + `refreshToken` in localStorage + cookie | ✅ | Cookie used by middleware for SSR route guard |
| 1.3 | `/register` page — validation, password match | ✅ | `app/register/page.tsx` |
| 1.4 | Logout — clear tokens + call `POST /auth/logout` API | ⬜ | Client-side clear is done; the API call to `/auth/logout` is **not made** — add `api.post('/auth/logout')` before clearing tokens in `AuthContext.tsx` |
| 1.5 | Silent refresh on app load | ✅ | Axios 401 interceptor handles it |
| 1.6 | Onboarding / welcome page | ✅ | `app/onboarding/page.tsx` — 3-slide framer-motion carousel |

---

## Phase 2 — Projects (Core)

> **API routes:** `GET/POST /api/projects`, `GET/PATCH /api/projects/:id`

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.1 | `/projects` — grid with search + status filter | ✅ | `app/projects/page.tsx` |
| 2.2 | Create project modal — all fields | ✅ | `src/components/ui/CreateProjectModal.tsx` |
| 2.3 | `/projects/[id]` — workspace with 14 scrollable tab pills | ✅ | `app/projects/[id]/page.tsx` |
| 2.4 | Project Details tab — info, status, dates, members | ✅ | Inline in `[id]/page.tsx` |
| 2.5 | Project status change (9 statuses) | ✅ | Inline `<select>` calls `PATCH /projects/:id` |
| 2.6 | Edit project inline form | ⬜ | **Pending.** Details tab is read-only. Need to add an "Edit" button that opens a pre-filled version of `CreateProjectModal` (or an inline edit form) for name, description, client, dates, priority. Wire to `PATCH /projects/:id`. |
| 2.7 | Snagging notification for assigned users | ⬜ | **Pending.** Not implemented. |

---

## Phase 3 — BOQ & Budget

> **API routes:** `/api/projects/:id/boq/*`, `/api/projects/:id/budget-*`

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | BOQ tab — table grouped by `groupName` | ✅ | `src/components/project/BOQTab.tsx` |
| 3.2 | Add / edit BOQ item modal | ✅ | `src/components/project/BOQModal.tsx` |
| 3.3 | BOQ status chip — Draft/Pending/Approved/Rejected | ✅ | Color-coded badges |
| 3.4 | Bulk status update for BOQ items | ⬜ | **Pending.** No multi-select or bulk action implemented. |
| 3.5 | Excel import for BOQ | ✅ | `src/components/project/BOQImportModal.tsx` |
| 3.6 | BOQ history timeline modal | ⬜ | **Pending.** Backend tracks versions but no UI built. Use `GET /projects/:id/boq/:itemId/history`. |
| 3.7 | BOQ approvers assignment | ⬜ | **Pending.** Add "Request Approval" that sends approver ID to `PATCH /projects/:id/boq/:itemId` with `requestedApprover` field. |
| 3.8 | Budget request form | ✅ | `src/components/project/BudgetTab.tsx` |
| 3.9 | Budget approve / reject | ✅ | Actions in `BudgetTab` |
| 3.10 | Budget approvers management | ⬜ | **Pending.** No way to assign who can approve budgets. |
| 3.11 | Budget history log display | ✅ | History timeline in `BudgetTab` |

---

## Phase 4 — Material Management

> **API routes:** `/api/projects/:id/materials`, `/api/material-requests/*`, `/api/material-purchase/*`, `/api/material-receipts/*`, `/api/material-usage/*`

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.1 | Materials inventory table per project | ✅ | `src/components/project/MaterialsTab.tsx` |
| 4.2 | Add material + stock in/out form | ✅ | `src/components/project/MaterialModal.tsx` |
| 4.3 | Bulk material action | ⬜ | **Pending.** No bulk select/update. |
| 4.4 | Material request form | ✅ | `src/components/project/MaterialRequestModal.tsx` |
| 4.5 | Material requests list with status filter | ✅ | Requests sub-tab in `MaterialsTab` |
| 4.6 | Material request approve/reject | ✅ | Actions in requests list |
| 4.7 | Purchase order form | ✅ | `src/components/project/MaterialPurchaseModal.tsx` |
| 4.8 | Purchase orders list with payment status | ✅ | Sub-tab in `MaterialsTab` |
| 4.9 | Purchase order detail + status update | ✅ | Status update in list |
| 4.10 | Material receipt form | ✅ | `src/components/project/MaterialReceiptModal.tsx` |
| 4.11 | Receipts list — Pending/Verified/Rejected | ✅ | GRN sub-tab in `MaterialsTab` |
| 4.12 | Material usage log | ✅ | `src/components/project/MaterialUsageModal.tsx` |
| 4.13 | Usage list with verification status | ✅ | Usage Log sub-tab in `MaterialsTab` |

---

## Phase 5 — Document & Plan Management

> **API routes:** `/api/projects/:id/documents`, `/api/projects/:id/folders/*`

| # | Task | Status | Notes |
|---|------|--------|-------|
| 5.1 | Plan folders list + create folder | ✅ | `src/components/project/PlansTab.tsx` |
| 5.2 | Folder detail — upload documents, file list | ✅ | File upload in `PlanRoom.tsx` |
| 5.3 | Document viewer (canvas-based with zoom) | ✅ | `src/components/project/DocumentViewer.tsx` |
| 5.4 | Plan annotation tool (draw/pen on canvas overlay) | ⬜ | **Pending.** The canvas exists in `DocumentViewer.tsx` but pen drawing only works in a basic form — rect/circle/text tools do nothing yet. Need to implement actual shape drawing on `mousedown`/`mouseup`. |
| 5.5 | Document approval workflow | ✅ | Send for approval, approve, reject actions in `PlanRoom.tsx` |
| 5.6 | Plan approvers assignment | ⬜ | **Pending.** Currently hardcodes `user.id` as the only approver. Need a proper approver picker. |
| 5.7 | Documents list with approval status badges | ✅ | Status badges in `PlanRoom.tsx` |

---

## Phase 6 — Issues, Snags & Risks

> **API routes:** `/api/projects/:id/issues`, `…/snags`, `…/risks`

| # | Task | Status | Notes |
|---|------|--------|-------|
| 6.1 | Issues list — filter by status, priority | ✅ | `src/components/project/IssuesTab.tsx` (shared for Issues + Snags tabs) |
| 6.2 | Create / edit issue/snag form | ✅ | `src/components/project/IssueModal.tsx` |
| 6.3 | Issue detail — full history, escalation, resolution | ⬜ | **Pending.** Only inline status update. No dedicated detail modal/page. Use `GET /projects/:id/issues/:issueId`. |
| 6.4 | Issue status update | ✅ | PATCH in `IssuesTab` |
| 6.5 | Snags list (kanban or table) | ✅ | Handled by `IssuesTab` pointing at `/snags` endpoint |
| 6.6 | Create / edit snag | ✅ | Handled by `IssueModal` |
| 6.7 | Snag detail — resolution notes, image gallery, history | ⬜ | **Pending.** Same as issue detail — no dedicated view. |
| 6.8 | Snag status update | ✅ | PATCH in `IssuesTab` |
| 6.9 | Risk register list — filter by status, category | ✅ | `src/components/project/RisksTab.tsx` |
| 6.10 | Create / edit risk | ✅ | Form within `RisksTab` |
| 6.11 | Risk detail — mitigation progress, history | ⬜ | **Pending.** No detail view. Need to show `risk.history` array and editable `mitigationProgress` slider. |
| 6.12 | Escalation matrix configuration | ⬜ | **Pending.** Not implemented. |

---

## Phase 7 — Progress & Milestones

> **API routes:** `/api/projects/:id/milestones`, `…/work-progress`, `…/survey`

| # | Task | Status | Notes |
|---|------|--------|-------|
| 7.1 | Milestones list | ✅ | `src/components/project/MilestonesTab.tsx` |
| 7.2 | Create / edit milestone | ✅ | Form within `MilestonesTab` |
| 7.3 | Milestone task checklist | ⬜ | **Pending.** Each `Milestone` has a `tasks[]` array. Need to render task cards with check/uncheck toggle (`PATCH /projects/:id/milestones/:milestoneId` with updated tasks). |
| 7.4 | Work progress log form (Daily Progress Report) | ✅ | `src/components/project/DPRTab.tsx` + `DPRModal.tsx` |
| 7.5 | Work progress list + photo gallery | ✅ | List in `DPRTab` |
| 7.6 | Progress summary widget (overall % complete) | ⬜ | **Pending.** Static placeholder — no real calculation from DPR entries. |
| 7.7 | Timeline / Gantt view | ⬜ | **Pending.** Tab exists but shows "Coming Soon". Use a library like `react-gantt-chart` or `gantt-task-react`. Data comes from milestones + their due dates. |
| 7.8 | Site survey form | ✅ | `src/components/project/SurveyTab.tsx` + `SurveyModal.tsx` |
| 7.9 | Site survey detail view | ✅ | Detail in `SurveyTab` |

---

## Phase 8 — Financial Tracking

> **API routes:** `/api/projects/:id/transactions`, `/api/transactions`

| # | Task | Status | Notes |
|---|------|--------|-------|
| 8.1 | Project transactions ledger — filter by type (Incoming/Outgoing/Debit/Purchases) | ✅ | `src/components/project/TransactionsTab.tsx` — Finance tab in project workspace |
| 8.2 | Add transaction form — type, amount, date, method, party | ✅ | Bottom sheet form in `TransactionsTab` |
| 8.3 | Transaction delete with confirmation | ✅ | Delete confirm dialog in `TransactionsTab` |
| 8.4 | Global transactions view (across all projects) | ⬜ | **Pending.** No `/finance` page yet. Would need `GET /transactions` (cross-project) and a standalone page. |
| 8.5 | Financial summary widget — net balance, total in/out | ✅ | Three summary cards at the top of `TransactionsTab` |

---

## Phase 9 — Users & Role Management

> **API routes:** `/api/users`, `/api/roles`

| # | Task | Status | Notes |
|---|------|--------|-------|
| 9.1 | Users list — filter/search | ✅ | `src/components/users/UserList.tsx` |
| 9.2 | Onboard user form — name, email, role | ✅ | `src/components/users/UserModal.tsx` |
| 9.3 | User detail / edit | ⬜ | **Pending.** `UserModal` only handles creation. No edit form for existing users — need `PATCH /users/:id`. |
| 9.4 | Deactivate / remove user | ✅ | Delete action in `UserList` |
| 9.5 | Roles list with user counts | ✅ | `src/components/users/RoleList.tsx` |
| 9.6 | Create / edit role | ✅ | `src/components/users/RoleModal.tsx` |
| 9.7 | Permission picker — checkbox grid of `resource:action` strings | ✅ | `RoleModal.tsx` has a 4-group × 4-permission toggle grid covering Projects, BOQ & Budget, Supply Chain, System Admin |
| 9.8 | Delete role (warn if users assigned) | ✅ | Confirmation dialog in `RoleList` |

---

## Phase 10 — Templates

> **API routes:** `/api/templates`, `/api/template-categories`

| # | Task | Status | Notes |
|---|------|--------|-------|
| 10.1 | Template categories list + create | ✅ | `src/components/templates/CategoryList.tsx` |
| 10.2 | Templates list — filter by category | ✅ | `src/components/templates/TemplateList.tsx` |
| 10.3 | Create template — name, category, description, BOQ items | ✅ | `src/components/templates/TemplateModal.tsx` |
| 10.4 | Template detail / preview page | ⬜ | **Pending.** Clicking a template card does nothing. Need a detail modal or route that shows full BOQ items list. Use `GET /templates/:id`. |
| 10.5 | Apply template when creating a project (pre-fills BOQ) | ⬜ | **Pending.** `CreateProjectModal` has no template picker. After project creation, the chosen template's `boqItems` should be posted to `POST /projects/:id/boq`. |

---

## Phase 11 — Real-time (Socket.io)

> **Socket server:** `https://socket-7ezc.onrender.com`

| # | Task | Status | Notes |
|---|------|--------|-------|
| 11.1 | Install `socket.io-client` | ✅ | |
| 11.2 | Singleton socket with `auth: { token }` | ✅ | In `SocketContext.tsx` |
| 11.3 | `useProjectSocket(projectId)` hook | ✅ | `src/hooks/useProjectSocket.ts` — joins on mount, leaves on unmount |
| 11.4 | Live snag/issue refresh | ✅ | `issue:created`, `issue:updated`, `snag:created`, `snag:updated` events |
| 11.5 | Live material alerts | ✅ | `material:updated` event |
| 11.6 | Live progress/budget/milestone updates | ✅ | `boq:updated`, `budget:updated`, `milestones:updated` events |
| 11.7 | Toast on incoming socket events | ✅ | Context-aware success/info toasts |

---

## Phase 12 — SuperAdmin Portal

> **API routes:** `/api/superadmin/*` — separate token-based auth

| # | Task | Status | Notes |
|---|------|--------|-------|
| 12.1 | `/superadmin/login` page | ✅ | `app/superadmin/login/page.tsx` — calls `/superadmin/auth/login` |
| 12.2 | SuperAdmin standalone layout | ✅ | Self-contained layout in `superadmin/dashboard/page.tsx` |
| 12.3 | Admins list + Create Admin button | ✅ | List fetched from `/superadmin/admins`; "Create Admin" button exists but **modal not yet wired** |
| 12.4 | Organization / tenant overview with real data | ⬜ | **Pending.** Stats cards (Active Tenants, Global Users, API Uptime) show **hardcoded values**. Need `GET /superadmin/stats` and replace placeholders. |
| 12.5 | SuperAdmin logout | ✅ | Clears `superadmin_token`, redirects to `/superadmin/login` |

---

## Phase 13 — Dashboards & Analytics

> Client-side aggregation from existing API responses.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 13.1 | Project overview — status distribution, budget summary | ✅ | `src/components/dashboard/OverviewDashboard.tsx` on `/dashboard` |
| 13.2 | Material flow summary — requested / received / consumed | ⬜ | **Pending.** Aggregate across `material-requests`, `material-receipts`, `material-usage` endpoints. |
| 13.3 | Financial dashboard — income / expense chart | ⬜ | **Pending.** Pull from `/transactions` and render a chart (use `recharts` or `chart.js`). |
| 13.4 | Issue & snag heatmap — open vs resolved | ⬜ | **Pending.** Count from `/issues` and `/snags` grouped by status. |
| 13.5 | Milestone completion % across projects | ⬜ | **Pending.** Aggregate from `/milestones` for each project. |
| 13.6 | Risk matrix visualization — impact × probability grid | ⬜ | **Pending.** A 3×4 cell grid color-coded by risk count. |

---

## Cross-Cutting Concerns

| # | Concern | Status | Notes |
|---|---------|--------|-------|
| C1 | CORS — API allows all origins | ✅ | |
| C2 | Token auto-refresh on 401 | ✅ | Axios response interceptor in `src/lib/api.ts` |
| C3 | RBAC — hide UI elements by `user.role.permissions` array | ⬜ | **Pending.** No permission checks anywhere in the UI. Need a `usePermission(key)` hook that reads `user.role.permissions` and hides/disables buttons conditionally. |
| C4 | Cloudinary file/image upload component | ⬜ | **Pending.** `NEXT_PUBLIC_CLOUDINARY_*` env vars are set. No reusable upload component built. Needed for: DPR photos, issue/snag images, site survey attachments. Reference: `C:\2026\v2\sky-lite\app\services\cloudinaryService.js`. |
| C5 | Pagination on all list views | ⬜ | **Pending.** All lists load full data. Add `?page=&limit=` params and render a page selector. |
| C6 | Search + filter on list views | ✅ | Implemented on Projects, BOQ, Issues, Users, Templates |
| C7 | Audit trail display (who changed what + when) | ⬜ | **Pending.** Projects have an `auditTrail` field. No UI to show it. |
| C8 | Mobile-responsive layout | ✅ | Collapsible sidebar drawer, responsive grids throughout |
| C9 | Light theme | ✅ | **Fully migrated.** All 39 `.tsx` files and all `app/**/*.tsx` pages use the light design system. No dark classes remain. |
| C10 | Error states — 403 banner, 500 retry button | ⬜ | **Pending.** 401 redirect is handled. 403/500 responses show nothing to the user. |

---

## Recommended Build Order (Remaining 31 Tasks)

Work through this in sequence — earlier items unblock later ones.

```
PRIORITY 1 — Quick wins (1–2 hours each)
─────────────────────────────────────────
1.  [1.4]  Auth logout API call
           → In AuthContext.tsx logout(), add: await api.post('/auth/logout')
           → Then clear localStorage and cookies

2.  [9.3]  User edit form
           → UserModal.tsx already has fields; add initialData prop (same
             pattern as RoleModal.tsx), wire to PATCH /users/:id

3.  [2.6]  Edit project form
           → Add an Edit button in the Details tab header
           → Re-use CreateProjectModal with pre-filled formData
           → Wire to PATCH /projects/:id

4.  [7.3]  Milestone task checklist
           → In MilestonesTab.tsx, expand each milestone card to show tasks[]
           → Checkbox toggles isCompleted via PATCH /projects/:id/milestones/:id

5.  [12.4] SuperAdmin real stats
           → Replace hardcoded values with GET /superadmin/stats

PRIORITY 2 — Feature completions (half-day each)
─────────────────────────────────────────────────
6.  [10.4] Template detail modal
           → Clicking a template card in TemplateList opens a modal showing
             full BOQ items, category, budget. Use GET /templates/:id.

7.  [10.5] Apply template when creating a project
           → Add a "Use Template" dropdown to CreateProjectModal
           → After project creation, POST /projects/:id/boq with template boqItems

8.  [6.3]  Issue detail modal
           → Add a detail drawer/modal showing issue.history[], escalationLevel,
             resolution fields. Opened from the "View" button on each issue card.

9.  [6.7]  Snag detail modal
           → Same pattern as issue detail above, for /snags endpoint

10. [6.11] Risk detail modal
           → Show risk.history[], editable mitigationProgress slider,
             current status + update action

11. [8.4]  Global finance page
           → New page /finance using GET /transactions (cross-project)
           → Add a nav link in Sidebar.tsx

PRIORITY 3 — Infrastructure (half-day each)
────────────────────────────────────────────
12. [C4]   Cloudinary upload component
           → Build src/components/ui/CloudinaryUpload.tsx
           → Reference: C:\2026\v2\sky-lite\app\services\cloudinaryService.js
           → Used by DPRModal (photos), IssueModal (images), SurveyModal (attachments)

13. [C3]   RBAC permission guards
           → Add hook: src/hooks/usePermission.ts
             → reads user.role.permissions array
             → returns hasPermission(key: string): boolean
           → Wrap sensitive buttons (Delete, Approve, etc.) with disabled={!hasPermission('resource:action')}

14. [C5]   Pagination
           → Add ?page=1&limit=20 to all API calls
           → Add a simple <Pagination> component (Prev/Next + page numbers)
           → Apply to: Projects, Users, BOQ items, Issues, Materials, Transactions

PRIORITY 4 — Enhancements
──────────────────────────
15. [3.7]  BOQ approvers — add "Request Approval" button that sends approver ID
16. [3.6]  BOQ history timeline — modal showing version history for an item
17. [3.4]  Bulk BOQ status update — multi-select checkboxes + bulk action bar
18. [3.10] Budget approvers management
19. [5.4]  Plan annotation canvas — implement rect/circle/text tools in DocumentViewer.tsx
20. [5.6]  Plan approvers picker — let user select approvers before "Send for Approval"
21. [7.6]  Progress summary widget — calculate overall % from DPR entries
22. [7.7]  Timeline / Gantt view — use gantt-task-react; data from milestones
23. [6.12] Escalation matrix config
24. [4.3]  Bulk material actions
25. [2.7]  Snagging notification for assigned users

PRIORITY 5 — Analytics & Polish
─────────────────────────────────
26. [13.2] Material flow dashboard widget
27. [13.3] Financial dashboard chart (recharts)
28. [13.4] Issue & snag heatmap
29. [13.5] Milestone completion % widget
30. [13.6] Risk matrix grid visualization
31. [C7]   Audit trail display
32. [C10]  403 / 500 error state components
```

---

## Progress Summary

| Phase | Total | Done | Pending |
|-------|-------|------|---------|
| 0 — Foundation | 15 | 15 | 0 |
| 1 — Auth | 6 | 5 | 1 |
| 2 — Projects | 7 | 5 | 2 |
| 3 — BOQ & Budget | 11 | 7 | 4 |
| 4 — Materials | 13 | 12 | 1 |
| 5 — Documents & Plans | 7 | 5 | 2 |
| 6 — Issues / Snags / Risks | 12 | 8 | 4 |
| 7 — Progress & Milestones | 9 | 6 | 3 |
| 8 — Financial Tracking | 5 | 4 | 1 |
| 9 — Users & Roles | 8 | 7 | 1 |
| 10 — Templates | 5 | 3 | 2 |
| 11 — Real-time | 7 | 7 | 0 |
| 12 — SuperAdmin | 5 | 4 | 1 |
| 13 — Dashboards | 6 | 1 | 5 |
| **Cross-cutting** | 10 | 5 | 5 |
| **TOTAL** | **126** | **99** | **32** |

---

## Key Reference Files

Use these React Native files in `C:\2026\v2\sky-lite\app\` as implementation references for the pending tasks above:

| Feature to build | Reference file |
|-----------------|----------------|
| Cloudinary upload | `services/cloudinaryService.js` |
| Permission hooks | `user-management/permissions.jsx` + `components/ModulePermissionCard.jsx` |
| Timeline / Gantt | `project/[id]/timeline.jsx` |
| Issue / Snag detail | `project/[id]/issues.jsx` (detail modal pattern) |
| Milestone checklist | `project/[id]/milestones.jsx` |
| Financial dashboard | `(tabs)/payment/index.jsx` |
| Template apply flow | `create-template.jsx` + `create-project.jsx` |
| Plan annotation | `annotate-plan.jsx` |
| Escalation matrix | `project/[id]/issues.jsx` (escalation section) |
| Audit trail | `project/[id]/index.jsx` (auditTrail display) |
