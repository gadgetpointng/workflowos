export type IntegrationKind = 'commerce' | 'website' | 'marketplace' | 'messaging' | 'social' | 'advertising' | 'custom';

export type IntegrationEventInput = {
  source: string;
  eventType: string;
  externalId?: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
};

export type NormalizedCommerceSignal = {
  source: string;
  signalType: 'product_view' | 'search' | 'lead' | 'order' | 'inventory' | 'message' | 'market_demand';
  productRef?: string;
  query?: string;
  quantity?: number;
  value?: number;
  metadata?: Record<string, unknown>;
};

export interface WorkflowOSIntegrationAdapter {
  slug: string;
  kind: IntegrationKind;
  verifyRequest?(request: Request): Promise<boolean>;
  normalizeEvent(input: IntegrationEventInput): Promise<IntegrationEventInput>;
  health?(): Promise<{ ok: boolean; message?: string }>;
}
