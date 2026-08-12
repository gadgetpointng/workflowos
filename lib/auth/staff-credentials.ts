import crypto from 'crypto';

export const WORKFLOWOS_OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';
export const WORKFLOWOS_STAFF_ROLES = new Set([
  'admin',
  'manager',
  'marketing',
  'sales',
  'staff',
]);

export function normalizeStaffUsername(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 48);
}

export function isFourWordStaffPassphrase(value: unknown) {
  const words = String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words.length === 4 && words.every((word) => word.length >= 3);
}

export function internalStaffEmail(integrationId: string, username: string) {
  const label = normalizeStaffUsername(username).replace(/[^a-z0-9]/g, '.').replace(/\.{2,}/g, '.').slice(0, 24) || 'staff';
  const digest = crypto
    .createHash('sha256')
    .update(`${integrationId}:${normalizeStaffUsername(username)}`)
    .digest('hex')
    .slice(0, 16);

  return `${label}.${digest}@staff.workflowos.invalid`;
}
