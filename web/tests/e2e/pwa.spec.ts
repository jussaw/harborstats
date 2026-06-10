import { expect, test } from '@playwright/test';

test('serves an installable web app manifest', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.status()).toBe(200);

  const manifest = await response.json();
  expect(manifest).toMatchObject({
    name: 'HarborStats',
    display: 'standalone',
    start_url: '/',
    theme_color: '#0a2130',
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: '/icons/icon-192.png', sizes: '192x192' }),
      expect.objectContaining({ src: '/icons/icon-512.png', sizes: '512x512' }),
      expect.objectContaining({
        src: '/icons/icon-512-maskable.png',
        purpose: 'maskable',
      }),
    ]),
  );
});

test('home page links the manifest and icons resolve', async ({ page, request }) => {
  await page.goto('/');
  const manifestHref = await page
    .locator('link[rel="manifest"]')
    .getAttribute('href');
  expect(manifestHref).toBe('/manifest.webmanifest');

  await Promise.all(
    ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-512-maskable.png'].map(
      async (iconPath) => {
        const icon = await request.get(iconPath);
        expect(icon.status()).toBe(200);
        expect(icon.headers()['content-type']).toContain('image/png');
      },
    ),
  );
});
