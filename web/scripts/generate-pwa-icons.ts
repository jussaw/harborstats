/**
 * Renders the app anchor (app/icon.svg) onto the harbor navy background as
 * the PNG icon set referenced by app/manifest.ts and app/apple-icon.png.
 * Re-run after changing the icon or brand colors:
 *
 *   pnpm tsx scripts/generate-pwa-icons.ts
 */
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '@playwright/test'

const NAVY_900 = '#0a2130'

interface IconSpec {
  outFile: string
  size: number
  // Glyph size as a fraction of the canvas. Maskable icons need the glyph
  // inside the central 80% safe zone, so they use a smaller fraction.
  glyphFraction: number
}

const ICONS: IconSpec[] = [
  { outFile: 'public/icons/icon-192.png', size: 192, glyphFraction: 0.62 },
  { outFile: 'public/icons/icon-512.png', size: 512, glyphFraction: 0.62 },
  { outFile: 'public/icons/icon-512-maskable.png', size: 512, glyphFraction: 0.45 },
  { outFile: 'app/apple-icon.png', size: 180, glyphFraction: 0.62 },
]

async function main() {
  // Run from web/ like the other scripts (pnpm tsx scripts/generate-pwa-icons.ts).
  const root = process.cwd()
  const svg = await readFile(path.join(root, 'app/icon.svg'), 'utf8')

  const browser = await chromium.launch()

  await Promise.all(
    ICONS.map(async (icon) => {
      const glyphPx = Math.round(icon.size * icon.glyphFraction)
      const html = `<!doctype html>
        <html>
          <body style="margin:0;width:${icon.size}px;height:${icon.size}px;
            background:${NAVY_900};display:flex;align-items:center;justify-content:center;">
            <div style="width:${glyphPx}px;height:${glyphPx}px;">
              ${svg.replace('<svg ', '<svg style="width:100%;height:100%;" ')}
            </div>
          </body>
        </html>`

      const page = await browser.newPage({
        viewport: { width: icon.size, height: icon.size },
      })
      await page.setContent(html)
      const outPath = path.join(root, icon.outFile)
      await mkdir(path.dirname(outPath), { recursive: true })
      await page.screenshot({ path: outPath })
      await page.close()
      console.log(`wrote ${icon.outFile} (${icon.size}x${icon.size})`)
    }),
  )

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
