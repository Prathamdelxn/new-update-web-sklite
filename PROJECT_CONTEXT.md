# PROJECT_CONTEXT.md

*Generated on: 2026-08-27*
*Repository: SKYLITE Web / Interior-OS Project Platform*

---

## 1. Project Overview

### Project Name
**SKYLITE Web** (incorporating the **Interior-OS Client Module**)  
*Package Name in `package.json`*: `skystrcut` (Version 0.1.0)

### Purpose of the Interior Project
The Interior project is an enterprise-grade Web Application (Command Center & CRM platform) engineered specifically for **interior design companies, turn-key interior execution firms, site management teams, commercial estimators, and clients**. It provides end-to-end management of the entire interior project lifecycle—from initial lead capture, requirement gathering, and quotation generation to Work Breakdown Structure (WBS), itemized Bill of Quantities (BOQ), material procurement, Daily Progress Reports (DPR), site inspection snags, quality Non-Conformance Reports (NCR), variation orders, incoming/outgoing payments, and final client handover.

### What Problem It Solves
1. **Disconnected Lead-to-Project Handoff**: Connects sales CRM leads directly into active interior projects with historical data, site survey notes, and validated client requirement files preserved.
2. **Commercial & BOQ Variance**: Replaces error-prone manual spreadsheets with structured BOQs, Excel imports/exports, revision history, and real-time actual vs. estimated cost tracking.
3. **Fragmented Site Operations**: Replaces disconnected messaging apps with structured Daily Progress Reports (DPR), photo logs, RFIs, snags, and NCRs tied directly to WBS nodes and tasks.
4. **Scope Creep & Unapproved Work**: Formalizes Change Requests (CR) and Variation Orders (VO) with cost/time impact assessments and formal approval workflows before execution on site.
5. **Multi-Role Visibility**: Provides personalized views and permission controls for executives, project managers, site engineers, procurement heads, vendors, and clients.

### Target Users
- **Interior Business Executives / Admins**: Organization owners and directors needing portfolio-level KPIs, pipeline health, and high-level financial oversight.
- **Interior Project Managers**: Professionals managing project schedules, WBS, milestones, tasks, team roles, and change requests.
- **Site Engineers / Supervisors**: Site staff logging daily progress (DPR), uploading site photos, raising RFIs, reporting snags, and inspecting received materials.
- **Commercial & Procurement Managers**: Staff managing vendor rosters, issuing Purchase Orders (PO), tracking inventory intake via Goods Received Notes (GRN), and tracking client/vendor payments.
- **Clients / Homeowners**: External stakeholders reviewing designs, approving quotations, monitoring progress, and tracking snag resolution.
- **Vendors & Sub-contractors**: Material suppliers and specialized trade contractors receiving RFQs and purchase orders.

### Main User Roles
- **Global SuperAdmin**: System-wide administrative access for workspace management.
- **Organization Admin (`Admin`)**: Full operational access across all projects, CRM leads, financial approvals, and user/role assignments within the organization.
- **Project Manager (`Project Manager`)**: Administrative authority over assigned projects, WBS, milestones, tasks, team permissions, and BOQ revisions.
- **Site Engineer (`Site Engineer`)**: Execution permissions for creating DPRs, reporting snags/NCRs, creating RFIs, and uploading site photos.
- **Procurement Officer (`Procurement Manager`)**: Access to vendor lists, purchase orders, inventory tracking, and payment logging.
- **Viewer / Client (`Client` / `Viewer`)**: Read-only access to specific project progress, drawings, and quotation documents.

### Main Features
- **Lead & CRM Management**: Full sales pipeline (Leads -> Requirements/Design -> Site Visit -> Quotations -> Won Projects -> Auto-conversion to Project).
- **Interactive Quotation Builder**: Itemized room-by-room pricing calculations with email dispatch capabilities.
- **Executive Portfolio Dashboard**: Live KPIs on project health, delayed milestones, pipeline revenue, critical risks, and open snags.
- **Work Breakdown Structure (WBS) & Tasks**: Hierarchical WBS tree with Gantt timelines, Kanban task boards, comments, and task dependencies.
- **BOQ Management & Excel Import**: Itemized estimation, Excel template upload, version revisioning, and BOQ vs. Actual financial comparison.
- **Procurement & PO Workflow**: Vendor registry, Purchase Orders (PO), Goods Received Notes (GRN), inventory material tracking, and RFQs.
- **Quality & Inspection Control**: Snag list tracking with photo attachments, Non-Conformance Reports (NCR), and Request for Information (RFI) resolution.
- **Financial & Payment Tracking**: Incoming client payments, outgoing vendor payments, debit notes, and outstanding balance tracking.
- **Site Progress & Media Logs**: Daily Progress Reports (DPR), weekly progress reports, categorised drawing register, site photo gallery, and Minutes of Meeting (MOM).
- **Project Handover**: Handover checklist, sign-off documentation, warranty certificates, and closeout validation.

### Frontend Technology
- **Framework**: Next.js 16.2.4 (App Router)
- **Library**: React 19.2.4
- **Language**: TypeScript 5.x
- **UI Styling**: Tailwind CSS 4.x, CSS Modules, Lucide React (1.14.0 icons), Framer Motion (12.38.0 animations)
- **Mapping & Visuals**: Mapbox GL (3.28.0), Mapbox Geocoder (5.1.2), React Google Maps API (2.20.8), Leaflet / React-Leaflet (5.0.0), Recharts (3.9.0)

### Backend Technology
The frontend repository communicates with two distinct external REST API microservices:
1. **Sky-Lite Core API**: Proxied via `/api` (configured in `next.config.ts` to `process.env.NEXT_PUBLIC_API_BASE_URL` or `http://localhost:3001/api`).
2. **Interior-OS Backend API**: Dedicated microservice accessed via `src/services/interiorApi.client.ts` pointing to `process.env.NEXT_PUBLIC_INTERIOR_API_URL` or `https://interior-os-backend-two.vercel.app/api/v1`.

### Database
- **Type**: External REST API Backend Database (MongoDB / Mongoose models managed on the external Node.js backend cluster).
- *Frontend Context*: The frontend repo does not contain direct ORM schemas; domain models are defined via TypeScript interfaces (`src/types/index.ts`, `src/features/*/types`).

### Authentication
- **Token Mechanism**: Dual JWT (JSON Web Token) authentication with Bearer header injection.
- **Client Tokens**: `interiorAccessToken` & `interiorRefreshToken` (for Interior-OS backend) and `token` & `refreshToken` (for Sky-Lite core backend) stored in `localStorage` and client cookies (`js-cookie`).
- **Session Protection**: Next.js Middleware in `proxy.ts` and React Guard Hook in `src/lib/useInteriorAuthGuard.ts`. Automatic token refresh handled via Axios response interceptors.

### File/Image Storage
- **Primary Storage**: Cloudinary Cloud API (`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`) using SHA-1 signed direct uploads from `src/lib/upload.ts` (using `crypto-js`).
- **Multipart Form Uploads**: Direct multipart/form-data POST endpoints (`/projects/${projectId}/drawings/upload`, `/photos/upload`, `/handover/upload`).

### External Services
- **Cloudinary**: Image and document storage CDN.
- **Mapbox & Google Maps**: Location picking and geographic site surveys.
- **Socket.io**: Real-time project websocket updates (`src/hooks/useProjectSocket.ts`).
- **html2pdf.js**: Client-side PDF generation for quotations and reports.

### Deployment Information
- **Environment**: Next.js production server / Vercel hosting (`https://interior-os-backend-two.vercel.app`).
- **Development Server Command**: `npm run dev` (starts on port 3001: `next dev -p 3001`).

---

## 2. Technology Stack

| Category | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | Next.js | 16.2.4 | React App Router framework, SSR, client-side routing, API proxies |
| **Frontend** | React | 19.2.4 | UI component rendering engine |
| **Frontend** | TypeScript | ^5.0.0 | Type safety, interface definitions, autocomplete |
| **Backend** | Node.js / Express (External API) | NOT DETERMINED (External) | RESTful API microservice backend handling business logic and DB persistence |
| **Database** | MongoDB / Mongoose (External) | NOT DETERMINED (External) | Document database storing users, leads, projects, BOQs, tasks, POs |
| **Authentication** | JWT (JSON Web Token) | 4.2.0 (`crypto-js`) / ^3.0.5 (`js-cookie`) | Bearer token authentication, session sync, refresh token flow |
| **Styling** | Tailwind CSS | ^4.0.0 | Utility-first CSS styling and custom glassmorphism design system |
| **Styling** | Framer Motion | ^12.38.0 | Page transitions, modal animations, component micro-interactions |
| **Icons** | Lucide React | ^1.14.0 | Comprehensive UI iconography |
| **State Management**| React Context API | Native | Global auth, confirmation modals, toast alerts, websockets |
| **State Management**| Local Component State | Native (`useState`, `useCallback`) | Form state, table filters, active tab state |
| **API Client** | Axios | ^1.16.0 | HTTP client with request/response interceptors for token auto-refresh |
| **Realtime** | Socket.io Client | ^4.8.3 | Live updates for project events and task notifications |
| **Storage** | Cloudinary REST API | Custom (`upload.ts`) | Image, PDF, and drawing file upload and CDN hosting |
| **Mapping** | Mapbox GL & Mapbox Geocoder | ^3.28.0 / ^5.1.2 | Interactive maps and geocoding location picker |
| **Mapping** | Google Maps API & Leaflet | ^2.20.8 / ^1.9.4 | Alternative location mapping options |
| **Charts** | Recharts | ^3.9.0 | Analytics charts (progress trends, lead pipelines, project health) |
| **PDF Generation** | html2pdf.js | ^0.14.0 | Client-side export of quotations and BOQ reports to PDF |
| **Build / Tooling** | PostCSS | ^4.0.0 | CSS processing |
| **Linting** | ESLint | ^9.0.0 | Code quality and Next.js linting standards |

---

## 3. Complete Folder Structure

