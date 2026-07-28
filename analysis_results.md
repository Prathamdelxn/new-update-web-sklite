# Web Feature Parity & API Integration Audit Report

This report presents a detailed analysis of the feature parity gaps between the **Skylite Mobile App** (`sky-lite`) and the **Web Platform** (`sky-lite-web`), cross-referenced with the backend endpoints of the shared **Skylite API** (`sky-lite-api`). 

---

## 1. Summary of Gaps

While the web platform has a robust foundation (Authentication, JWT Token Refreshing, and WebSockets), several crucial features and workflows from the mobile app are completely or partially missing. 

1. **Attendance Module (GPS & Geofencing)**: Completely missing in the web UI.
2. **Registration Verification (OTP)**: The web registration flow is broken because it skips the verification endpoint (`POST /api/auth/register/verify`), meaning created users are never finalized in the database.
3. **Password Reset (Verification/Save)**: Only forgot-password request is sent; the actual reset action is not integrated.
4. **Approval Action workflows**: Compliance documents, plans, and budget variations lack frontend actions to call their respective approval endpoints.
5. **Quality and Progress details**: Detailed views and check-lists for Issues, Snags, Risks, and Milestones are either missing or display static placeholders.
6. **Cross-project Finance & Dashboards**: Aggregate dashboard widgets, heatmaps, and financial transaction sheets are not yet implemented.

---

## 2. API Integration Audit

Below is the verification of the backend endpoints in `sky-lite-api` and their current integration status in the `sky-lite-web` client.

### 🔴 Completely Unintegrated Endpoints
These backend routes exist and are fully functional, but are **never invoked** by the web frontend.

| Method | Endpoint | Description | Mobile Parity equivalent |
|--------|----------|-------------|-------------------------|
| `POST` | `/api/auth/register/verify` | Finalizes user/organization creation via OTP. | Registration completion screen. |
| `POST` | `/api/auth/reset-password` | Resets user password using reset token. | Password recovery completion. |
| `POST` | `/api/attendance/check-in` | Performs a geofenced check-in with GPS coordinates. | Attendance screen check-in button. |
| `PUT`  | `/api/attendance/check-out` | Performs check-out and computes daily working hours. | Attendance screen check-out button. |
| `GET`  | `/api/attendance/monthly` | Retrieves monthly attendance log history. | Monthly calendar logs. |
| `GET`  | `/api/attendance/today` | Fetches active attendance record for today. | Current check-in status. |
| `GET`  | `/api/projects/assigned-snagging` | Finds projects "Under Snagging" assigned to current user. | Snagging notifications. |
| `PATCH`| `/api/projects/:id/documents/:docId/action` | Approves or Rejects a compliance document. | Document review buttons. |
| `PATCH`| `/api/projects/:id/budget-action` | Approves or Rejects a budget variation request. | Budget review panel. |
| `POST` | `/api/projects/:id/budget-request` | Requests budget revision from a Site Survey. | Survey validation budget requests. |
| `GET`  | `/api/projects/:id/budget-approvers` | Gets project members with budget approval permissions. | Budget revision approver picker. |
| `GET`  | `/api/projects/:id/plan-approvers` | Gets project members with plan approval permissions. | Plan revision approver picker. |
| `POST` | `/api/projects/:id/materials/bulk-action` | Applies bulk operations (delete/status update) on materials. | Material list multi-select actions. |
| `GET`  | `/api/projects/:id/work-progress/summary` | Compiles daily, 7-day, and 4-week DPR summaries. | DPR capacity charts. |
| `POST` | `/api/users/push-token` | Registers Expo push tokens for notifications. | Mobile push notifications support. |

---

### 🟡 Partially Integrated Endpoints
These endpoints are requested by the web client, but their underlying features are incomplete in the UI.

| Method | Endpoint | Description | Integration Gap |
|--------|----------|-------------|-----------------|
| `PATCH`| `/api/projects/:id` | Updates project metadata (dates, priority, status). | Used to change status, but the project details tab remains **read-only**. Needs a pre-filled edit form. |
| `GET`  | `/api/projects/:id/folders/:folderId/annotations` | Gets blueprint PDF canvas drawings. | Annotations are loaded, but the canvas editor tools (rect, circle, text) are currently non-functional client-side. |
| `POST` | `/api/projects/:id/materials` | Adds material inventory records. | Missing geolocation validation. The web UI does not request geolocation coordinates, risking backend rejection. |

---

## 3. High-Priority Web Feature Parity Roadmap

To achieve full feature parity with the Skylite mobile app, the remaining development work on the web frontend is categorized into the following prioritized modules:

### Phase 1: Authentication & Workspace Setup (High Priority)
*   **OTP Verification Screen**: Introduce an OTP input step immediately after submitting `/register` page to call `POST /api/auth/register/verify`.
*   **Password Reset Page**: Create `/reset-password` page to handle tokens sent via email links and call `POST /api/auth/reset-password`.

### Phase 2: Attendance & Site Verification (High Priority)
*   **Attendance Tab**: Implement a geolocation-enabled attendance tab using the HTML5 Geolocation API, calling `GET /attendance/today` to manage status, and triggering `/attendance/check-in` & `/attendance/check-out`.

### Phase 3: Quality Control & Approvals (Medium Priority)
*   **Document & Budget Approvals**: 
    *   Add an "Approval" state/badge column in `DocumentsTab.tsx` and wire Approve/Reject buttons to `/projects/:id/documents/:docId/action`.
    *   Integrate `/projects/:id/budget-action` into `BudgetTab.tsx` so managers can approve or reject variations directly.
*   **Approver Selection Modal**: Replace hardcoded approver selectors with pickers querying `/projects/:id/budget-approvers` and `/projects/:id/plan-approvers`.

### Phase 4: Project Progress & Analytics (Medium Priority)
*   **Milestone Sub-tasks Checklist**: List and toggle individual tasks within milestones.
*   **DPR capacity widgets**: Query `/work-progress/summary` to show progress charts (weekly, monthly capacity) instead of hardcoded placeholders.
*   **Global Financial Page**: Implement the `/finance` ledger to query cross-project transactions.
*   **Tenant Administration**: Replace SuperAdmin dashboard hardcoded numbers with a call to `GET /superadmin/stats`.

### Phase 5: Reusable Controls (Low Priority)
*   **Cloudinary Upload Component**: Build a clean, drag-and-drop Cloudinary component showing upload progress.
*   **RBAC Permission Guard (`usePermission` Hook)**: Guard buttons (like "Delete" or "Approve") based on user roles and permissions.
*   **Pagination Controls**: Add list page selectors utilizing backend query parameters `?page=&limit=`.
