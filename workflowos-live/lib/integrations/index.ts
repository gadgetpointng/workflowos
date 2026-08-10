import type { WorkflowOSIntegrationAdapter } from './types';

const adapters: Record<string, WorkflowOSIntegrationAdapter | undefined> = {};

export function registerIntegrationAdapter(adapter: WorkflowOSIntegrationAdapter) {
  adapters[adapter.slug] = adapter;
}

export function getIntegrationAdapter(slug: string) {
  return adapters[slug];
}

export function listIntegrationAdapters() {
  return Object.values(adapters).filter(Boolean) as WorkflowOSIntegrationAdapter[];
}
