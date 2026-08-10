export function capabilityForOpportunity(type?: string | null) {
  const t = (type ?? '').toLowerCase();
  if (t.includes('market')) return 'marketplace';
  if (t.includes('campaign') || t.includes('promotion')) return 'marketing';
  if (t.includes('lead') || t.includes('sales') || t.includes('whatsapp')) return 'sales';
  if (t.includes('inventory') || t.includes('stock')) return 'inventory';
  return 'operations';
}
