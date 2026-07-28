# Sky-Lite Integration Testing — Master Index

Test each phase in order. Later phases depend on earlier ones (you need users & projects before testing BOQ).

| Phase | Name | Status |
|-------|------|--------|
| [01](./PHASE_01_auth.md) | Authentication & Organization | ✅ API Passed — UI manual pending |
| [02](./PHASE_02_users_roles.md) | Users & Roles / Permissions | ✅ API Passed — UI manual pending |
| [03](./PHASE_03_projects_core.md) | Project Core CRUD | ✅ Audited — clean |
| [04](./PHASE_04_project_workspace.md) | Project Workspace — Plans, Milestones, DPR | ✅ Audited — 3 bugs fixed |
| [05](./PHASE_05_boq_budget.md) | BOQ & Budget | ✅ Audited — 1 bug fixed |
| [06](./PHASE_06_materials.md) | Materials & Supply Chain | ✅ Audited — 3 bugs fixed |
| [07](./PHASE_07_quality.md) | Quality Control — Issues, Risks, Snags, Survey | ✅ Audited — 1 bug fixed |
| [08](./PHASE_08_templates.md) | Templates & Categories | ✅ Audited — clean |
| [09](./PHASE_09_superadmin.md) | Super Admin | ✅ Audited — 2 bugs fixed |

## Status Legend
- ⬜ Not Started
- 🔄 In Progress
- ✅ Passed
- ❌ Failed — needs fix

## Shared Test Data (fill in as you go)

```
Admin email:     
Admin password:  
Org ID:         
Test project ID: 
Test user ID:    
```

## Running the Stack

```bash
# API (sky-lite-api)
npm run dev          # http://localhost:3001

# Web (sky-lite-web)
npm run dev          # http://localhost:3000

# Socket server (sky-lite/socket-server) — optional for real-time tests
node index.js
```
