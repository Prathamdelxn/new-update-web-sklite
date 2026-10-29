# Customer Requirements Intake Interface — Architecture & Implementation
 
A comprehensive guide to the **Client Self-Service Requirements Intake Portal** and its **Dual-Perspective CRM Integration** in the Sky-Lite Interior module.
 
---
 
## 1. Executive Summary & Objective
 
In interior design workflows, requirements gathering traditionally happens in one of two ways:
1. **The Client** has a vision, aesthetic preferences, furniture wishlists, and inspiration.
2. **The Technical Person (Designer/Consultant)** surveys the site and logs technical specifications (dimensions, MEP electrical/plumbing, false ceiling, flooring, structural constraints).
 
### The Solution Built
We implemented an **end-to-end Dual-Input System**:
- **Client Public Link**: Clients receive a secure, branded public link (`/share/requirements/[token]`) where they self-fill their room-by-room wishlist, design style, furniture choices, lighting, colors, and overall budget.
- **Independent Technical Specifications**: Our technical consultant can independently log structural and MEP specifications in the CRM.
- **Side-by-Side CRM Matrix**: Both submissions coexist without data loss or overwriting, visible side-by-side in the CRM **Requirements** tab.
 
---
 
## 2. Architecture & Data Flow
 
```mermaid
flowchart TD
    subgraph CRM_Admin [CRM Workspace]
        A["CRM Lead Details Screen"] --> B["Generate/Share Public Link"]
        B --> C["Share Link via WhatsApp or Email"]
        K["Requirements Tab"] --> L["InteriorComparativeRequirementsView"]
        M["Technical Consultant"] --> N["InteriorLogRequirementsModal"]
        N --> O["lead.requirements (Technical Specs)"]
        O --> L
    end
 
    subgraph Public_Portal [Client Public Portal (/share/requirements/:token)]
        C --> D["Client Opens Portal on Mobile or Desktop"]
        D --> E["Fetches Public Lead & Org Data (GET /share/:token)"]
        E --> F["Client Fills Room Wishlist & Aesthetics"]
        F --> G["Client Clicks 'Submit Requirements'"]
        G --> H["PUT /share/:token/requirements"]
        H --> I["lead.clientRequirements"]
        H --> J["Log CRM Activity & Submission Timestamp"]
    end
 
    I --> L
    L --> P["Side-by-Side Comparison Matrix"]
```
 
---
 
## 3. Customer Portal Implementation (`/share/requirements/[token]`)
 
