export type BuyerIntentInput = {
  product_query?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  state?: string | null;
  city?: string | null;
  urgency?: string | null;
  source?: string | null;
  consent_status?: string | null;
};

const norm = (value?: string | null) => (value ?? '').trim().toLowerCase();

export function scoreBuyerIntent(input: BuyerIntentInput) {
  let score = 25;
  if (input.product_query) score += 15;
  if (input.brand) score += 8;
  if (input.model) score += 10;
  if (input.budget_max || input.budget_min) score += 12;
  if (input.city || input.state) score += 8;
  if (input.urgency === 'high') score += 10;
  if (input.urgency === 'immediate') score += 18;
  if (input.consent_status === 'opted_in' || input.consent_status === 'requested_contact') score += 8;
  if (input.consent_status === 'do_not_contact') score = 0;
  return Math.max(0, Math.min(100, score));
}

export function canContactBuyer(consent?: string | null) {
  return consent === 'opted_in' || consent === 'requested_contact';
}

export function matchProducts(intent: BuyerIntentInput, products: any[], limit = 6) {
  const query = norm(
    [intent.product_query, intent.brand, intent.model, intent.category].filter(Boolean).join(' '),
  );
  const tokens = query.split(/\s+/).filter((token) => token.length > 1);
  const maxBudget = Number(intent.budget_max || 0);

  return (products ?? [])
    .map((product: any) => {
      const haystack = norm(
        [
          product.name,
          product.category,
          product.sku,
          product.metadata?.brand,
          product.metadata?.model,
        ]
          .filter(Boolean)
          .join(' '),
      );

      let score = 0;
      for (const token of tokens) {
        if (haystack.includes(token)) score += 12;
      }

      if (intent.brand && haystack.includes(norm(intent.brand))) score += 18;
      if (intent.model && haystack.includes(norm(intent.model))) score += 22;
      if (intent.category && haystack.includes(norm(intent.category))) score += 10;

      const price = Number(product.price || 0);
      if (maxBudget > 0 && price > 0) {
        if (price <= maxBudget) score += 15;
        else if (price <= maxBudget * 1.1) score += 5;
        else score -= 15;
      }

      const hasExactStock = Number(product.stock_quantity || 0) > 0;
      const liveStoreAvailable = product.metadata?.available === true;
      const liveStoreUnavailable = product.metadata?.available === false;

      // Exact inventory remains owned by the commerce system. A public storefront
      // availability flag can improve ranking, but it must never be converted into
      // an invented stock quantity inside WorkflowOS.
      if (hasExactStock || liveStoreAvailable) score += 8;
      if (!hasExactStock && liveStoreUnavailable) score -= 12;
      if (product.active === false) score -= 50;

      return {
        id: product.id,
        external_product_id: product.external_product_id,
        name: product.name,
        category: product.category,
        price: product.price,
        stock_quantity: product.stock_quantity,
        available: product.metadata?.available ?? null,
        score,
      };
    })
    .filter((product: any) => product.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, limit);
}
