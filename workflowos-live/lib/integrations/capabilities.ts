export type IntegrationKind = 'commerce'|'website'|'marketplace'|'messaging'|'social'|'advertising'|'custom';

export const KIND_CAPABILITY_PRESETS: Record<IntegrationKind,string[]> = {
  commerce: ['events','commands'],
  website: ['events'],
  marketplace: ['events','commands'],
  messaging: ['events'],
  social: ['events'],
  advertising: ['events'],
  custom: ['events']
};

export function normalizeCapabilities(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(x=>String(x).trim()).filter(Boolean))];
}

export function hasCapability(capabilities: unknown, required: string) {
  const caps = normalizeCapabilities(capabilities);
  return caps.includes('*') || caps.includes(required);
}

export function canPublishEvents(capabilities: unknown) {
  return hasCapability(capabilities,'events');
}

export function canReceiveCommands(capabilities: unknown) {
  return hasCapability(capabilities,'commands');
}
