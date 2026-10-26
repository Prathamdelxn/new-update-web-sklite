# Interior: Mobile App Pending Changes

Tracks what the **interior** module still needs in the mobile app (`new-update-sk-mobile`) so it matches the web (`new-update-web-sklite`). It also tracks the status of the action items from the **13 Oct 2026 meeting** (`Meeting_Changes_Action_Items_13_Oct_2026.docx`). Construction is out of scope.

- **Last checked:** 26 Oct 2026, against `main` of the web, interior backend (`interior-os-backend`) and mobile repos.
- **Last mobile update:** 26 Oct 2026. Items marked "done 26 Oct" are in the mobile repo's working copy and not yet in a build.
- **How to update:** when an item ships on mobile, tick it and add the date. Move items between sections as they're built.

Status key: ✅ done · 🟡 partly done · ❌ not started · ➖ not applicable

---

## 1. Meeting action items (13 Oct 2026)

| # | Item | Backend | Web | Mobile | Notes |
|---|---|---|---|---|---|
| 1 | Customer requirements interface (customer fills in their requirements) | ✅ | ✅ | ✅ | Done 26 Oct. Backend `7d9344a`: the lead's share link has a `requirements` mode (`POST /crm/customers/:id/share` with `mode: 'requirements'`), and the client submits through `POST /public/crm/:token/requirements` into `lead.clientRequirements` / `clientRequirementsNotes` / `clientRequirementsSubmittedAt`. Web: public page `/share/requirements/[token]` plus the intake ribbon and comparison view (see `src/latest.md`). Mobile (working copy): the same intake ribbon (Preview Form / Share or Generate Link / WhatsApp), requirements mode in the share modal, and the comparison view. |
| 2 | Show customer-submitted info in the Drawing module (Site Visit + Requirements → Drawing) | ✅ | ✅ | ✅ | Marked done in the meeting notes. Both apps show site-visit and requirement data on the lead, and drawings unlock after requirements. Once #1 exists, also show customer-submitted requirements there. |
| 3 | Excel import of measurement data (abstract vs raw) | 🟡 | 🟡 | 🟡 | Project BOQ Excel import exists on both (`POST /projects/:id/boq/import`). The raw measurement-data import is **to do / later phase**. Scope of "abstract" vs "raw" still to confirm. |
| 4 | Calculate budget rates from measurements | ❌ | ❌ | ❌ | Measurement → import → rate/budget by area. |
| 5 | Generate BOQ quantity and budget from that | ❌ | ❌ | ❌ | Depends on #3 and #4. |
| 6 | Show BOQ version / last-updated info | ✅ | ✅ | ✅ | CRM BOQs: the backend stores created by/at and updated by/at. Web (lead page BOQ preview) and mobile (done 26 Oct) show the version, created date, "By <creator>" and "Updated <date> by <name>". Project BOQs show version labels only. Still to confirm whether a full version history is wanted. |
| 7 | Send vendor quotation with item price set to 0 | ❌ | ❌ | ❌ | The vendor email and quotation still carry prices and a "Reference Amount". |
| 8 | Remove Terms & Conditions from the quotation | ✅ | ✅ | ✅ | Mobile done 26 Oct: the builder field is now "Quotation Notes / Remarks (Optional)", and the quotation view and PDF no longer add default terms (they show notes only when there are some). |
| 9 | Connect WBS and BOQ (measurement sheet → budget; dismantling, civil fitting in WBS) | ❌ | ❌ | ❌ | No link between WBS nodes/activities and BOQ items yet. |
| 10 | WBS activities with sub-items (e.g. Dismantling → sub-items), name + description | ✅ | ✅ | ✅ | WBS hierarchy (building → floor → zone → area → package), activities with subtasks and descriptions. |
| 11 | Auto-calculate activity duration from start/end dates | ❌ | ❌ | ❌ | No duration field or calculation in the WBS/activity forms. |
| 12 | Milestones linked to the WBS | ✅ | ✅ | ✅ | Activities marked "Milestone Activity" in WBS feed the Milestones tab. Confirm whether milestone dates should also be **calculated** from WBS dependencies. |
| 13 | Track actual start and actual end dates | 🟡 | 🟡 | 🟡 | Actual **end** is recorded automatically on completion (`completedAt`). Actual **start** isn't captured. "Use feed of project" still to clarify. |
| 14 | Show actual dates in the Gantt chart | ➖ | 🟡 | 🟡 | Web and mobile show the actual completion date. Mobile done 26 Oct: "Done <date>" under the task (with "· Nd late" when after the planned end) and a marker on that day. Actual start isn't captured anywhere yet. |
| 15 | Client commercial billing: running account (RA) bills | ❌ | ❌ | ❌ | Payments only has incoming / outgoing / debit notes. |
| 16 | Connect BOQ with RA bills | ❌ | ❌ | ❌ | Depends on #15. |