```text
new-update-web-sklite/
├── .claude/
├── public/                      # Static public assets, branding, icons
├── src/
│   ├── app/                     # Next.js App Router Pages & Layouts
│   │   ├── (auth)/
│   │   │   ├── login/           # User authentication login route
│   │   │   ├── register/        # Organization registration route
│   │   │   ├── onboarding/      # New user setup flow
│   │   │   └── reset-password/  # Password recovery route
│   │   ├── dashboard/           # Main Sky-Lite general dashboard
│   │   ├── finance/             # Legacy finance overview routes
│   │   ├── interior/            # Legacy interior CRM page
│   │   ├── interior-new/        # Interior-OS Main Platform Routes
│   │   │   ├── page.tsx         # Executive Portfolio Dashboard
│   │   │   ├── crm/             # CRM & Lead Management Pipeline Page
│   │   │   ├── users-roles/     # Team & Role Permissions Page
│   │   │   └── projects/        # Project Directory & Detailed Views
│   │   │       ├── page.tsx     # All Projects Grid / List
│   │   │       └── [projectId]/ # Dynamic Project Command Workspace
│   │   │           ├── layout.tsx
│   │   │           ├── page.tsx # Project Executive Summary
│   │   │           ├── boq/     # Bill of Quantities sub-route
│   │   │           ├── procurement/
│   │   │           ├── purchase-orders/
│   │   │           ├── wbs/     # Work Breakdown Structure sub-route
│   │   │           ├── tasks/
│   │   │           ├── timeline/
│   │   │           ├── milestones/
│   │   │           ├── dpr/     # Daily Progress Reports
│   │   │           ├── drawings/
│   │   │           ├── rfis/    # Requests for Information
│   │   │           ├── snags/   # Site Snagging & Punch Lists
│   │   │           ├── ncrs/    # Non-Conformance Reports
│   │   │           ├── photos/  # Site Photo Gallery
│   │   │           ├── payments/
│   │   │           ├── change-requests/
│   │   │           ├── variation-orders/
│   │   │           ├── mom/     # Minutes of Meeting
│   │   │           ├── handover/
│   │   │           ├── members/
│   │   │           ├── vendors/
│   │   │           └── utilities/
│   │   ├── profile/             # User profile management route
│   │   ├── projects/            # Legacy project routes
│   │   ├── superadmin/          # SuperAdmin system dashboard
│   │   ├── templates/           # Project template routes
│   │   ├── users/               # Core user management route
│   │   ├── globals.css          # Global CSS variables & Tailwind imports
│   │   ├── layout.tsx           # Global Root Layout & Providers
│   │   ├── page.tsx             # Public Landing Page
│   │   ├── error.tsx            # Global error fallback component
│   │   └── not-found.tsx        # Custom 404 page
│   ├── bones/                   # Skeleton UI JSON layouts and registries
│   ├── components/              # Shared UI & Modal Components
│   │   ├── crm/                 # Shared CRM preview components
│   │   ├── interior/            # Interior theme UI primitives & navigation
│   │   │   ├── InteriorHeader.tsx
│   │   │   ├── InteriorSidebar.tsx
│   │   │   ├── InteriorShell.tsx
│   │   │   ├── InteriorProjectBanner.tsx
│   │   │   └── ui.tsx
│   │   ├── layouts/             # App Shell, Main Sidebar, Top Navigation
│   │   ├── modals/              # Global popup modals (Leads, Projects, Vendors, Maps)
│   │   ├── shared/              # Reusable components (CloudinaryUpload, GlobalSearch, Pagination)
│   │   └── ui/                  # Atomic primitives (button, card, input, label)
│   ├── data/                    # Local JSON data (countries, options)
│   ├── features/                # Domain Feature Modules
│   │   ├── dashboard/           # Dashboard views & analytics components
│   │   ├── interior-new/        # Core Interior-OS feature implementations
│   │   │   └── components/
│   │   │       ├── InteriorNewDashboardView.tsx
│   │   │       ├── InteriorNewProjectsView.tsx
│   │   │       ├── InteriorUsersRolesView.tsx
│   │   │       ├── crm/         # Lead stages, tables, site visits, quotations
│   │   │       │   └── modals/  # Lead action modals
│   │   │       └── projects/    # All 29 project sub-view components
│   │   ├── projects/            # Legacy project feature components
│   │   ├── templates/           # Project template feature modules
│   │   └── users/               # User management feature modules
│   ├── hooks/                   # Custom React Hooks
│   │   ├── usePermission.ts     # RBAC permission check hook
│   │   └── useProjectSocket.ts  # Real-time WebSocket connection hook
│   ├── lib/                     # Core Library Utilities & Client Auth
│   │   ├── api.client.ts        # Main Sky-Lite Axios client
│   │   ├── crmValidation.ts     # CRM form field validation functions
│   │   ├── interiorAuth.ts      # Interior-OS login/signup/logout session helpers
│   │   ├── permissions.ts       # Permission calculation engine
│   │   ├── upload.ts            # Cloudinary SHA-1 signed file uploader
│   │   ├── useInteriorAuthGuard.ts # Protected route guard hook
│   │   └── utils.ts             # Class merger utilities (clsx/tailwind-merge)
│   ├── providers/               # React Context Providers
│   │   ├── AuthContext.tsx      # Main Auth State Provider
│   │   ├── ConfirmContext.tsx   # Global confirmation dialog provider
│   │   ├── SocketContext.tsx    # Global WebSocket provider
│   │   └── ToastContext.tsx     # Toast alert notification provider
│   ├── services/                # API Service Abstractions
│   │   ├── api.client.ts        # Core Axios HTTP client
│   │   ├── interiorApi.client.ts# Dedicated Interior-OS backend Axios client
│   │   ├── interiorCrm.service.ts # Lead & CRM REST API calls
│   │   └── interiorProject.service.ts # Project REST API calls (WBS, BOQ, Tasks, POs)
│   └── types/                   # TypeScript interfaces & domain types
│       └── index.ts             # Re-export barrel file for domain types
├── next.config.ts               # Next.js rewrites, headers, CORS configuration
├── postcss.config.mjs           # PostCSS Tailwind plugin configuration
├── proxy.ts                     # Next.js middleware for route auth protection
├── tsconfig.json                # TypeScript compiler configuration
└── package.json                 # Project manifest & dependency list
```

### Purpose of Key Directories
- **`src/app/interior-new/`**: The core operational route subtree for the modern Interior-OS platform containing executive dashboard, sales CRM, project directory, team management, and 26+ project-specific sub-routes.
- **`src/services/`**: Centralized service layer isolating API HTTP calls. `interiorApi.client.ts` communicates specifically with the `interior-os-backend-two` microservice, while `interiorProject.service.ts` and `interiorCrm.service.ts` encapsulate all REST endpoints.
- **`src/features/interior-new/components/`**: Houses all complex domain UI components, splitting CRM sub-views (leads, site visits, quotations) and Project sub-views (BOQ, WBS, Procurement, DPR, Snags, Payments).
- **`src/lib/`**: Crucial client-side helpers: `permissions.ts` (RBAC calculation engine), `interiorAuth.ts` (session persistence), `upload.ts` (signed Cloudinary uploads), and `crmValidation.ts` (field validation).
- **`src/providers/`**: Context providers managing persistent client-side state across app life, including authentication (`AuthContext`), global toasts (`ToastContext`), real-time socket connections (`SocketContext`), and modal confirmations (`ConfirmContext`).

---

## 4. Complete Module Map

```text
                            INTERIOR APPLICATION MODULE HIERARCHY
                                              │
         ┌────────────────────────────────────┼────────────────────────────────────┐
         │                                    │                                    │
┌────────┴─────────┐                ┌─────────┴──────────┐               ┌─────────┴──────────┐
│   CRM Module     │                │ Executive Module   │               │ Projects Module    │
│(Leads/Quotations)│                │  (Dashboard/KPIs)  │               │ (Project Engine)   │
└────────┬─────────┘                └────────────────────┘               └────────┬───────────┘
         │                                                                        │
 ┌───────┴──────────────────┐                             ┌───────────────────────┼───────────────────────┐
 │                          │                             │                       │                       │
┌┴──────────┐         ┌─────┴─────┐             ┌─────────┴─────────┐   ┌─────────┴─────────┐   ┌─────────┴─────────┐
│Leads &    │         │Quotation  │             │ Commercial & BOQ  │   │ Procurement & PO  │   │ Site Execution    │
│Site Visit │         │  Builder  │             │   (Items/Actual)  │   │   (GRN/Inventory) │   │ (DPR/Snags/Photos)│
└───────────┘         └───────────┘             └───────────────────┘   └───────────────────┘   └───────────────────┘
```

### Module 1: CRM & Lead Lifecycle Module
* **Purpose**: Manages the customer acquisition funnel from raw lead intake to site survey, requirements gathering, 3D design upload, formal quotation creation, and project conversion.
* **Location**: `src/features/interior-new/components/crm/` and `src/app/interior-new/crm/page.tsx`
* **Main Pages**: `/interior-new/crm`
* **Main Components**: `InteriorCrmView.tsx`, `InteriorLeadsTable.tsx`, `InteriorSiteVisitsView.tsx`, `InteriorRequirementDesignView.tsx`, `InteriorQuotationsView.tsx`, `InteriorWonProjectsView.tsx`, `InteriorFollowUpsView.tsx`
* **Modals**: `InteriorCreateLeadModal.tsx`, `InteriorEditLeadModal.tsx`, `InteriorLogRequirementsModal.tsx`, `InteriorLogSiteVisitModal.tsx`, `InteriorQuotationBuilderModal.tsx`, `InteriorConvertToProjectModal.tsx`, `InteriorUploadDesignModal.tsx`
* **Services**: `src/services/interiorCrm.service.ts`
* **APIs**: `GET /crm/customers`, `POST /crm/customers`, `PATCH /crm/customers/:id`, `DELETE /crm/customers/:id`, `POST /crm/customers/:id/convert`, `POST /crm/customers/:id/send-quotation-email`, `GET /crm/activities`, `POST /crm/activities`
* **Models**: `Customer` / `Lead`, `Activity`, `Quotation`
* **Business Logic**: Validates customer details, schedules site visits, logs room requirements, calculates room-by-room quotation totals with tax/discount, sends quotation PDFs via email, and converts won leads into full projects.
* **Dependencies**: `interiorApiClient`, `crmValidation.ts`, `CloudinaryUpload.tsx`

### Module 2: Executive Dashboard & Portfolio Module
* **Purpose**: Provides high-level portfolio oversight, active lead pipelines, project progress trends, critical risks, pending procurement items, and demo data seeding.
* **Location**: `src/features/interior-new/components/InteriorNewDashboardView.tsx` and `src/app/interior-new/page.tsx`
* **Main Pages**: `/interior-new`
* **Main Components**: `InteriorNewDashboardView.tsx`
* **Services**: Direct calls via `interiorApiClient`
* **APIs**: `GET /dashboard`, `POST /dashboard/seed`
* **Models**: `DashboardMetrics`, `KPICards`, `ProjectHealth`
* **Business Logic**: Aggregates organization-wide metrics, calculates health scores (Green/Yellow/Red) based on project delays and snag counts, renders trend charts via Recharts, and allows demo portfolio seeding.
* **Dependencies**: `interiorApiClient`, `recharts`, `framer-motion`, `lucide-react`

