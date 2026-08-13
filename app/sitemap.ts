import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: 'https://workflow.gadgetpoint.ng',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: 'https://workflow.gadgetpoint.ng/request',
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
  ];
}
