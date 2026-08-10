export type MarketplaceListingInput = {
  title: string;
  description?: string;
  price?: number;
  quantity?: number;
  localProductRef?: string;
};

export interface MarketplaceConnector {
  slug: string;
  authenticate(): Promise<void>;
  createListing(input: MarketplaceListingInput): Promise<{ externalListingId?: string }>;
  updateListing(externalListingId: string, input: MarketplaceListingInput): Promise<void>;
  getOrders(): Promise<unknown[]>;
  getPerformance(): Promise<Record<string, number>>;
}