### Module 3: Projects Command Module
* **Purpose**: Master listing and initialization of interior execution projects, status filtering, category assignments, and template-based project creation.
* **Location**: `src/features/interior-new/components/InteriorNewProjectsView.tsx` and `src/app/interior-new/projects/page.tsx`
* **Main Pages**: `/interior-new/projects`
* **Main Components**: `InteriorNewProjectsView.tsx`, `CreateProjectModal.tsx`, `ProjectCard.tsx`
* **Services**: `src/services/interiorProject.service.ts`
* **APIs**: `GET /projects`, `POST /projects`, `GET /templates`
* **Models**: `Project`, `Organization`, `User`
* **Business Logic**: Filters projects by status (Ongoing, Planning, Completed, On Hold), priority, and category; renders progress indicators; instantiates projects from predefined templates.
* **Dependencies**: `interiorProjectService`, `permissions.ts`, `AuthContext.tsx`

### Module 4: Commercial, BOQ & Financial Control Module
* **Purpose**: Detailed estimation, itemized Bill of Quantities management, room-level item breakdowns, Excel file import/export, BOQ version revisions, and BOQ vs. Actual expenditure tracking.
* **Location**: `src/features/interior-new/components/projects/InteriorBoqView.tsx`, `InteriorProjectQuotationView.tsx`
* **Main Pages**: `/interior-new/projects/[projectId]/boq`, `/interior-new/projects/[projectId]/quotation`
* **Main Components**: `InteriorBoqView.tsx`, `InteriorProjectQuotationView.tsx`
* **Services**: `src/services/interiorProject.service.ts`
* **APIs**: `GET /projects/:id/boq`, `POST /projects/:id/boq`, `PUT /projects/:id/boq/:boqId`, `POST /projects/:id/boq/:boqId/items`, `POST /projects/:id/boq/:boqId/approve`, `POST /projects/:id/boq/:boqId/revise`, `POST /projects/:id/boq/import`, `GET /projects/:id/boq/actual`
* **Models**: `BOQ`, `BOQItem`, `BOQRevision`
* **Business Logic**: Computes line item total (`quantity * rate`), calculates total estimated cost versus actual purchase order costs, handles multi-level approval workflows, and manages version history upon revision.
* **Dependencies**: `interiorProjectService`, `ToastContext.tsx`, `html2pdf.js`

### Module 5: Procurement, Vendors & Inventory Module
* **Purpose**: Vendor directory management, Purchase Order (PO) creation, vendor allocation, inventory intake via Goods Received Notes (GRN), and site material usage logging.
* **Location**: `src/features/interior-new/components/projects/` (`InteriorProcurementView.tsx`, `InteriorPurchaseOrdersView.tsx`, `InteriorVendorsView.tsx`, `InteriorGRNModal.tsx`, `SendRFQModal.tsx`)
* **Main Pages**: `/interior-new/projects/[projectId]/procurement`, `.../purchase-orders`, `.../vendors`
* **Main Components**: `InteriorProcurementView.tsx`, `InteriorPurchaseOrdersView.tsx`, `InteriorVendorsView.tsx`, `InteriorGRNModal.tsx`, `SendRFQModal.tsx`, `CreateVendorModal.tsx`
* **Services**: `src/services/interiorProject.service.ts`
* **APIs**: `GET /projects/:id/procurement`, `POST /projects/:id/procurement`, `PUT /projects/:id/procurement/:poId`, `GET /vendors`, `GET /projects/:id/inventory`, `POST /projects/:id/inventory`, `PUT /projects/:id/inventory/:materialId`
* **Models**: `PurchaseOrder`, `InventoryItem`, `Vendor`
* **Business Logic**: Generates purchase orders for BOQ materials, tracks delivery status (Ordered, Partial, Delivered), logs material intake with photos via GRN modal, and deducts site inventory as items are installed.
* **Dependencies**: `interiorProjectService`, `CloudinaryUpload.tsx`

### Module 6: Site Execution & Quality Control Module
* **Purpose**: Daily site progress reporting (DPR), task & WBS tracking, quality snag list logging, Non-Conformance Reports (NCR), Request for Information (RFI), and site photo logging.
* **Location**: `src/features/interior-new/components/projects/` (`InteriorDprView.tsx`, `InteriorSnagsView.tsx`, `InteriorNcrsView.tsx`, `InteriorRfisView.tsx`, `InteriorPhotosView.tsx`, `InteriorDrawingsView.tsx`)
* **Main Pages**: `/interior-new/projects/[projectId]/dpr`, `.../snags`, `.../ncrs`, `.../rfis`, `.../photos`, `.../drawings`
* **Main Components**: `InteriorDprView.tsx`, `InteriorSnagsView.tsx`, `InteriorNcrsView.tsx`, `InteriorRfisView.tsx`, `InteriorPhotosView.tsx`, `InteriorDrawingsView.tsx`
* **Services**: `src/services/interiorProject.service.ts`
* **APIs**: `GET /projects/:id/dpr`, `POST /projects/:id/dpr`, `GET /projects/:id/snags`, `POST /projects/:id/snags`, `GET /projects/:id/ncrs`, `POST /projects/:id/ncrs`, `GET /projects/:id/rfis`, `POST /projects/:id/rfis`, `GET /projects/:id/photos`, `POST /projects/:id/photos/upload`, `GET /projects/:id/drawings`, `POST /projects/:id/drawings/upload`
* **Models**: `DPR`, `Snag`, `NCR`, `RFI`, `PhotoLog`, `Drawing`
* **Business Logic**: Captures daily site work logs and labor counts, flags quality issues with severity levels and assignees, tracks RFI responses from architects, and manages drawing version control.
* **Dependencies**: `interiorProjectService`, `upload.ts`, `useProjectSocket.ts`

### Module 7: Change Management & Financial Payments Module
* **Purpose**: Manages scope variations (Change Requests & Variation Orders) with client approval flows and tracks all incoming client payments, outgoing vendor payments, and debit notes.
* **Location**: `src/features/interior-new/components/projects/` (`InteriorChangeRequestsView.tsx`, `InteriorVariationOrdersView.tsx`, `InteriorPaymentsView.tsx`)
* **Main Pages**: `/interior-new/projects/[projectId]/change-requests`, `.../variation-orders`, `.../payments`
* **Main Components**: `InteriorChangeRequestsView.tsx`, `InteriorVariationOrdersView.tsx`, `InteriorPaymentsView.tsx`
* **Services**: `src/services/interiorProject.service.ts`
* **APIs**: `GET /projects/:id/change-requests`, `POST /projects/:id/change-requests`, `POST /projects/:id/change-requests/:crId/approve`, `GET /projects/:id/variation-orders`, `POST /projects/:id/variation-orders`, `POST /projects/:id/variation-orders/:voId/approve`, `GET /projects/:id/payments`, `POST /projects/:id/payments`, `DELETE /projects/:id/payments/:paymentId`
* **Models**: `ChangeRequest`, `VariationOrder`, `PaymentRecord`
* **Business Logic**: Evaluates cost and schedule impacts for scope changes, requires explicit approval to merge into active BOQ, records client payment installments, and logs vendor disbursements.
* **Dependencies**: `interiorProjectService`, `permissions.ts`

### Module 8: Project Handover & Closeout Module
* **Purpose**: Manages final inspection checklists, warranty document compilation, sign-off records, and final project handover to the client.
* **Location**: `src/features/interior-new/components/projects/InteriorHandoverView.tsx`
* **Main Pages**: `/interior-new/projects/[projectId]/handover`
* **Main Components**: `InteriorHandoverView.tsx`
* **Services**: `src/services/interiorProject.service.ts`
* **APIs**: `GET /projects/:id/handover`, `POST /projects/:id/handover`, `POST /projects/:id/handover/upload`
* **Models**: `HandoverRecord`, `HandoverDocument`
* **Business Logic**: Validates that all critical snags and NCRs are marked resolved before allowing handover completion; compiles handover documentation package.
* **Dependencies**: `interiorProjectService`, `permissions.ts`

---

## 5. Page / Screen Map

### 1. Screen: Landing Page
* **Route**: `/`
* **File**: `src/app/page.tsx`
* **Main Component**: `LandingPage`
* **Child Components**: Header navigation, platform features grid, operating areas tabs, FAQ accordion, footer links
* **APIs Called**: None (static client-rendered presentation page)
* **Models Involved**: None
* **State Used**: `menuOpen` (boolean), `scrolled` (boolean), `openFaq` (number)
* **User Actions**: Clicks "Login" or "Get Started" to navigate to auth pages; toggles FAQ accordion; opens mobile navigation.
* **Navigation**: Redirects to `/dashboard` if user is already authenticated.
* **Permissions**: Publicly accessible.

---

### 2. Screen: Login Page
* **Route**: `/login`
* **File**: `src/app/login/page.tsx`
* **Main Component**: `LoginPage`
* **Child Components**: Login tab switcher (Unified / SuperAdmin), Auth form, Toast alert
* **APIs Called**: `POST /auth/login` (via `api.client.ts`) or `POST /auth/login` (via `interiorAuth.ts`)
* **Models Involved**: `User`, `Organization`
* **State Used**: `email`, `password`, `authType` ('org' | 'superadmin'), `loading`
* **User Actions**: Inputs credentials, selects login target, submits login form.
* **Navigation**: Navigates to `/interior-new` (if user organization industry is interior) or `/dashboard` on success.
* **Permissions**: Publicly accessible (redirects to `/dashboard` or `/interior-new` if already logged in).

---

### 3. Screen: Executive Portfolio Dashboard
* **Route**: `/interior-new`
* **File**: `src/app/interior-new/page.tsx`
* **Main Component**: `InteriorNewDashboardView`
* **Child Components**: `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Button`, Recharts (`AreaChart`, `BarChart`, `PieChart`)
* **APIs Called**: `GET /dashboard`, `POST /dashboard/seed`
* **Models Involved**: `DashboardData`, `KPICards`, `ProjectHealth`
* **State Used**: `data` (`DashboardData | null`), `loading` (boolean), `refreshing` (boolean), `seeding` (boolean)
* **User Actions**: Views high-level KPIs, refreshes dashboard metrics, clicks "Seed Demo Data" if portfolio is empty, inspects project health breakdown.
* **Navigation**: Links to `/interior-new/projects/[projectId]` or `/interior-new/crm`.
* **Permissions**: Requires active Interior-OS session token (`interiorAccessToken`).

---