**Still to confirm with the client (from the meeting doc):** the scope of "abstract" vs "measurement / raw data"; what "BOQ versioning" means; whether milestone and actual dates are calculated from WBS or entered by hand; what "use feed of project" means; and the "RA bill" terminology.

---

## 2. Web features missing on mobile (interior)

### Missing screens
- [x] **Confirm Order** (done 26 Oct). New "Confirm Order" tab on the CRM lead (CRM Quotations permission) and a project Confirm Order screen under General (project `confirm_order` permission, via `GET/PATCH /projects/:id/confirm-order`). Both use `app/components/interior/ConfirmOrderView.jsx`, which mirrors the web: vendors each quotation was dispatched to, one document per vendor, view quotation, remove vendor, and signed-contract / waste files.
  - Note: the web's "Create Confirm Order" modal (`InteriorCreateConfirmOrderModal`) is never opened from any web screen, so it isn't ported.
- [ ] **Drawing studio:** open a drawing, annotate it, raise snags pinned to the drawing. Web: `/crm/leads/[id]/drawings/[drawingId]` and `/projects/[projectId]/drawings/[drawingId]`. **Next big item.**
- [x] **Vendor Management (org-wide)** (done 26 Oct). Settings → Workspace Tools → Vendor Management (shown with Vendors View permission). Route `/interior-vendors` reuses the project Vendors screen; without a project it shows contact details instead of PO stats.
- [x] **Comparative requirements view** (done 26 Oct): `app/components/crm/ClientRequirementsCompare.jsx` has the two summary cards (client link vs technical person), Side-by-Side / Client Wishlist / Team Brief filters, and the room matrix (stacked on phones).
- [x] **Client requirement link** (done 26 Oct): intake portal ribbon on the Requirements tab; `CrmShareModal` takes `mode="requirements"` (client-form URL, no drawing-approval check, "Never" expiry by default, intake WhatsApp message).

### Missing actions on existing screens
- [x] **Project BOQ editing** (done 26 Oct). "Edit BOQ" on draft / rejected BOQs (BOQ Update permission), saved with `PUT /projects/:id/boq/:boqId`. Item fields the form doesn't show (description, brand, section, remarks) are kept.
- [x] **Procurement award e-mail** (done 26 Oct). Awarding a quote now e-mails the supplier (`send-award-email`) or opens WhatsApp when there's no e-mail, same as the web.
- [x] **Minutes of Meeting edit and delete** (done 26 Oct). MoM Update / Delete permissions.
- [x] **Site Photos delete** (done 26 Oct). Photos Delete permission.
- [x] **RFIs delete** (done 26 Oct). RFIs Delete permission. Also, "Mark Resolved & Close" now needs RFIs Update; it used to show to everyone.
- ~~Variation Orders edit; VO / Change Request detail view~~: removed from the list. The web service has these calls, but no web screen uses them, so they aren't web features.

