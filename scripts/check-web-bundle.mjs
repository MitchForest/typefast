import { readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const assetsDir = join(rootDir, 'apps', 'web', 'dist', 'assets')

const budgets = [
  { name: 'Main JS', pattern: /^index-.*\.js$/, maxBytes: 380 * 1024 },
  { name: 'Main CSS', pattern: /^index-.*\.css$/, maxBytes: 35 * 1024 },
  { name: 'Map Route JS', pattern: /^map-page-.*\.js$/, maxBytes: 25 * 1024 },
  { name: 'Map Route CSS', pattern: /^map-page-.*\.css$/, maxBytes: 90 * 1024 },
  { name: 'Profile Route JS', pattern: /^profile-page-.*\.js$/, maxBytes: 15 * 1024 },
  { name: 'Profile Route CSS', pattern: /^profile-page-.*\.css$/, maxBytes: 8 * 1024 },
  { name: 'Claim Flow JS', pattern: /^claim-prompt-.*\.js$/, maxBytes: 8 * 1024 },
  { name: 'H3 Runtime JS', pattern: /^h3-helpers-.*\.js$/, maxBytes: 220 * 1024 },
  { name: 'Avatar Render JS', pattern: /^avatar-render-.*\.js$/, maxBytes: 320 * 1024 },
  { name: 'MapLibre JS', pattern: /^maplibre-.*\.js$/, maxBytes: 1100 * 1024 },
]

const assets = readdirSync(assetsDir)
let hasFailures = false

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`
}

for (const budget of budgets) {
  const file = assets.find((asset) => budget.pattern.test(asset))

  if (!file) {
    console.error(`Missing asset for budget: ${budget.name}`)
    hasFailures = true
    continue
  }

  const size = statSync(join(assetsDir, file)).size
  const line = `${budget.name}: ${file} (${formatKiB(size)} / ${formatKiB(budget.maxBytes)})`

  if (size > budget.maxBytes) {
    console.error(`FAIL ${line}`)
    hasFailures = true
  } else {
    console.log(`PASS ${line}`)
  }
}

if (hasFailures) {
  process.exit(1)
}