### 4. Screen: CRM & Sales Pipeline Workspace
* **Route**: `/interior-new/crm`
* **File**: `src/app/interior-new/crm/page.tsx`
* **Main Component**: `InteriorCrmView`
* **Child Components**: `InteriorCrmFlowTabs`, `InteriorLeadsTable`, `InteriorSiteVisitsView`, `InteriorRequirementDesignView`, `InteriorQuotationsView`, `InteriorWonProjectsView`, `InteriorFollowUpsView`
* **Modals**: `InteriorCreateLeadModal`, `InteriorEditLeadModal`, `InteriorLogRequirementsModal`, `InteriorLogSiteVisitModal`, `InteriorQuotationBuilderModal`, `InteriorConvertToProjectModal`, `InteriorUploadDesignModal`
* **APIs Called**: `GET /crm/customers`, `POST /crm/customers`, `PATCH /crm/customers/:id`, `DELETE /crm/customers/:id`, `GET /crm/activities`, `POST /crm/activities`
* **Models Involved**: `Customer`, `Activity`, `Quotation`
* **State Used**: `activeTab` ('leads' | 'site-visits' | 'requirements' | 'quotations' | 'won' | 'follow-ups'), `leads` (Array), `loading` (boolean), `selectedLead` (Object), modal visibility states
* **User Actions**: Filters leads by status stage, creates new lead, logs site visit date & dimensions, uploads concept designs, builds itemized quotation, sends quotation email, converts won lead to project.
* **Navigation**: Navigates between CRM tabs or opens converted project in `/interior-new/projects/[projectId]`.
* **Permissions**: Requires CRM view permissions (`hasProjectPermission` or org admin).

---

### 5. Screen: Master Projects Directory
* **Route**: `/interior-new/projects`
* **File**: `src/app/interior-new/projects/page.tsx`
* **Main Component**: `InteriorNewProjectsView`
* **Child Components**: `ProjectCard`, `CreateProjectModal`, search & status filter headers
* **APIs Called**: `GET /projects`, `POST /projects`, `GET /templates`
* **Models Involved**: `Project`, `Template`
* **State Used**: `projects` (Array), `searchQuery` (string), `statusFilter` (string), `loading` (boolean), `isCreateModalOpen` (boolean)
* **User Actions**: Searches projects by name/client, filters by execution status, clicks "Create Project" to launch wizard modal, clicks project card to enter project.
* **Navigation**: Clicks project card -> Navigates to `/interior-new/projects/[projectId]`.
* **Permissions**: Authenticated users within organization.

---

### 6. Screen: Project Dynamic Command Center (Workspace Layout)
* **Route**: `/interior-new/projects/[projectId]/[...subroute]`
* **File**: `src/app/interior-new/projects/[projectId]/layout.tsx` & individual sub-route `page.tsx` files
* **Main Component**: `InteriorProjectOverviewView` (or specific sub-view component)
* **Child Components**: `InteriorProjectBanner`, project sidebar sub-navigation, active module view
* **Sub-Routes**:
  - `page.tsx` -> `InteriorProjectOverviewView.tsx` (Project Summary & KPIs)
  - `boq/page.tsx` -> `InteriorBoqView.tsx` (Bill of Quantities & Actuals)
  - `procurement/page.tsx` -> `InteriorProcurementView.tsx` (Procurement List & RFQs)
  - `purchase-orders/page.tsx` -> `InteriorPurchaseOrdersView.tsx` (PO Management)
  - `wbs/page.tsx` -> `InteriorWbsView.tsx` (Work Breakdown Tree)
  - `tasks/page.tsx` -> `InteriorTasksView.tsx` (Task Boards & Assignments)
  - `timeline/page.tsx` -> `InteriorTimelineView.tsx` (Gantt Chart & Schedule)
  - `milestones/page.tsx` -> `InteriorMilestonesView.tsx` (Milestones & Delays)
  - `dpr/page.tsx` -> `InteriorDprView.tsx` (Daily Progress Reports)
  - `drawings/page.tsx` -> `InteriorDrawingsView.tsx` (Drawing Registry)
  - `rfis/page.tsx` -> `InteriorRfisView.tsx` (Request for Information)
  - `snags/page.tsx` -> `InteriorSnagsView.tsx` (Snags & Punch Lists)
  - `ncrs/page.tsx` -> `InteriorNcrsView.tsx` (Non-Conformance Reports)
  - `photos/page.tsx` -> `InteriorPhotosView.tsx` (Site Photo Log)
  - `payments/page.tsx` -> `InteriorPaymentsView.tsx` (Incoming/Outgoing Cash Flow)
  - `change-requests/page.tsx` -> `InteriorChangeRequestsView.tsx` (Change Requests)
  - `variation-orders/page.tsx` -> `InteriorVariationOrdersView.tsx` (Variation Orders)
  - `mom/page.tsx` -> `InteriorMomView.tsx` (Minutes of Meeting)
  - `handover/page.tsx` -> `InteriorHandoverView.tsx` (Closeout & Handover)
  - `members/page.tsx` -> `InteriorMembersView.tsx` (Team Members & Roles)
  - `vendors/page.tsx` -> `InteriorVendorsView.tsx` (Project Vendors)
  - `utilities/page.tsx` -> `InteriorUtilitiesView.tsx` (Utility Site Trackers)
  - `sitedetails/page.tsx` -> `InteriorSiteDetailsView.tsx` (Site Specifications)
  - `weekly-reports/page.tsx` -> `InteriorWeeklyReportsView.tsx` (Weekly Stakeholder Summaries)
* **APIs Called**: `GET /projects/:id`, `GET /projects/:id/members`, plus sub-module specific APIs listed in Section 7.
* **Models Involved**: `Project`, `User`, `Role`, plus sub-module models.
* **State Used**: `project` (Object), `projectLoading` (boolean), sub-route specific view state.
* **User Actions**: Switches sub-tabs, views metrics, edits project parameters, executes module-specific actions.
* **Navigation**: Dynamic side navigation between sub-routes.
* **Permissions**: Checked via `permissions.ts` (`hasProjectPermission(user, project, permission)`).

---

### 7. Screen: Users & Role Permissions Management
* **Route**: `/interior-new/users-roles`
* **File**: `src/app/interior-new/users-roles/page.tsx`
* **Main Component**: `InteriorUsersRolesView`
* **Child Components**: User search bar, Team user table, User creation drawer, Project assignment picker
* **APIs Called**: `GET /users/with-projects`, `POST /users`, `GET /roles`
* **Models Involved**: `User`, `Role`, `Project`
* **State Used**: `users` (Array), `search` (string), `loading` (boolean), `selectedUser` (Object), `isCreateUserOpen` (boolean)
* **User Actions**: Searches organization members, creates new user account, assigns default system roles, assigns users to specific projects with granular project roles.
* **Navigation**: None (standalone administration screen).
* **Permissions**: Organization Admin only.

---

## 6. Component Architecture

### Reusable Shared Components

#### 1. `CloudinaryUpload`
* **File**: `src/components/shared/CloudinaryUpload.tsx`
* **Purpose**: Secure client-side image and document file uploader.
* **Props**: `onUploadComplete: (url: string) => void`, `folder?: string`, `accept?: string`, `label?: string`
* **State**: `uploading` (boolean), `progress` (number), `error` (string | null)
* **Hooks**: Custom upload helper (`uploadToCloudinary` from `src/lib/upload.ts`)
* **API Calls**: Direct HTTP POST to Cloudinary upload endpoint.
* **Child Components**: Lucide `Upload`, `Loader2`, `CheckCircle` icons.
* **Parent Components**: Used in `InteriorUploadDesignModal`, `InteriorLogSiteVisitModal`, `InteriorGRNModal`, `InteriorPhotosView`, `InteriorDrawingsView`, `InteriorHandoverView`.

#### 2. `ProjectCard`
* **File**: `src/components/ui/ProjectCard.tsx`
* **Purpose**: Visual presentation card displaying project health, completion progress bar, client contact, priority badge, and quick action menu.
* **Props**: `project: Project`, `onEdit?: (project: Project) => void`, `onDelete?: (id: string) => void`
* **State**: `menuOpen` (boolean)
* **Hooks**: `useAuth`
* **Child Components**: Priority badges, progress bar, Lucide icons.
* **Parent Components**: Reused in `InteriorNewProjectsView`, `InteriorDashboardView`.

#### 3. `GlassCard`
* **File**: `src/components/ui/GlassCard.tsx`
* **Purpose**: Premium glassmorphism container wrapper with subtle background blur and border highlights.
* **Props**: `children: ReactNode`, `className?: string`
* **State**: None
* **Reused**: Across executive dashboards and metric header cards.

#### 4. `InteriorHeader` & `InteriorSidebar`
* **Files**: `src/components/interior/InteriorHeader.tsx` & `InteriorSidebar.tsx`
* **Purpose**: Provides top header bar (user profile, organization badge, notifications) and primary sidebar navigation for the Interior-OS theme context.
* **Props**: `activeRoute: string`, `user: User`
* **State**: `collapsed` (boolean), `searchOpen` (boolean)
* **Reused**: Wraps all `/interior-new/*` pages via `InteriorShell.tsx`.

#### 5. `QuotationBuilderModal` / `InteriorQuotationBuilderModal`
* **File**: `src/features/interior-new/components/crm/modals/InteriorQuotationBuilderModal.tsx`
* **Purpose**: Interactive multi-room quotation estimator tool.
* **Props**: `isOpen: boolean`, `onClose: () => void`, `lead: Customer`, `onSave: (quotationData: any) => void`
* **State**: `rooms` (Array of room items with scope, quantity, unit rate, specifications), `discount` (number), `taxPercent` (number)
* **Hooks**: `useToast`
* **Child Components**: Room accordion list, item calculation inputs, live subtotal & grand total summary, PDF export button (`html2pdf.js`).
* **Parent Components**: Triggered from `InteriorQuotationsView.tsx` and `InteriorLeadsTable.tsx`.

#### 6. `LocationPickerMap`
* **File**: `src/components/modals/LocationPickerMap.tsx`
* **Purpose**: Interactive map modal allowing site surveyors to drop pins and record precise GPS coordinates (Latitude/Longitude) and address string for an interior site.
* **Props**: `isOpen: boolean`, `onClose: () => void`, `onSelectLocation: (location: { lat: number; lng: number; address: string }) => void`
* **State**: `markerPosition` (lat/lng), `searchAddress` (string)
* **Hooks**: Leaflet / Mapbox map hooks.
* **Parent Components**: Reused in `CreateProjectModal`, `InteriorSiteDetailsView`, `InteriorLogSiteVisitModal`.

---

## 7. Complete API Map

### API Endpoint Reference Table

