export const WORKFLOWOS_STAFF_SCOPES = [
  'work',
  'operations',
  'sales',
  'marketing',
  'commerce',
  'intelligence',
] as const;

export type WorkflowOSStaffScope = typeof WORKFLOWOS_STAFF_SCOPES[number];
export type WorkflowOSRouteScope = WorkflowOSStaffScope | 'owner' | null;

const allowedScopes = new Set<string>(WORKFLOWOS_STAFF_SCOPES);

export function normalizeWorkflowOSPermissions(value: unknown): WorkflowOSStaffScope[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item).trim()).filter((item): item is WorkflowOSStaffScope => allowedScopes.has(item))));
}

const routeScopes: Array<[string, WorkflowOSRouteScope]> = [
  ['/dashboard', null],
  ['/today', 'work'],
  ['/my-work', 'work'],
  ['/tasks', 'work'],
  ['/inbox', 'work'],
  ['/notifications', 'work'],
  ['/briefing', 'work'],

  ['/schedule', 'operations'],
  ['/time', 'operations'],
  ['/workload', 'operations'],
  ['/availability', 'operations'],
  ['/recurring-work', 'operations'],
  ['/sla', 'operations'],
  ['/branch-radar', 'operations'],

  ['/opportunities', 'sales'],
  ['/buyers', 'sales'],
  ['/leads', 'sales'],
  ['/customers', 'sales'],
  ['/sales', 'sales'],
  ['/quotes', 'sales'],
  ['/conversations', 'sales'],

  ['/campaigns', 'marketing'],
  ['/marketing', 'marketing'],
  ['/goals', 'marketing'],

  ['/catalog', 'commerce'],
  ['/vendors', 'commerce'],
  ['/settlements', 'commerce'],
  ['/marketplaces', 'commerce'],
  ['/marketplace-jobs', 'commerce'],

  ['/automations', 'intelligence'],
  ['/analytics', 'intelligence'],
  ['/performance', 'intelligence'],
  ['/reports', 'intelligence'],
  ['/ai-proposals', 'intelligence'],
  ['/ai', 'intelligence'],

  ['/approvals', 'owner'],
  ['/team', 'owner'],
  ['/activity', 'owner'],
  ['/integrations', 'owner'],
  ['/integration-commands', 'owner'],
  ['/settings', 'owner'],
  ['/launch-readiness', 'owner'],
  ['/sites', 'owner'],
];

export const protectedWorkspacePrefixes = Array.from(new Set(routeScopes.map(([prefix]) => prefix)));

export function requiredWorkflowOSScope(pathname: string): WorkflowOSRouteScope {
  const match = routeScopes
    .filter(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    .sort((a, b) => b[0].length - a[0].length)[0];
  return match?.[1] ?? 'owner';
}

export function isGadgetPointStaffAppMetadata(appMetadata: Record<string, unknown> | null | undefined) {
  return String(appMetadata?.workflowos_identity_source ?? '').trim() === 'gadgetpoint-staff-authorization-code';
}

export function gadgetPointStaffAccessFromMetadata(appMetadata: Record<string, unknown> | null | undefined) {
  return {
    enabled: appMetadata?.workflowos_access_enabled === true,
    permissions: normalizeWorkflowOSPermissions(appMetadata?.workflowos_permissions),
  };
}

export function canGadgetPointStaffAccessPath(pathname: string, appMetadata: Record<string, unknown> | null | undefined) {
  const access = gadgetPointStaffAccessFromMetadata(appMetadata);
  if (!access.enabled) return false;
  const required = requiredWorkflowOSScope(pathname);
  if (required === null) return true;
  if (required === 'owner') return false;
  return access.permissions.includes(required);
}

export function scopeForNavigationHref(href: string): WorkflowOSRouteScope {
  return requiredWorkflowOSScope(href);
}