### Meeting items that are done on web but not on mobile
- [x] **Remove Terms & Conditions** from the mobile quotation builder, view and PDF (meeting #8, done 26 Oct).
- [x] **Show actual completion date in the mobile timeline** (meeting #14, done 26 Oct).

### Config to check
- Mobile `.env` has `EXPO_PUBLIC_WEB_APP_URL=https://new-update-two.vercel.app`, but the live web is `https://new-update-web-sklite.vercel.app`. This URL is used for links sent to vendors and clients (award e-mail PO link, CRM share links). Confirm which is right before the next build.

### Mobile-only (no web equivalent)
- **NCRs** screen (`app/i-project/[id]/ncrs.jsx`). The web removed NCRs. Decide whether to keep or remove it on mobile.

---

## 3. Already at the same level (no action)

Leads (create, edit, lost, reopen, share), follow-ups, site visits, requirements, CRM drawings with approvals, CRM BOQ and quotation builders, sending quotations, lead → project conversion. Also the dashboard, team/members, WBS, tasks (subtasks, dependencies, comments), milestones with delays, timeline, DPR and weekly reports (with PDF), risks, snags, utilities, file management, payments, handover, audit, users and roles (org + project roles), settings and change password, and permission checks on every screen (including live refresh of permissions).

---

## Suggested order for mobile

1. ~~Confirm Order~~ ✅
2. ~~Quick fixes (Terms & Conditions, MoM edit/delete, photo / RFI delete, timeline actual date)~~ ✅
3. ~~Project BOQ editing~~ ✅
4. ~~Vendor Management screen~~ ✅
5. ~~Award e-mail in procurement~~ ✅
6. **Drawing studio** with annotations (next)
7. Comparative requirements and the client requirement link, once the backend for meeting #1 exists

The remaining meeting items (#3–5, #7, #9, #11, #13–16) aren't built on web or backend either. Build them on backend and web first, then add them to mobile.

---

## 4. Tester comparison, web vs app (26 Oct): all addressed (mobile working copy, not yet in a build)

| Area | Change |
|---|---|
| Dashboard | Cards now match web: Total Leads, New Leads, Active Pipeline, Won Projects, Active Projects, Open Snags. Progress Trend shows Planned **and** Actual. CRM Lead Pipeline and Procurement charts added. Top Projects has the completion bar. The dashboard shows even with no active projects. "User Management" shortcut opens interior Users & Roles. |
| Dashboard (backend + web) | **Progress Trend was fake** ("planned" = actual + 8%, scaled over 6 months). Now real: planned = % of activities due by each month end, actual = % completed by then (this month: live progress). The Project Health donut no longer leaves gaps or an empty ring for zero counts. |
| Overview | "Mobile Number" card replaced by **Est. Budget**. Added **Site & Project Location** (copy address, open in Maps, edit) and **Lead & Contact Info**. |
| Follow-ups | Added the "**<Type> Touchpoint**" header and **Touchpoint Objective & Goal**. History now lists **every** follow-up (it used to show only completed ones, so a newly created follow-up didn't appear). |
| Follow-up forms | Type and Assign Member are dropdowns. Reschedule shows the **previously scheduled** date first. |
| Add / Edit lead | Property Type is a dropdown. |
| Site Visits | **Site Visit Briefing & Details** card (status, instructions, schedule, member, scope, location). Sections renamed to Spatial Dimensions / Openings & Structure / MEP & Utility Services / Furniture & Constraints (always shown). "Site Photos & Visual Records". **Photos weren't visible** because mobile loaded the lead from the list endpoint, which leaves photos out; it now uses the single-lead endpoint like the web. |
| Requirements | **Requirements Briefing & Specifications** card. |
| Drawings | Tab renamed "Drawings". **2D & 3D Design Drawings & Models** header card. All / 2D / 3D filter. **Card images fixed** (they only showed when `fileType` was exactly "image"). |
| BOQ | **Bill of Quantities (BOQ) & Estimations** header and **Internal Approval** section with Send for Approval / Approve / Reject (this workflow didn't exist on mobile). BOQ shown in detail, grouped by section with subtotals. "Pass to Quotation" only after the BOQ is approved, as on the web. |
| Quotations | Send to **Vendor** (vendor list or manual) replaces "Custom Email". Preview matches the web layout (Details block, watermark) with "Total Scope: N Items" in the header and in the details. **Notes & Remarks now sit below the grand total** (an unclosed HTML tag pushed them beside the totals). |

### WBS (26 Oct)
- The tester's "WBS totally different" comes from an **old build**. Before mobile commit `5e2da58` (23 Oct), mobile WBS was the old Building → Floor → Zone tree. That commit rewrote it to the web's flat model: WBS elements with name, description, planning dates and Active/Inactive status, activities underneath, create-with-activities, and an activity form with the completed lock, WBS date limits and the milestone option.
- Behaviour now matched to web (26 Oct, working copy):
  - Editing an activity no longer resets its progress to 0%.
  - The completion checkbox reopens an activity as In Progress / 50% and records the completion date.
  - A new activity starts with empty dates.
  - The assignee list shows each member's real project role.
  - Header reads "N WBS Elements • N Activities".
- Mobile-only extra kept: the overall progress strip with expand/collapse-all.
