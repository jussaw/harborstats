import type { MetadataRoute } from 'next'

// Icons are generated from app/icon.svg by scripts/generate-pwa-icons.ts.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HarborStats',
    short_name: 'HarborStats',
    description: 'Catan game recorder for the harbor crew',
    start_url: '/',
    display: 'standalone',
    background_color: '#07181f',
    theme_color: '#07181f',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
