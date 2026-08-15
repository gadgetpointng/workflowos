import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WorkflowOS',
    short_name: 'WorkflowOS',
    description: 'GadgetPoint business execution and operating workspace.',
    start_url: '/today',
    scope: '/',
    display: 'standalone',
    background_color: '#08111f',
    theme_color: '#08111f',
    orientation: 'portrait-primary',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }]
  };
}