| Method | Endpoint | Purpose | Frontend Service Caller | Backend Service File | Auth Required |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | User login (Interior-OS) | `loginInterior` (`interiorAuth.ts`) | Auth Controller | No |
| `POST` | `/auth/signup` | Organization signup | `signupInterior` (`interiorAuth.ts`) | Auth Controller | No |
| `POST` | `/auth/refresh` | Refresh JWT access token | Interceptor (`interiorApi.client.ts`) | Auth Controller | Yes (Refresh Token) |
| `GET` | `/dashboard` | Executive KPI analytics | `InteriorNewDashboardView.tsx` | Dashboard Controller | Yes |
| `POST` | `/dashboard/seed` | Seed demo portfolio data | `InteriorNewDashboardView.tsx` | Dashboard Controller | Yes (Admin) |
| `GET` | `/crm/customers` | Fetch leads & clients list | `interiorCrmService.getCustomers` | CRM Controller | Yes |
| `POST` | `/crm/customers` | Create new lead/customer | `interiorCrmService.createCustomer` | CRM Controller | Yes |
| `PATCH`| `/crm/customers/:id` | Update lead stage & info | `interiorCrmService.updateCustomer` | CRM Controller | Yes |
| `DELETE`|`/crm/customers/:id` | Delete lead | `interiorCrmService.deleteCustomer` | CRM Controller | Yes |
| `POST` | `/crm/customers/:id/convert` | Convert won lead to project | `interiorCrmService.convertCustomer` | CRM Controller | Yes |
| `POST` | `/crm/customers/:id/send-quotation-email` | Email quotation PDF to client | `interiorCrmService.sendQuotationEmail` | CRM Controller | Yes |
| `GET` | `/crm/activities` | Fetch lead activity log | `interiorCrmService.getActivities` | CRM Controller | Yes |
| `POST` | `/crm/activities` | Log site visit / call | `interiorCrmService.createActivity` | CRM Controller | Yes |
| `GET` | `/projects` | Get all projects | `interiorProjectService.getProjects` | Project Controller | Yes |
| `POST` | `/projects` | Create new project | `interiorProjectService.createProject` | Project Controller | Yes |
| `GET` | `/projects/:id` | Get project details | `interiorProjectService.getProjectDetails` | Project Controller | Yes |
| `PUT` | `/projects/:id` | Update project settings | `interiorProjectService.updateProject` | Project Controller | Yes |
| `GET` | `/projects/:id/members` | Get project team members | `interiorProjectService.getProjectMembers` | Project Controller | Yes |
| `POST` | `/projects/:id/members` | Add user to project | `interiorProjectService.addProjectMember` | Project Controller | Yes |
| `GET` | `/projects/:id/wbs` | Get WBS tree nodes | `interiorProjectService.getWbs` | WBS Controller | Yes |
| `POST` | `/projects/:id/wbs` | Add WBS node | `interiorProjectService.addWbsNode` | WBS Controller | Yes |
| `GET` | `/projects/:id/tasks` | Get project tasks | `interiorProjectService.getTasks` | Task Controller | Yes |
| `POST` | `/projects/:id/tasks` | Create task | `interiorProjectService.createTask` | Task Controller | Yes |
| `PUT` | `/projects/:id/tasks/:taskId` | Update task status | `interiorProjectService.updateTask` | Task Controller | Yes |
| `GET` | `/projects/:id/boq` | Get project BOQ list | `interiorProjectService.getBoqList` | BOQ Controller | Yes |
| `POST` | `/projects/:id/boq` | Create BOQ | `interiorProjectService.createBoq` | BOQ Controller | Yes |
| `POST` | `/projects/:id/boq/:boqId/items` | Add items to BOQ | `interiorProjectService.addBoqItems` | BOQ Controller | Yes |
| `POST` | `/projects/:id/boq/:boqId/approve` | Approve BOQ | `interiorProjectService.boqApprovalAction` | BOQ Controller | Yes |
| `POST` | `/projects/:id/boq/:boqId/revise` | Revise BOQ version | `interiorProjectService.reviseBoq` | BOQ Controller | Yes |
| `POST` | `/projects/:id/boq/import` | Import BOQ Excel file | `interiorProjectService.importBoqExcel` | BOQ Controller | Yes |
| `GET` | `/projects/:id/boq/actual` | Get BOQ vs Actual cost report | `interiorProjectService.getBoqVsActual` | BOQ Controller | Yes |
| `GET` | `/projects/:id/procurement` | Get procurement list & POs | `interiorProjectService.getPurchaseOrders` | Procurement Controller | Yes |
| `POST` | `/projects/:id/procurement` | Create Purchase Order | `interiorProjectService.createPurchaseOrder` | Procurement Controller | Yes |
| `GET` | `/projects/:id/inventory` | Get site inventory list | `interiorProjectService.getInventory` | Inventory Controller | Yes |
| `POST` | `/projects/:id/inventory` | Intake inventory / log usage | `interiorProjectService.logInventoryInstall` | Inventory Controller | Yes |
| `GET` | `/projects/:id/dpr` | Get Daily Progress Reports | `interiorProjectService.getDprs` | DPR Controller | Yes |
| `POST` | `/projects/:id/dpr` | Create DPR | `interiorProjectService.createDpr` | DPR Controller | Yes |
| `GET` | `/projects/:id/snags` | Get snag list | `interiorProjectService.getSnags` | Snag Controller | Yes |
| `POST` | `/projects/:id/snags` | Create snag item | `interiorProjectService.createSnag` | Snag Controller | Yes |
| `GET` | `/projects/:id/ncrs` | Get NCR quality issues | `interiorProjectService.getNcrs` | NCR Controller | Yes |
| `POST` | `/projects/:id/ncrs` | Create NCR report | `interiorProjectService.createNcr` | NCR Controller | Yes |
| `GET` | `/projects/:id/payments` | Get incoming/outgoing payments | `interiorProjectService.getPayments` | Payment Controller | Yes |
| `POST` | `/projects/:id/payments` | Record payment | `interiorProjectService.createPayment` | Payment Controller | Yes |
| `GET` | `/projects/:id/change-requests` | Get change requests | `interiorProjectService.getChangeRequests` | Change Controller | Yes |
| `POST` | `/projects/:id/change-requests/:crId/approve` | Approve change request | `interiorProjectService.approveChangeRequest` | Change Controller | Yes |
| `GET` | `/users/with-projects` | Get users with project list | `interiorProjectService.getUsersWithProjects` | User Controller | Yes (Admin) |

### Complete End-to-End Execution Trace Flow

```text
                                  END-TO-END DATA FLOW TRACE
                                  
  ┌──────────────────┐       1. Submit Form        ┌──────────────────────┐
  │  UI Component    ├────────────────────────────►│ Service Function     │
  │ (e.g. BOQ View)  │                             │(interiorProject.serv)│
  └────────▲─────────┘                             └──────────┬───────────┘
           │                                                  │ 2. Call Axios Client
           │ 7. React Re-render                               ▼
  ┌────────┴─────────┐        6. Return Data       ┌──────────────────────┐
  │  React State     │◄────────────────────────────┤ Axios Interceptor    │
  │ (setBoq/setLoading)│                            │(interiorApi.client)  │
  └──────────────────┘                             └────────▲───────────┬─┘
                                                            │           │ 3. Inject Bearer Header & HTTP POST
                                                            │           ▼
                                                   ┌────────┴───────────┴─┐
                                                   │ External Backend API │
                                                   │ (interior-os-backend)│
                                                   └──────────┬───────────┘
                                                              │ 4. ORM Query
                                                              ▼
                                                   ┌──────────────────────┐
                                                   │   MongoDB Database   │
                                                   └──────────────────────┘
```

---

## 8. Database Architecture

*Note: Database entities listed below are derived from TypeScript domain interfaces, component state definitions, and REST payload schemas.*

### Primary Entities & Models

#### 1. Model: `Customer` (Lead)
* **File**: Referenced in `src/services/interiorCrm.service.ts` and `src/features/interior-new/components/crm/`
* **Purpose**: Stores sales prospects, contact information, funnel stage, logged requirements, and site visit notes.
* **Fields**: `_id`, `fullName`, `phone`, `email`, `city`, `propertyType` ('2BHK' | '3BHK' | 'Villa' | 'Commercial'), `budgetRange`, `stage` ('New Lead' | 'Site Visit Scheduled' | 'Requirements Logged' | 'Quotation Sent' | 'Won' | 'Lost'), `assignedTo`, `requirements` (Object), `siteVisitDate`, `createdAt`.
* **Required Fields**: `fullName`, `phone`
* **Relationships**: Belongs to `Organization`; references `User` (`assignedTo`); has many `Activities` and `Quotations`.

#### 2. Model: `Project`
* **File**: `src/features/projects/types/project.types.ts`
* **Purpose**: Core entity for an active or planned interior execution project.
* **Fields**: `_id`, `name`, `description`, `clientName`, `clientEmail`, `clientPhone`, `status` ('Planning' | 'Ongoing' | 'Under Snagging' | 'Completed' | 'On Hold'), `priority`, `organization`, `createdBy`, `members` (Array of ProjectMember objects), `startDate`, `endDate`, `projectType` ('Interior'), `budgetHistory`, `documents`, `createdAt`.
* **Required Fields**: `name`, `organization`, `createdBy`, `projectType`
* **Relationships**: Belongs to `Organization`; references `User` (`createdBy`); has many `Members`, `WBSNodes`, `Tasks`, `BOQs`, `PurchaseOrders`, `DPRs`, `Snags`.

#### 3. Model: `BOQ` (Bill of Quantities)
* **File**: `src/features/projects/boq/types/boq.types.ts`
* **Purpose**: Financial estimation document containing itemized room quantities, material costs, and margin calculations.
* **Fields**: `_id`, `projectId`, `title`, `version` (number), `status` ('Draft' | 'Pending Approval' | 'Approved' | 'Revised'), `items` (Array of BOQItem), `totalAmount`, `createdBy`, `approvedBy`, `createdAt`.
* **Required Fields**: `projectId`, `title`, `version`, `items`
* **Relationships**: Belongs to `Project`; contains embedded `BOQItem` array.

#### 4. Model: `PurchaseOrder` (PO)
* **File**: `src/features/interior-new/components/projects/InteriorPurchaseOrdersView.tsx`
* **Purpose**: Commercial purchase commitment sent to material vendors.
* **Fields**: `_id`, `projectId`, `poNumber`, `vendorId`, `items` (Array of POItem), `totalCost`, `status` ('Draft' | 'Sent' | 'Partial Received' | 'Delivered' | 'Cancelled'), `deliveryDate`, `createdAt`.
* **Required Fields**: `projectId`, `poNumber`, `vendorId`, `items`
* **Relationships**: Belongs to `Project`; references `Vendor`; references `BOQItem` IDs.

