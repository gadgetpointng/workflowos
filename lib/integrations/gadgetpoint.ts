import type { IntegrationEventInput, WorkflowOSIntegrationAdapter } from './types';

export const gadgetPointAdapter: WorkflowOSIntegrationAdapter = {
  slug: 'gadgetpoint',
  kind: 'commerce',
  async normalizeEvent(input: IntegrationEventInput) {
    return {
      ...input,
      source: 'gadgetpoint',
      payload: {
        ...(input.payload ?? {}),
        normalizedBy: 'workflowos:gadgetpoint-adapter'
      }
    };
  }
};
