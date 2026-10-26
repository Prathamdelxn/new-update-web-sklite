# SKYLITE Web (Interior-OS Platform) — Project Documentation

> **Package Name:** `skystruct-lite` | **Version:** `0.1.0`  
> **Framework:** Next.js 16.2.4 (App Router) · React 19.2.4 · TypeScript 5.x · Tailwind CSS v4  
> **Primary Purpose:** Enterprise Turn-Key Interior & Construction Project Management, CRM, BOQ Estimations, Site Supervision, Procurement & Financial Operations Platform.

---

## 📋 Table of Contents
1. [Project Overview & Purpose](#-project-overview--purpose)
2. [Target Audience & Role Permissions](#-target-audience--role-permissions)
3. [Core Feature Breakdown](#-core-feature-breakdown)
4. [Technology Stack & Dependencies](#-technology-stack--dependencies)
5. [Directory & Project Architecture](#-directory--project-architecture)
6. [Design System & Theme Specifications](#-design-system--theme-specifications)
7. [Environment & Configuration](#-environment--configuration)
8. [API Services & WebSockets Integration](#-api-services--websockets-integration)
9. [Development & Deployment Commands](#-development--deployment-commands)
10. [Current Development Status](#-current-development-status)

---

## 🎯 Project Overview & Purpose

**SKYLITE Web** (incorporating the **Interior-OS Module**) is a full-featured web application engineered specifically for interior design firms, turn-key interior contractors, commercial estimators, site engineers, procurement officers, and clients. 

It provides end-to-end digitisation across the complete project lifecycle:
* **Pre-Construction:** Lead capture, site survey notes, requirement gathering, and interactive quotation generation.
* **Costing & BOQ:** Itemized room-by-room Bill of Quantities (BOQ), Excel template imports/exports, revision history, and variance tracking.
* **Execution & Site Operations:** Work Breakdown Structure (WBS), Gantt timelines, Kanban task boards, Daily Progress Reports (DPR), site photo registers, RFIs, Snags, and Quality Non-Conformance Reports (NCR).
* **Commercial & Procurement:** Vendor registry, Purchase Orders (PO), Goods Received Notes (GRN), inventory tracking, variation orders, and change requests.
* **Financials:** Client milestone billing, outgoing vendor payment dispatch, debit notes, and budget vs. actual tracking.

---

## 👥 Target Audience & Role Permissions

The platform supports fine-grained access control across 6 core user roles:

| Role | Operational Scope & Access Level |
| :--- | :--- |
| **SuperAdmin** | Global system administration, multi-tenant workspace management, audit logs, subscription billing. |
| **Organization Admin (`Admin`)** | Organization-wide access, CRM lead pipeline, financial approvals, team role assignments, project creation. |
| **Project Manager** | Full administrative rights over assigned projects, WBS timelines, task delegation, BOQ revisions, change orders. |
| **Site Engineer** | Field access for submitting DPRs, raising RFIs, recording site snags, uploading site photos, and logging material receipts. |
| **Procurement Officer** | Management of vendor lists, RFQs, Purchase Orders (PO), Goods Received Notes (GRN), and material receipts. |
| **Client / Viewer** | Read-only access to progress timelines, quotation approvals, site photo feeds, and snag resolution status. |

---

## 🚀 Core Feature Breakdown

### 1. Lead & CRM Management (`/interior-new/crm`)
* **Sales Funnel Pipeline:** Lead tracking through stages (*New Lead*, *Requirement Gathering*, *Site Visit*, *Quotation Sent*, *Contract Signed*, *Won/Lost*).
* **Site Survey Logs:** Measurement forms, site condition notes, structural parameters.
* **Interactive Quotation Builder:** Room-by-room pricing engine with custom margin controls and automated PDF output.
* **Auto-Conversion:** One-click conversion of won CRM leads directly into active interior projects.

### 2. Project Workspace (`/interior-new/projects/[projectId]`)
Each project workspace features 26+ dedicated operational modules:
* **Details & Overview (`sitedetails`):** Key metrics, status pills (9 project states), client info, timeline tracking.
* **Work Breakdown Structure (`wbs`):** Multi-level hierarchical WBS tree structure.
* **Task & Schedule (`tasks`, `timeline`, `milestones`):** Interactive Gantt charts, Kanban task boards, milestone dependencies.
* **BOQ & Costing (`boq`):** Grouped BOQ items, Excel template import/export, item status workflow (*Draft*, *Pending*, *Approved*).
* **Procurement & PO (`procurement`, `purchase-orders`, `vendors`):** Vendor directory, purchase orders, inventory intake, material requests.
* **Quality & Field Supervision (`snags`, `ncrs`, `rfis`):** Snag tracking with photo attachments, Non-Conformance Reports, Request for Information logs.
* **Site Progress & Communication (`dpr`, `weekly-reports`, `mom`):** Daily Progress Reports, weekly summaries, Minutes of Meeting notes.
* **Financial Control (`payments`, `variation-orders`, `change-requests`):** Client invoices, vendor payment receipts, Scope Change Requests, Variation Orders.
* **Document & Drawing Registry (`drawings`, `photos`, `filemgt`):** Architectural plan management, categorized site photo gallery, file attachments.
* **Handover & Utilities (`handover`, `utilities`, `risks`, `members`):** Handover checklists, risk registers, team permissions, utility tracking.

### 3. SuperAdmin Platform (`/superadmin`)
* **Tenant Management:** Organization onboarding and workspace configuration.
* **Audit & Compliance:** System-wide activity audit logs (`/interior-new/audit`).
* **User & Role Governance:** System role assignments (`/interior-new/users-roles`).

---

## 🛠 Technology Stack & Dependencies

### Core Frameworks
* **Next.js 16.2.4** (App Router architecture)
* **React 19.2.4**
* **TypeScript 5.x**
* **Tailwind CSS v4** (PostCSS integration)

### UI Components & Utilities
* **Icons:** `lucide-react` (v1.14.0)
* **Animations:** `framer-motion` (v12.38.0)
* **Charts & Analytics:** `recharts` (v3.9.0)
* **Maps & Geo-location:** Mapbox GL (`mapbox-gl` v3.28.0), `@mapbox/mapbox-gl-geocoder`, `@react-google-maps/api`, Leaflet (`leaflet` v1.9.4 & `react-leaflet` v5.0.0)
* **PDF Export:** `html2pdf.js` (v0.14.0)
* **Notifications:** `react-hot-toast` (v2.6.0)

### State, Data & Networking
* **State & Query Management:** `@tanstack/react-query` (v5.103.2)
* **HTTP Client:** `axios` (v1.16.0) with automated auth token interceptors
* **Real-time WebSockets:** `socket.io-client` (v4.8.3)
* **Cookies & Security:** `js-cookie` (v3.0.5), `crypto-js` (v4.2.0)

---

## 📁 Directory & Project Architecture

```
skystruct-lite/
├── src/
│   ├── app/                                 # Next.js App Router Pages & Routes
│   │   ├── construction-dashboard/          # Construction metrics dashboard
│   │   ├── interior-new/                    # Main Interior-OS application routes
│   │   │   ├── audit/                       # Activity audit logs page
│   │   │   ├── crm/                         # Lead CRM & quotation pages
│   │   │   ├── profile/                     # User profile management
│   │   │   ├── projects/                    # Project list & workspace
│   │   │   │   └── [projectId]/             # 26+ project workspace tab subroutes
│   │   │   └── users-roles/                 # Organization user roles page
│   │   ├── login/                           # Authentication - Login page
│   │   ├── register/                        # Authentication - Registration page
│   │   ├── reset-password/                  # Password recovery workflow
│   │   ├── share/                           # Public shareable document links
│   │   ├── superadmin/                      # SuperAdmin command center
│   │   ├── layout.tsx                       # Root layout (Auth, Toast, Socket Providers)
│   │   └── globals.css                      # Tailwind v4 directives & design tokens
│   ├── components/                          # UI Component Library
│   │   ├── crm/                             # CRM & lead management components
│   │   ├── interior/                        # Interior header, sidebar, shell, banner
│   │   ├── layouts/                         # Page shells & navigation bars
│   │   ├── modals/                          # Modal dialogs (Create Project, BOQ, etc.)
│   │   ├── settings/                        # Settings forms & preferences
│   │   ├── shared/                          # Reusable UI widgets
│   │   ├── skeletons/                       # Loading skeleton components
│   │   ├── superadmin/                      # Superadmin management UI
│   │   └── ui/                              # Core design system components (GlassCard, etc.)
│   ├── context/                             # React Contexts (AuthContext, ToastContext, SocketContext)
│   ├── lib/                                 # API clients, axios interceptors, utils
│   ├── services/                            # API service calls
│   └── types/                               # TypeScript interfaces & type definitions (21 models)
├── public/                                  # Static assets & public assets
├── .env.local                               # Local environment variables
├── currentstatus.md                         # Detailed development progress log
├── next.config.ts                           # Next.js configuration settings
├── package.json                             # Package manifest & dependency tree
└── tsconfig.json                            # TypeScript config
```

---

## 🎨 Design System & Theme Specifications

The entire application adheres to a clean, enterprise **Light Theme** design language:

| Token Key | CSS Class / Value | Description |
| :--- | :--- | :--- |
| **Page Background** | `bg-[#F8FAFF]` | Main soft blue-gray page canvas |
| **Card Canvas** | `bg-white` | White elevation surface |
| **Borders** | `border border-gray-200` | Subtle structural dividers |
| **Heading Text** | `text-gray-900` | High contrast primary typography |
| **Secondary Text** | `text-slate-500` | Body & caption secondary text |
| **Primary Action** | `bg-blue-600 hover:bg-blue-500 text-white` | Accent buttons & interactive elements |
| **Input Fields** | `bg-gray-50 border border-gray-200 text-gray-900` | Standard form field style |
| **Success Badge** | `text-emerald-700 bg-emerald-100 border-emerald-200` | Active / Approved / Completed states |
| **Danger Badge** | `text-red-700 bg-red-100 border-red-200` | High risk / Overdue / Rejected states |
| **Warning Badge** | `text-amber-700 bg-amber-100 border-amber-200` | Pending / In-review states |
| **Card Radius** | `rounded-2xl` | Modern rounded container geometry |
| **Typography** | Inter (`next/font/google`) | Clean corporate sans-serif typeface |

---

## 🌐 Environment & Configuration

Environment variables configured in `.env.local`:

```env
# REST API Backend Base URL
NEXT_PUBLIC_API_URL=https://v2-lite-backend-saas-dtw3.vercel.app/api

# WebSocket Server URL
NEXT_PUBLIC_SOCKET_URL=https://socket-7ezc.onrender.com

# Cloudinary Storage Configurations
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dfyu429bz
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=sky_lite_preset
```

---

## ⚡ API Services & WebSockets Integration

* **REST API Axios Interceptor (`src/lib/api.ts`):** Automatically injects the `Bearer <token>` from `localStorage` into all request headers. Automatically intercepts `401 Unauthorized` responses to execute token refresh via `POST /auth/refresh` or redirect to `/login`.
* **Real-time WebSockets (`src/context/SocketContext.tsx`):** Connects to socket server with authenticated JWT session. Enables real-time updates for live project discussions, notification pushes, and task state changes via `joinProject(projectId)` channel subscriptions.

---

## 💻 Development & Deployment Commands

Run these scripts from the project root directory:

```bash
# Start development server on port 3001
npm run dev

# Execute ESLint verification
npm run lint

# Build production bundle
npm run build

# Start production server
npm run start
```

---

## 📊 Current Development Status

* ✅ **Phase 0 (Foundation & Infrastructure):** Complete (Auth context, API interceptors, Socket provider, Light theme tokens, UI Shell).
* ✅ **Phase 1 (Authentication):** Login, Registration, JWT handling, Onboarding carousel.
* ✅ **Phase 2 (Project Management):** Project dashboard, creation modal, project workspace tab layout.
* ✅ **Phase 3 (BOQ & Costing):** Grouped BOQ tables, BOQ modal, Excel template import engine.
* ✅ **Phase 4 (Procurement & Materials):** Vendor directory, purchase order management, GRN tracking.
* ✅ **Phase 5 (Site Operations & Quality):** Snags logging, NCR management, RFI tracking, DPR submissions.
* 🔄 **Phase 6 (Handover & Multi-tenant):** Finalizing handover sign-off workflows and superadmin audit views.

---

*Document generated automatically for SKYLITE Web project repository.*