#### 5. Model: `DailyProgressReport` (DPR)
* **File**: `src/features/interior-new/components/projects/InteriorDprView.tsx`
* **Purpose**: Daily site log recording work completed, manpower counts, weather, issues, and photos.
* **Fields**: `_id`, `projectId`, `date`, `submittedBy`, `workSummary`, `manpowerCount`, `vendorCounts` (Array), `photoUrls` (Array of strings), `blockers`, `createdAt`.
* **Required Fields**: `projectId`, `date`, `submittedBy`, `workSummary`
* **Relationships**: Belongs to `Project`; references `User` (`submittedBy`).

#### 6. Model: `Snag` (Punch List Issue)
* **File**: `src/features/interior-new/components/projects/InteriorSnagsView.tsx`
* **Purpose**: Defect or incomplete finish identified during quality inspections.
* **Fields**: `_id`, `projectId`, `title`, `description`, `location` (room/zone), `severity` ('Low' | 'Medium' | 'High' | 'Critical'), `status` ('Open' | 'In Progress' | 'Resolved' | 'Closed'), `assignedTo`, `photoUrl`, `reportedBy`, `createdAt`.
* **Required Fields**: `projectId`, `title`, `severity`, `status`
* **Relationships**: Belongs to `Project`; references `User` (`assignedTo`, `reportedBy`).

### Text Entity Relationship Diagram

```text
Organization (1)
   │
   ├──► User / Member (N)
   │     │
   │     ├──► Lead / Customer (N) ─────► Activity (N)
   │     │         │
   │     │         └──► Quotation (N)
   │     │                 │ (Convert)
   │     │                 ▼
   └─────┴──────────► Project (N)
                       │
                       ├──► WBS Node (N) ─────► Task (N)
                       │
                       ├──► BOQ (N) ──────────► BOQ Item (N)
                       │                          │
                       │                          ▼
                       ├──► Purchase Order (N) ◄──┘
                       │      │
                       │      └──► Inventory Item (N) ◄── Vendor (1)
                       │
                       ├──► DPR (Daily Progress Report) (N)
                       ├──► Snag / Defect (N)
                       ├──► NCR (Quality Violation) (N)
                       ├──► RFI (Request for Information) (N)
                       ├──► Drawing (N)
                       └──► Payment Record (N)
```

---

## 9. Authentication & Authorization

### Trace Flow: User Authentication & Route Guarding

```text
 User Enters Credentials (/login)
              │
              ▼
   loginInterior(email, password)  ──────► Calls POST /auth/login (interiorApiClient)
              │
              ▼
    Server Returns JWT Data        ──────► { user, organization, tokens: { accessToken, refreshToken } }
              │
              ▼
 persistInteriorSession()          ──────► Saves to localStorage:
                                           - 'interiorAccessToken'
                                           - 'interiorRefreshToken'
                                           - 'interiorUser'
                                           - 'interiorOrganization'
              │
              ▼
 Next.js Middleware (proxy.ts)     ──────► Intercepts route requests.
 & useInteriorAuthGuard Hook                If token missing & route is protected -> Redirects to /login
              │
              ▼
 Axios Interceptor Injection       ──────► Automatically appends `Authorization: Bearer ${accessToken}`
                                           to all subsequent REST requests.
              │
              ▼
 Automatic 401 Interceptor Refresh ──────► On 401 HTTP response:
                                           Calls POST /auth/refresh using `interiorRefreshToken`.
                                           Updates local tokens & retries queued requests seamlessly.
```

### Roles & Permissions Architecture (`src/lib/permissions.ts`)
The application implements a hybrid **Global RBAC + Project-Level Role System**:

1. **Global Admin Bypass**: Users with system role `'Admin'` or possessing the wildcard permission `'*'` automatically bypass all permission checks (`hasProjectPermission` returns `true`).
2. **Global User Permissions**: Checks if `user.role.permissions` array contains the requested permission string (e.g. `'projects.create'`, `'crm.manage'`).
3. **Project-Specific Role Permissions**: Checks if the user is listed in `project.members` array. Retrieves `member.role.permissions` and validates specific permissions (e.g., `'boq.approve'`, `'snags.resolve'`).
4. **Project Locked Guard (`isProjectLocked`)**: If a project status is `'Completed'`, `'Handover Completed'`, or `'Cancelled'`, write/edit operations are strictly disabled across all components.

---

## 10. Major Business Workflows

### Workflow 1: Lead Ingestion to Active Project Conversion

```text
 1. Create Lead Modal (InteriorCreateLeadModal)
        │ User submits client details (validateName, validateMobileNumber)
        ▼
 2. Lead Created (POST /crm/customers) ──► Saved in stage 'New Lead'
        │
        ▼
 3. Schedule Site Visit (InteriorScheduleFollowUpModal / POST /crm/activities)
        │ Site surveyor logs measurements & photos (POST /crm/customers/:id)
        ▼
 4. Log Requirements & Concept Designs (InteriorLogRequirementsModal / InteriorUploadDesignModal)
        │ Uploads 3D renderings to Cloudinary & sets budget range
        ▼
 5. Build Quotation (InteriorQuotationBuilderModal)
        │ Calculates itemized room totals, adds taxes/discounts, emails PDF
        ▼
 6. Client Approves -> Lead Stage updated to 'Won'
        │
        ▼
 7. Convert to Project Modal (InteriorConvertToProjectModal)
        │ User selects project template & start date (POST /crm/customers/:id/convert)
        ▼
 8. System Instantiates New Project (POST /projects)
        │ Automatically copies template WBS nodes, BOQ structure, & assigns team
        ▼
 9. Redirects User to /interior-new/projects/[newProjectId]
```

### Workflow 2: Material Procurement & Inventory Intake (GRN)

```text
 1. Commercial Manager selects BOQ items in InteriorProcurementView
        │
        ▼
 2. Creates Purchase Order (POST /projects/:id/procurement)
        │ Selects Vendor, sets agreed material rates, unit quantities, & expected delivery date
        ▼
 3. Vendor Ships Materials to Site
        │
        ▼
 4. Site Engineer opens GRN Modal (InteriorGRNModal)
        │ Inspects delivered packages, enters received quantity, attaches delivery slip photo
        ▼
 5. Material Intake Logged (POST /projects/:id/inventory)
        │ Updates PO status to 'Delivered' or 'Partial Received'
        │ Increments site Inventory Item balance
        ▼
 6. Material Installed on Site
        │ Site Engineer logs inventory deduction (POST /projects/:id/inventory -> action: 'install')
        │ Deducts site inventory balance & updates task progress
```

---

## 11. Data Flow

### Data Layer Architecture Pattern
The project strictly separates presentation components, service abstraction layers, HTTP clients, and persistence state:

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ Presentation Layer (React Component)                                        │
 │ e.g. `src/features/interior-new/components/projects/InteriorBoqView.tsx`  │
 └──────────────────────────────────────┬──────────────────────────────────────┘
                                        │
                                        │ Calls service method
                                        ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ Service Layer (Abstraction Service)                                         │
 │ `src/services/interiorProject.service.ts` -> `getBoqList(projectId)`        │
 └──────────────────────────────────────┬──────────────────────────────────────┘
                                        │
                                        │ Invokes Axios client
                                        ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ HTTP Client Layer (Axios Interceptors)                                      │
 │ `src/services/interiorApi.client.ts`                                       │
 │ - Attaches Authorization: Bearer token                                      │
 │ - Proxies request to https://interior-os-backend-two.vercel.app/api/v1     │
 └──────────────────────────────────────┬──────────────────────────────────────┘
                                        │
                                        │ Network REST HTTP Request
                                        ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ Backend Microservice & Database                                             │
 └──────────────────────────────────────┬──────────────────────────────────────┘
                                        │
                                        │ Response JSON Data
                                        ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ Component State & UI Re-render                                              │
 │ `setBoqList(data.data)` -> Triggers Framer Motion animations & table render  │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Forms & Validation

### Centralized Validation Module (`src/lib/crmValidation.ts`)
The application enforces strict data validation across forms using pure helper functions:

1. **Full Name Validation (`validateName`)**:
   - Requires at least 2 non-whitespace characters.
   - Restricts input to letters, spaces, dots, hyphens, and apostrophes (`/^[a-zA-Z\s'.-]+$/`).
   - Disallows digits or special symbols.

2. **Mobile Phone Validation (`validateMobileNumber`)**:
   - Requires 10 to 15 numeric digits (stripping non-digits).
   - Allows optional leading `+` and spaces/hyphens (`/^\+?[0-9\s-]{10,18}$/`).
   - Rejects alphabetic characters.

3. **Email Address Validation (`validateEmail`)**:
   - Optional, but if supplied must pass regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.

4. **Numeric Validation (`validatePositiveNumber` / `validateNonNegativeNumber`)**:
   - Validates numbers > 0 (for unit rates, quantities) or >= 0 (for discounts, tax rates).

5. **Date Validation (`validateRequiredDate`)**:
   - Ensures valid non-NaN Date parsing for site visits and milestone target dates.

---

## 13. File & Image Management

### Cloudinary Direct Upload Architecture (`src/lib/upload.ts`)
```text
 User Selects Image / Document File
                │
                ▼
 uploadToCloudinary(file)
                │
                ▼
 Generates Unix Timestamp: timestamp = Math.round(Date.now() / 1000)
                │
                ▼
 Calculates SHA-1 Signature using crypto-js:
 signature = CryptoJS.SHA1(`folder=skylite&timestamp=${timestamp}${API_SECRET}`).toString()
                │
                ▼
 Constructs FormData:
 - file
 - api_key
 - timestamp
 - signature
 - folder: 'skylite'
                │
                ▼
 HTTP POST to https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload
                │
                ▼
 Cloudinary returns { secure_url: "https://res.cloudinary.com/..." }
                │
                ▼
 Secure URL stored in Database record (e.g. Photo log, drawing file URL, snag photo)
```

---

## 14. State Management

### 1. React Context API (Global App State)
- **`AuthContext` (`src/providers/AuthContext.tsx`)**: Stores logged-in user object, token state, organization info, login/register/logout actions.
- **`ToastContext` (`src/providers/ToastContext.tsx`)**: Exposes `toast.success()`, `toast.error()`, `toast.info()` floating alert triggers.
- **`ConfirmContext` (`src/providers/ConfirmContext.tsx`)**: Reusable confirmation dialog modal (`confirm({ title, message })`).
- **`SocketContext` (`src/providers/SocketContext.tsx`)**: Provides persistent real-time socket connections.

### 2. Local Storage Persistence Keys
- `interiorAccessToken` & `interiorRefreshToken`: Active JWT session for Interior-OS backend.
- `interiorUser` & `interiorOrganization`: Stringified JSON user profile and org details.
- `token` & `refreshToken`: Active JWT session for Sky-Lite core backend.
- `saToken` & `superAdmin`: SuperAdmin authentication tokens.

