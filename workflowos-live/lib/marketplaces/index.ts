import type { MarketplaceConnector } from "./types";

const connectors: Record<string, MarketplaceConnector | undefined> = {};

export function registerMarketplaceConnector(slug: string, connector: MarketplaceConnector) {
  connectors[slug] = connector;
}

export function getMarketplaceConnector(slug: string) {
  const connector = connectors[slug];
  if (!connector) throw new Error(`Marketplace connector '${slug}' is not configured.`);
  return connector;
}