// =============================================================================
// Interior — how a project member's role is labelled in member lists / pickers
// Org admins have full access whatever their project role, so they always show
// as Admin; otherwise the linked org role's name, then the preset role.
// =============================================================================

const PRESET_LABELS: Record<string, string> = {
  project_manager: 'Project Manager',
  site_engineer: 'Site Engineer',
  quantity_surveyor: 'Quantity Surveyor',
  designer: 'Designer',
  sub_contractor: 'Sub Contractor',
  client_representative: 'Client Representative',
  viewer: 'Viewer',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function memberRoleLabel(m: any): string {
  const systemRole = m?.userId?.systemRole;
  if (m?.isOrgAdmin || systemRole === 'org_admin' || systemRole === 'super_admin') {
    return systemRole === 'super_admin' ? 'Super Admin' : 'Admin';
  }
  if (m?.roleId && typeof m.roleId === 'object' && m.roleId.name) return m.roleId.name;
  if (m?.roleTitle) return m.roleTitle;
  return PRESET_LABELS[m?.projectRole] || (m?.projectRole ? String(m.projectRole).replace(/_/g, ' ') : 'Member');
}

/** Org admins listed alongside members (so they can be assigned) have no membership record to edit. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isVirtualAdminMember = (m: any): boolean => String(m?._id || '').startsWith('admin-');
