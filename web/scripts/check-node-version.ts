/**
 * Node version guard — runs as a preinstall script and at test-config load.
 *
 * The component test suite depends on jsdom's localStorage, which vitest 4
 * cannot restore when Node ≥25 injects its own global (fixed only in vitest 5).
 * We work around this with `--no-webstorage`, but only on Node ≥25; the flag
 * does not exist on earlier versions. This module enforces the supported
 * range so that unsupported Node versions fail with a concise, actionable
 * diagnostic instead of hundreds of cascading test failures.
 *
 * Supported range: Node >=22.13 <27 (matches `engines.node` in package.json).
 */

export const MIN_MAJOR = 22
export const MIN_MINOR = 13
export const MAX_MAJOR_EXCLUSIVE = 27 // supported up to and including Node 26.x

/**
 * Validate a Node version string against the supported range.
 * @param version - full version string, e.g. "v26.5.1" or "26.5.1"
 * @returns error messages (empty if valid)
 */
export function validateNodeVersion(version: string): string[] {
  const clean = version.startsWith('v') ? version.slice(1) : version
  const [major, minor] = clean.split('.').map(Number)
  const errors: string[] = []

  if (major < MIN_MAJOR || (major === MIN_MAJOR && minor < MIN_MINOR)) {
    errors.push(
      `Node ${clean} is too old. HarborStats requires Node >=${MIN_MAJOR}.${MIN_MINOR}.`,
      `Please upgrade: https://nodejs.org/`,
    )
  } else if (major >= MAX_MAJOR_EXCLUSIVE) {
    errors.push(
      `Node ${clean} is not supported. HarborStats supports Node >=${MIN_MAJOR}.${MIN_MINOR} <${MAX_MAJOR_EXCLUSIVE}.`,
      `Please use Node 22 or 26: https://nodejs.org/`,
    )
  }

  return errors
}

/**
 * Print errors to stderr with optional ANSI color (respects NO_COLOR).
 */
function reportErrors(errors: string[]): void {
  const useColor = !process.env.NO_COLOR && process.stderr.isTTY
  const red = useColor ? '\u001b[31m' : ''
  const reset = useColor ? '\u001b[0m' : ''

  console.error(`\n${red}[harborstats] Node version check failed.${reset}`)
  errors.forEach((line) => console.error(`  ${line}`))
}

// When run directly (preinstall or `tsx scripts/check-node-version.ts`),
// validate and exit non-zero on failure.
const errors = validateNodeVersion(process.version)
if (errors.length > 0) {
  reportErrors(errors)
  process.exit(1)
}