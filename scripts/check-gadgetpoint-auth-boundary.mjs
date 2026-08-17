import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const middleware = read('middleware.ts');
const accessSync = read('app/api/auth/gadgetpoint/access-sync/route.ts');
const workflowAccess = read('lib/workflow-access.ts');

const failures = [];
const requireText = (source, text, message) => {
  if (!source.includes(text)) failures.push(message);
};
const rejectText = (source, text, message) => {
  if (source.includes(text)) failures.push(message);
};

requireText(middleware, "const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com'", 'Middleware must preserve the exact WorkflowOS owner identity.');
requireText(middleware, ".from('profiles')", 'Protected workspace middleware must resolve the authenticated profile.');
requireText(middleware, "accessProfile.active === false", 'Inactive profiles must fail closed at middleware.');
requireText(middleware, "role === 'owner' && profileEmail === OWNER_EMAIL", 'Owner access must require both owner role and the exact owner email.');
requireText(middleware, "!exactOwner && !canGadgetPointStaffAccessPath", 'Every non-owner workspace session must pass the owner-approved WorkflowOS scope gate.');
rejectText(middleware, 'isGadgetPointStaffAppMetadata(', 'Scope enforcement must not depend on only one historical GadgetPoint identity-source label.');

requireText(accessSync, 'EXTERNAL_STAFF_ID_RE', 'Access sync must validate both username-style and email-style GadgetPoint staff identifiers.');
rejectText(accessSync, "!externalStaffId.includes('@')", 'Access sync must not require GadgetPoint staff identifiers to be email addresses.');
requireText(accessSync, 'externalStaffId === OWNER_EMAIL', 'The owner identity must remain blocked from staff access sync.');
requireText(accessSync, 'enabled && permissions.length === 0', 'Enabled staff access must require at least one owner-approved WorkflowOS scope.');
requireText(accessSync, "workflowos_identity_source: 'gadgetpoint-staff-authorization-code'", 'Access sync must mark the authoritative GadgetPoint staff authorization source.');
requireText(accessSync, 'workflowos_access_enabled: enabled', 'Access sync must write the owner-approved Yes/No state to auth metadata.');
requireText(accessSync, 'workflowos_permissions: permissions', 'Access sync must write owner-approved work scopes to auth metadata.');

requireText(workflowAccess, "'/integrations', 'owner'", 'Integrations must remain owner-only.');
requireText(workflowAccess, "if (required === 'owner') return false", 'Staff scopes must never grant owner-only routes.');
requireText(workflowAccess, 'if (!access.enabled) return false', 'Disabled GadgetPoint staff must fail closed.');

if (failures.length) {
  console.error('GadgetPoint authorization boundary check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('GadgetPoint authorization boundary check passed.');