---

## 15. Hooks

### Custom Hooks Inventory

1. **`usePermission` (`src/hooks/usePermission.ts`)**
   - **Purpose**: Helper hook wrapping `hasProjectPermission` for component authorization.
   - **Outputs**: `hasPermission(permissionName: string) => boolean`.

2. **`useProjectSocket` (`src/hooks/useProjectSocket.ts`)**
   - **Purpose**: Subscribes to real-time project events over Socket.io websockets.
   - **Inputs**: `projectId: string`.
   - **Outputs**: Handlers for `task_updated`, `dpr_submitted`, `snag_created`, `boq_approved`.

3. **`useInteriorAuthGuard` (`src/lib/useInteriorAuthGuard.ts`)**
   - **Purpose**: Client-side auth guard protecting `/interior-new/*` routes.
   - **Outputs**: `{ user, loading, authenticated }`. Redirects unauthenticated sessions to `/login`.

---

## 16. Services & Utilities

- **`src/services/api.client.ts`**: Core Axios client configured with base URL, bearer token headers, and 401 token refresh logic for Sky-Lite core endpoints.
- **`src/services/interiorApi.client.ts`**: Dedicated Axios client for the separate Interior-OS backend (`https://interior-os-backend-two.vercel.app/api/v1`).
- **`src/services/interiorProject.service.ts`**: Complete REST API service encapsulating 50+ project-related endpoints (WBS, BOQs, POs, DPRs, Snags, NCRs, Payments, Handover).
- **`src/services/interiorCrm.service.ts`**: REST API service encapsulating customer, lead stage, activity log, and quotation email endpoints.
- **`src/lib/permissions.ts`**: RBAC permissions logic engine.
- **`src/lib/upload.ts`**: Signed Cloudinary direct file upload utility.
- **`src/lib/crmValidation.ts`**: Field validation helper library.

---

## 17. Important Business Calculations

### 1. Quotation Line Item & Total Calculation
$$\text{Line Item Total} = \text{Quantity} \times \text{Unit Rate}$$
$$\text{Room Subtotal} = \sum \text{Line Item Totals for Room}$$
$$\text{Subtotal} = \sum \text{Room Subtotals}$$
$$\text{Discount Amount} = \text{Subtotal} \times \left(\frac{\text{Discount \%}}{100}\right)$$
$$\text{Taxable Amount} = \text{Subtotal} - \text{Discount Amount}$$
$$\text{Grand Total} = \text{Taxable Amount} \times \left(1 + \frac{\text{Tax \%}}{100}\right)$$

### 2. BOQ vs. Actual Financial Cost Variance
$$\text{BOQ Estimated Cost} = \sum (\text{BOQ Item Quantity} \times \text{Estimated Rate})$$
$$\text{Actual Cost} = \sum (\text{Delivered Purchase Order Item Cost}) + \sum (\text{Approved Outgoing Payments})$$
$$\text{Financial Variance} = \text{BOQ Estimated Cost} - \text{Actual Cost}$$
$$\text{Variance \%} = \left(\frac{\text{Financial Variance}}{\text{BOQ Estimated Cost}}\right) \times 100$$

### 3. Project Completion Progress
$$\text{Weighted Progress \%} = \sum \left( \frac{\text{Task Weight}}{\text{Total Project Weight}} \times \text{Task Completion \%} \right)$$

---

## 18. Error Handling

1. **Axios Response Interceptors**: Both `api.client.ts` and `interiorApi.client.ts` intercept HTTP 401 Unauthorized responses. If an access token expires, the interceptor pauses outgoing requests, invokes `/auth/refresh`, updates local storage, and replays failed requests transparently.
2. **User Toast Feedback**: API errors catch blocks pass user-friendly messages to `toast.error(err.response?.data?.message || 'Operation failed')`.
3. **Empty & Loading States**: Every major view component (`InteriorNewDashboardView`, `InteriorBoqView`, `InteriorTasksView`) renders explicit skeleton loaders or `Loader2` spinners while fetching, and contextual empty state illustrations when arrays are empty.

---

## 19. Environment Variables

*The following environment variable names are used in the application (secrets omitted):*

```text
NEXT_PUBLIC_API_BASE_URL               # Base URL for Sky-Lite core REST backend
NEXT_PUBLIC_INTERIOR_API_URL          # Base URL for Interior-OS microservice backend
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME     # Cloudinary cloud instance identifier
NEXT_PUBLIC_CLOUDINARY_API_KEY        # Cloudinary client API key
NEXT_PUBLIC_CLOUDINARY_API_SECRET     # [SECRET] Cloudinary API secret for SHA-1 signing
NEXT_PUBLIC_MAPBOX_TOKEN              # Mapbox access token for map tiles & geocoding
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY       # Google Maps Javascript API key
```

---

## 20. Dependencies

### Categorized Dependency Analysis (`package.json`)

#### Core Framework & React
- `next` (16.2.4): React App Router framework.
- `react` (19.2.4) & `react-dom` (19.2.4): Component rendering engine.
- `typescript` (^5): Static type checker.

#### UI & Design Utilities
- `tailwindcss` (^4) & `@tailwindcss/postcss`: Styling engine.
- `lucide-react` (^1.14.0): UI icon set.
- `framer-motion` (^12.38.0): Dynamic animations.
- `clsx` (^2.1.1) & `tailwind-merge` (^3.5.0): Dynamic CSS class merging.
- `class-variance-authority` (^0.7.1): Component variant styling.

#### API & Realtime
- `axios` (^1.16.0): HTTP client.
- `socket.io-client` (^4.8.3): Real-time web sockets.

#### Maps & Location
- `mapbox-gl` (^3.28.0) & `@mapbox/mapbox-gl-geocoder`: Mapbox mapping.
- `@react-google-maps/api` (^2.20.8): Google Maps integration.
- `leaflet` (^1.9.4) & `react-leaflet` (^5.0.0): Open-source Leaflet maps.

#### Data & Document Handling
- `date-fns` (^4.4.0): Date formatting.
- `html2pdf.js` (^0.14.0): Client PDF export.
- `recharts` (^3.9.0): Data visualization charts.
- `crypto-js` (^4.2.0): SHA-1 signatures for Cloudinary uploads.
- `js-cookie` (^3.0.5): Browser cookie management.
- `react-hot-toast` (^2.6.0): Toast notifications.
- `react-phone-number-input` (^3.4.17): Phone input formatting.

---

## 21. Configuration

- **`next.config.ts`**: Configures dev origins (`192.168.1.2`), API rewrite proxies (`/api/:path*` -> `process.env.NEXT_PUBLIC_API_BASE_URL`), and CORS response headers.
- **`proxy.ts`**: Next.js edge middleware matcher validating auth cookie existence before serving non-public routes.
- **`tsconfig.json`**: Configures TypeScript compiler settings, `strict: true`, and module alias path mapping (`@/*` -> `./src/*`).

---

## 22. Important Files

1. **`src/services/interiorProject.service.ts`**: Central service layer containing 50+ REST endpoint calls for all project sub-modules.
2. **`src/services/interiorApi.client.ts`**: Dedicated Axios client for the Interior-OS microservice with automatic 401 token refresh queueing.
3. **`src/services/interiorCrm.service.ts`**: CRM API service layer for leads, activities, and quotations.
4. **`src/lib/permissions.ts`**: Strategic RBAC permissions evaluation engine.
5. **`src/lib/interiorAuth.ts`**: Authentication session helper managing `interiorAccessToken` local storage keys.
6. **`src/lib/upload.ts`**: Cloudinary SHA-1 signed direct file uploader.
7. **`src/lib/crmValidation.ts`**: Validation library for lead forms and customer data.
8. **`src/providers/AuthContext.tsx`**: React Auth Context managing active user state, login, and logout.
9. **`src/app/interior-new/page.tsx`**: Executive Dashboard page route.
10. **`src/features/interior-new/components/InteriorNewDashboardView.tsx`**: Portfolio executive dashboard component with KPI cards and Recharts analytics.
11. **`src/app/interior-new/crm/page.tsx`**: CRM pipeline page route.
12. **`src/features/interior-new/components/crm/InteriorCrmView.tsx`**: CRM workspace orchestrator component.
13. **`src/features/interior-new/components/crm/modals/InteriorQuotationBuilderModal.tsx`**: Interactive multi-room quotation estimation modal.
14. **`src/app/interior-new/projects/[projectId]/layout.tsx`**: Master project command workspace shell layout.
15. **`src/features/interior-new/components/projects/InteriorBoqView.tsx`**: BOQ estimation, actuals tracking, and Excel import view.
16. **`src/features/interior-new/components/projects/InteriorProcurementView.tsx`**: Procurement list, PO generation, and vendor allocation view.
17. **`src/features/interior-new/components/projects/InteriorGRNModal.tsx`**: Goods Received Note material intake modal.
18. **`src/features/interior-new/components/projects/InteriorDprView.tsx`**: Daily Progress Reports logging view.
19. **`src/features/interior-new/components/projects/InteriorSnagsView.tsx`**: Snag list defect tracking view.
20. **`src/features/interior-new/components/projects/InteriorPaymentsView.tsx`**: Cash flow payments and debit notes tracking view.
21. **`src/features/interior-new/components/projects/InteriorHandoverView.tsx`**: Closeout inspection and handover checklist view.
22. **`src/features/interior-new/components/InteriorUsersRolesView.tsx`**: Organization team members and project role permissions view.
23. **`proxy.ts`**: Next.js edge middleware route guard.
24. **`next.config.ts`**: API proxy rewrites and CORS configuration.

---

## 23. Architecture Diagram

