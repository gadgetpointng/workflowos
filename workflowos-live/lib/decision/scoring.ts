export type Signal = {
  signal_type: string;
  product_ref?: string | null;
  search_query?: string | null;
  quantity?: number | null;
  value?: number | null;
  source?: string | null;
  observed_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function scoreSignal(signal: Signal) {
  const q = Number(signal.quantity ?? 1);
  const value = Number(signal.value ?? 0);
  const type = signal.signal_type;
  let score = 45;
  if (type.includes('search')) score += 12;
  if (type.includes('product_view')) score += 8;
  if (type.includes('cart')) score += 22;
  if (type.includes('marketplace')) score += 18;
  if (type === 'order') score += 15;
  score += Math.min(q * 2, 10);
  score += Math.min(value / 50000, 10);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function recommendationForSignal(signal: Signal, score: number) {
  const subject = signal.product_ref || signal.search_query || 'customer demand';
  if (signal.signal_type.includes('cart')) return { type: 'sales_followup', title: `Recover purchase intent: ${subject}`, action: 'Create a sales follow-up task and check pricing/availability.' };
  if (signal.signal_type.includes('marketplace')) return { type: 'marketplace_action', title: `Marketplace demand detected: ${subject}`, action: 'Review stock, pricing and create/update marketplace listings.' };
  if (signal.signal_type.includes('search')) return { type: 'merchandising', title: `Search demand: ${subject}`, action: 'Confirm product availability and consider a focused promotion.' };
  if (score >= 80) return { type: 'growth_action', title: `High-priority growth signal: ${subject}`, action: 'Assign an owner and convert this signal into an execution task.' };
  return { type: 'monitor', title: `Emerging signal: ${subject}`, action: 'Review supporting evidence and decide whether to act.' };
}
