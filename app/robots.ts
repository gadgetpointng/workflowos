import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/request'],
        disallow: ['/api/', '/auth/', '/login', '/signup', '/owner', '/settings'],
      },
    ],
    sitemap: 'https://workflow.gadgetpoint.ng/sitemap.xml',
    host: 'https://workflow.gadgetpoint.ng',
  };
}