### 3.1 Key Route & File
- **Page File**: [`src/app/share/requirements/[token]/page.tsx`](file:///c:/Users/Mahesh%20Indalkar/Desktop/web/new-update-web-sklite/src/app/share/requirements/%5Btoken%5D/page.tsx)
- **Public URL**: `https://your-domain/share/requirements/[token]`
 
### 3.2 Security & Token Access
- **No Login Required**: The portal uses a secure, random `shareToken` generated per lead.
- **Link Controls**:
  - Validates `shareSettings.isPublic` (if revoked, displays "Link Inactive").
  - Validates expiration timestamp `shareSettings.expiresAt`.
  - Re-activable from CRM anytime with a 7-day default validity.
 
### 3.3 Visual Identity & Header
- **Branded Experience**:
  - Displays the Interior Design Studio’s logo and name.
  - Personalized title: `[Client Name]'s Interior Brief`.
  - Direct telephone link to call the studio.
  - Direct link to `View Drawings` if 2D/3D design layouts are also published for the client.
 
### 3.4 Room-by-Room Wishlist Builder
Clients can configure multiple spaces with preset templates or custom names:
 
1. **Common Room Presets (1-Click Add)**:
   - Living Room, Master Bedroom, Modular Kitchen, Dining Area, Kids Bedroom, Guest Bedroom, Foyer / Entryway, Balcony, Pooja Room, Home Office / Study, Walk-in Wardrobe, Bathrooms.
2. **Popular Style Selector**:
   - Modern Minimalist, Contemporary, Scandinavian, Japandi, Industrial Luxury, Classic Traditional, Bohemian Chic, Warm Neutral, Art Deco.
3. **Configurable Room Fields**:
   - **Room Name & Space Category**: e.g., Master Bedroom (Residential).
   - **Preferred Design Style**: Curated style selection pills.
   - **Furniture & Fixtures Wishlist**: King bed, floating nightstands, ergonomic chair, etc.
   - **Storage Preferences**: Sliding wardrobes, hydraulic storage, loft units.
   - **Lighting Preferences**: Warm ambient, cove lighting, pendant lights.
   - **Color Palette & Materials**: Neutrals, fluted panels, brass accents, oak wood.
   - **Client Room Notes**: Unconstrained notes and specific directives.
   - **Target Room Budget**: Optional individual budget allocation.
4. **Interactive Controls**:
   - **Duplicate Space**: Clones a room configuration in 1 click (e.g. "Bedroom 2 (Copy)").
   - **Collapse / Expand Accordion**: Clean navigation for large 4BHK/villa submissions.
   - **Delete Space**: Remove unwanted spaces.
 
### 3.5 Global Project Directives
- **Target Overall Budget**: Client enters their planned investment range (e.g., ₹15L - ₹25L).
- **General Notes & Living Style**: Vision statement, move-in timelines, family living habits, or special constraints (e.g., pet-friendly materials, elderly accessibility).
 
### 3.6 Submission & Confirmation
- Submits via `interiorCrmService.submitClientRequirements(token, payload)`.
- Smooth scroll to top with celebratory green verification banner.
- Allows clients to return to the link anytime to view or refine their submitted wishlist.
 
---
 
## 4. CRM Integration & Team Workflow
 
### 4.1 Sharing the Intake Link
In the lead’s CRM profile ([`src/app/interior-new/crm/leads/[id]/page.tsx`](file:///c:/Users/Mahesh%20Indalkar/Desktop/web/new-update-web-sklite/src/app/interior-new/crm/leads/%5Bid%5D/page.tsx)):
1. **Client Requirements Intake Portal Ribbon**:
   - Shows real-time status: `Active` / `Unpublished` and `Client Submitted` / `Awaiting Client`.
   - **Preview Form**: Opens the public portal in a new tab.
   - **Share Link**: Opens modal with custom expiration controls and link copying.
   - **WhatsApp**: Instantly opens WhatsApp Web/Mobile with a pre-filled invitation message and direct link.
 
### 4.2 Dual-Perspective Display in Requirements Tab
Rendered via [`src/features/interior-new/components/crm/InteriorComparativeRequirementsView.tsx`](file:///c:/Users/Mahesh%20Indalkar/Desktop/web/new-update-web-sklite/src/features/interior-new/components/crm/InteriorComparativeRequirementsView.tsx):
 
1. **Top Dual Summary Cards**:
   - **Submitted via Client Link ([Client Name])**:
     - Shows submission status (`Client Submitted` with date/time or `Awaiting Submission`).
     - Spaces configured by client.
     - Client's target budget.
   - **Our Technical Person ([Assigned Name])**:
     - Shows survey status (`Specs Recorded` or `Survey Pending`).
     - Surveyed spaces count.
     - Direct button: **"Edit Technical Specs"** or **"Log Technical Specs"**.
2. **View Filter Pills**:
   - `Side-by-Side Matrix`: 2-column comparative layout.
   - `Client Wishlist`: View only what the client submitted through the link.
   - `Team Technical Brief`: View only the technical architectural specifications.
3. **Side-by-Side Room Matrix**:
   - **Left Column**: `Submitted by Client through Link ([Client Name])`
     - Design style badge, furniture wishlist, storage, lighting, color palette, and notes.
   - **Right Column**: `Filled by Our Technical Person ([Technical Person Name])`
     - Dimensions, room usage, electrical MEP, plumbing points, false ceiling, and flooring specs.
 
### 4.3 Technical Team Logging Modal
Rendered via [`src/features/interior-new/components/crm/modals/InteriorLogRequirementsModal.tsx`](file:///c:/Users/Mahesh%20Indalkar/Desktop/web/new-update-web-sklite/src/features/interior-new/components/crm/modals/InteriorLogRequirementsModal.tsx):
- Our technical person can log detailed architectural and MEP specifications:
  - Dimensions & Carpet Area
  - False Ceiling & Ceiling Type
  - Flooring & Wall Finishes
  - Electrical & Power Points
  - Plumbing & Water Drainage
  - Circulation & Clearances
- When saved, updates `lead.requirements` without touching `lead.clientRequirements`.
 
---
 
## 5. Data Model & Field Mapping
 
| Data Entity | Storage Location on Lead | Filled By | Description |
|---|---|---|---|
| **Client Room Wishlist** | `lead.clientRequirements` | Client via Portal | Array of rooms, furniture requests, lighting, colors, styles |
| **Client General Notes** | `lead.clientRequirementsNotes` | Client via Portal | Overall directives and aesthetic vision |
| **Client Submission Time** | `lead.clientRequirementsSubmittedAt` | Backend System | Timestamp when client clicked submit |
| **Technical Specifications** | `lead.requirements` | Technical Consultant | Structural dimensions, MEP electrical, plumbing, false ceiling |
| **Target Budget Range** | `lead.budgetRange` | Client / Team Member | Target cost range for the interior scope |
| **Public Link Settings** | `lead.shareSettings` | CRM Team Member | `{ shareToken, isPublic, expiresAt, mode }` |
 
---
 
## 6. API Services Reference
 
### Frontend Service Methods ([`src/services/interiorCrm.service.ts`](file:///c:/Users/Mahesh%20Indalkar/Desktop/web/new-update-web-sklite/src/services/interiorCrm.service.ts)):
```typescript
// Fetch public portal data using token
getPublicDrawingData(token: string): Promise<ApiResponse<PublicLeadPortalData>>
 
// Client submits room requirements via public link
submitClientRequirements(token: string, data: {
  requirements: any[];
  notes?: string;
  budgetRange?: string;
}): Promise<ApiResponse<any>>
 
// Generate / manage shareable link
generateShareLink(leadId: string, options: {
  expiresDays?: number;
  includeRequirements?: boolean;
  mode?: string;
  regenerate?: boolean;
}): Promise<ApiResponse<{ shareUrl: string; shareToken: string; expiresAt: string }>>
 
// Update technical requirements (CRM staff)
updateCustomer(leadId: string, data: {
  requirements: any[];
  budgetRange?: string;
}): Promise<ApiResponse<any>>
```
 
---
 
## 7. Key Benefits
1. **Zero Data Overwriting**: Client wishlists and technical contractor specifications are stored in distinct database fields and presented side-by-side.
2. **Frictionless Client Experience**: Clean mobile-responsive interface requiring no login or app installation.
3. **Accelerated Handover**: Designers receive client preferences upfront before site visits, reducing rework during 2D/3D drafting.
 
 