```text
                               SKYLITE WEB SYSTEM ARCHITECTURE
                               
       ┌─────────────────────────────────────────────────────────────────────────────┐
       │                             BROWSER / CLIENT                                │
       │                                                                             │
       │   ┌─────────────────────────────────────────────────────────────────────┐   │
       │   │                       Next.js App Router                            │   │
       │   │  (/interior-new, /crm, /projects/[id]/*, /users-roles, /dashboard)  │   │
       │   └──────────────────────────────────┬──────────────────────────────────┘   │
       │                                      │                                      │
       │                                      ▼                                      │
       │   ┌─────────────────────────────────────────────────────────────────────┐   │
       │   │                    React Context & State Layer                      │   │
       │   │  (AuthContext, ToastContext, SocketContext, Local Component State)  │   │
       │   └──────────────────────────────────┬──────────────────────────────────┘   │
       │                                      │                                      │
       │                 ┌────────────────────┴────────────────────┐                 │
       │                 ▼                                         ▼                 │
       │   ┌───────────────────────────┐             ┌───────────────────────────┐   │
       │   │   interiorCrm.service     │             │  interiorProject.service  │   │
       │   └─────────────┬─────────────┘             └─────────────┬─────────────┘   │
       │                 │                                         │                 │
       │                 └────────────────────┬────────────────────┘                 │
       │                                      │                                      │
       │                                      ▼                                      │
       │   ┌─────────────────────────────────────────────────────────────────────┐   │
       │   │                     interiorApiClient (Axios)                       │   │
       │   │         (Bearer Token Injection & Auto 401 Refresh Queue)           │   │
       │   └──────────────────────────────────┬──────────────────────────────────┘   │
       └──────────────────────────────────────┼──────────────────────────────────────┘
                                              │
                                              │ HTTPS REST Calls
                                              ▼
       ┌─────────────────────────────────────────────────────────────────────────────┐
       │                             EXTERNAL BACKENDS                               │
       │                                                                             │
       │   ┌─────────────────────────────────────┐   ┌───────────────────────────┐   │
       │   │      Interior-OS Backend API        │   │    Cloudinary REST API    │   │
       │   │ (interior-os-backend-two.vercel.app)│   │   (Image & Document CDN)  │   │
       │   └──────────────────┬──────────────────┘   └───────────────────────────┘   │
       │                      │                                                      │
       │                      ▼                                                      │
       │   ┌─────────────────────────────────────┐                                   │
       │   │          MongoDB Database           │                                   │
       │   │  (Leads, Projects, BOQs, POs, DPRs) │                                   │
       │   └─────────────────────────────────────┘                                   │
       └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 24. Potential Issues

### 1. Security: Cloudinary API Secret Exposed on Client Side
* **Location**: `src/lib/upload.ts` (`NEXT_PUBLIC_CLOUDINARY_API_SECRET`)
* **Severity**: High
* **Why**: Next.js exposes any environment variable prefixed with `NEXT_PUBLIC_` to the browser bundle. Using `NEXT_PUBLIC_CLOUDINARY_API_SECRET` to compute SHA-1 signatures in the browser exposes the secret key in bundle JS, allowing malicious users to delete or overwrite Cloudinary assets.
* **Suggested Approach**: Move Cloudinary signature generation to a server-side API route (e.g. `src/app/api/upload-signature/route.ts`) and fetch signed parameters on demand.

### 2. Architecture: Dual API Client Isolation Risk
* **Location**: `src/services/api.client.ts` vs `src/services/interiorApi.client.ts`
* **Severity**: Medium
* **Why**: The application maintains two separate Axios client instances with different token names (`token` vs `interiorAccessToken`) and base URLs. This can lead to session desynchronization where a user is logged into Sky-Lite core but unauthenticated in Interior-OS.
* **Suggested Approach**: Consolidate authentication sessions into a unified auth token or route all requests through Next.js server proxy handlers.

### 3. State Management: Deep Prop Drilling in Complex Sub-Views
* **Location**: `src/features/interior-new/components/projects/InteriorBoqView.tsx` & `InteriorProcurementView.tsx`
* **Severity**: Medium
* **Why**: Complex sub-views contain large monolithic components (e.g., `InteriorBoqView.tsx` is ~42KB, `InteriorProcurementView.tsx` is ~65KB) managing multiple modals and local states inside a single file.
* **Suggested Approach**: Break down large view files into modular sub-components and introduce React Context or Zustand for view-level state.

---

## 25. Developer Setup

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **Package Manager**: `npm` (v10+ shipped with Node 20)
- **Git**: Installed for version control

### 2. Installation
Clone the repository and install dependencies:
```bash
cd new-update-web-sklite
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_INTERIOR_API_URL=https://interior-os-backend-two.vercel.app
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_api_key
NEXT_PUBLIC_CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

### 4. Development Command
Run the local Next.js development server (configured to start on port 3001 in `package.json`):
```bash
npm run dev
```
Open [http://localhost:3001](http://localhost:3001) in your browser.

### 5. Build Command
Validate TypeScript types and build the production bundle:
```bash
npm run build
```

### 6. Linting Command
Run ESLint check:
```bash
npm run lint
```

---

## 26. Learning Path for New Developers

```text
 1. Core Architecture & Auth Setup
    ├── Read package.json & next.config.ts
    ├── Review src/services/interiorApi.client.ts (Axios Interceptors & Auth)
    └── Study src/lib/interiorAuth.ts & src/providers/AuthContext.tsx
         │
         ▼
 2. Layouts & Navigation
    ├── Review src/app/layout.tsx & proxy.ts (Middleware route protection)
    └── Inspect src/components/interior/ (InteriorShell, Header, Sidebar)
         │
         ▼
 3. Sales CRM & Lead Funnel
    ├── Explore src/app/interior-new/crm/page.tsx
    ├── Study src/features/interior-new/components/crm/InteriorCrmView.tsx
    └── Inspect Quotation Builder in InteriorQuotationBuilderModal.tsx
         │
         ▼
 4. Executive Dashboard & Analytics
    └── Study src/features/interior-new/components/InteriorNewDashboardView.tsx
         │
         ▼
 5. Projects Command Workspace
    ├── Review src/app/interior-new/projects/[projectId]/layout.tsx
    ├── Study WBS & Task tracking (InteriorWbsView.tsx, InteriorTasksView.tsx)
    ├── Study BOQ & Estimation (InteriorBoqView.tsx)
    └── Study Procurement & GRN Material Intake (InteriorProcurementView.tsx, InteriorGRNModal.tsx)
         │
         ▼
 6. Site Execution, Quality & Handover
    ├── Review Daily Progress Reports (InteriorDprView.tsx)
    ├── Review Snags & NCRs (InteriorSnagsView.tsx, InteriorNcrsView.tsx)
    └── Review Closeout Handover Checklist (InteriorHandoverView.tsx)
```

---

## 27. FINAL EXECUTIVE SUMMARY

### What is this project?
**SKYLITE Web (Interior-OS)** is a web-based enterprise Command Center and CRM platform built specifically for turn-key interior design and project execution businesses. It streamlines the complete interior lifecycle—from lead acquisition and interactive 3D design/quotation generation to Work Breakdown Structures (WBS), itemized Bill of Quantities (BOQ), vendor procurement, Daily Progress Reports (DPR), quality snags, variation orders, cash flow tracking, and client project handover.

### How does it work?
The application is built on **Next.js 16 (App Router)** and **React 19** using **TypeScript** and **Tailwind CSS**. It operates as a rich single-page client interface communicating asynchronously with external Node.js REST API microservices (`https://interior-os-backend-two.vercel.app/api/v1`). Authentication is managed via JWT Bearer tokens injected by custom Axios interceptors. File and drawing uploads are handled directly via signed Cloudinary REST endpoints.

### What are its main modules?
1. **CRM & Lead Pipeline**: Captures leads, schedules site visits, logs room requirements, builds quotations, and converts won leads to projects.
2. **Executive Portfolio Dashboard**: Displays aggregate KPIs, progress trends, pipeline revenues, and project health scores.
3. **Projects Command Center**: Manages individual project sub-systems across 26+ dynamic sub-routes.
4. **BOQ & Commercial Module**: Itemized room estimations, Excel template imports, version revisioning, and BOQ vs Actual variance.
5. **Procurement & Inventory**: Vendor rosters, Purchase Orders (PO), Goods Received Notes (GRN), and site inventory logs.
6. **Site Execution & Quality Control**: Daily Progress Reports (DPR), site photo logs, RFIs, quality snags, and Non-Conformance Reports (NCR).
7. **Payments & Change Management**: Incoming/outgoing cash flow tracking and formal Change Request/Variation Order approvals.
8. **Team & Role Management**: Organization-wide user roster and granular project-level role permission assignments.

### What are its most important APIs?
- `POST /auth/login` & `POST /auth/refresh`: Session authentication & token renewal.
- `GET /dashboard`: High-level portfolio KPI analytics.
- `GET /crm/customers` & `POST /crm/customers/:id/convert`: Sales lead pipeline & project conversion.
- `GET /projects/:id/boq` & `POST /projects/:id/boq/import`: BOQ management & Excel import.
- `GET /projects/:id/procurement` & `POST /projects/:id/inventory`: PO generation & GRN material intake.
- `GET /projects/:id/dpr` & `POST /projects/:id/snags`: Site progress logs & quality snag reports.

### What are its most important database models?
- `Customer / Lead`: Sales prospect details, requirements, site survey records, and quotation state.
- `Project`: Central project entity storing dates, status, budget history, and team members.
- `BOQ & BOQItem`: Itemized estimation structure, quantities, unit rates, and approval status.
- `PurchaseOrder & InventoryItem`: Vendor material commitments, GRN intake photos, and site stock balance.
- `DailyProgressReport (DPR)`: Daily site log, work summaries, labor count, and blocker reports.
- `Snag`: Quality defect records with severity levels, location tags, and closure status.
- `User & Role`: User identity, global system roles, and project-specific permissions.

### What are its most important business workflows?
1. **Lead-to-Project Conversion**: Lead Creation -> Site Survey -> Log Requirements -> Quotation Email -> Lead Won -> Auto Convert to Active Project.
2. **Material Procurement & Intake**: BOQ Items -> Issue Purchase Order -> Material Arrival -> GRN Inspection & Photos -> Inventory Stock Intake -> Site Usage Log.
3. **Quality & Snag Resolution**: Site Inspection -> Log Snag Defect -> Assign Engineer -> Remediation -> Inspection Sign-off -> Snag Closed.

### What files should a new developer understand first?
1. `src/services/interiorProject.service.ts` (Core REST API integration)
2. `src/services/interiorApi.client.ts` (Axios HTTP client & token handling)
3. `src/lib/permissions.ts` (RBAC permissions engine)
4. `src/lib/interiorAuth.ts` (Session persistence)
5. `src/app/interior-new/projects/[projectId]/layout.tsx` (Project workspace shell)
6. `src/features/interior-new/components/projects/InteriorBoqView.tsx` (BOQ module)

### What are the biggest technical risks?
1. **Client-Side Cloudinary Secret Exposure**: `upload.ts` uses `NEXT_PUBLIC_CLOUDINARY_API_SECRET` in client JavaScript, exposing the secret key in browser bundles.
2. **Dual Client Session Divergence**: Maintenance of two separate Axios clients (`api.client.ts` vs `interiorApi.client.ts`) with distinct token keys (`token` vs `interiorAccessToken`).
3. **Monolithic Component Size**: Massive single-file components (`InteriorProcurementView.tsx` ~65KB, `InteriorBoqView.tsx` ~42KB) combining state management and complex UI logic into single files.
