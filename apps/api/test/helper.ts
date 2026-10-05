import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { build as buildApplication } from 'fastify-cli/helper.js'
import type { TestContext } from 'node:test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AppPath = path.join(__dirname, '..', 'app.ts')

function config() {
  return {
    skipOverride: true,
  }
}

async function build(t: TestContext) {
  const argv = [AppPath]
  const app = await buildApplication(argv, config())
  t.after(() => app.close())
  return app
}

export { config, build }
