import { defineConfig, devices } from '@playwright/test';

const HOST = '127.0.0.1';
const DEV_PORT = 4321;
const PROD_PORT = 4322;
const SAME_ORIGIN_PORT = 4323;

// The same-origin build is served from here, as an Artifact serves it.
const SUBPATH = 'app';

// Each server builds into its own directories, so tests never disturb `pnpm dev`.
const parcelDirs = (name: string, subpath = '') =>
  `--dist-dir .playwright/${name}-dist/${subpath} --cache-dir .playwright/${name}-cache`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: true,
  reporter: 'list',
  // The slowest test takes about 4s. Without an action timeout, a click on a
  // missing element waits out the whole test.
  timeout: 15_000,
  use: {
    ...devices['Desktop Chrome'],
    actionTimeout: 5_000,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'dev', use: { baseURL: `http://${HOST}:${DEV_PORT}` } },
    { name: 'prod', use: { baseURL: `http://${HOST}:${PROD_PORT}` } },
    // Built by `pnpm build:same-origin`, served without CORS from a subpath, as
    // a claude.ai Artifact serves it.
    { name: 'same-origin', use: { baseURL: `http://${HOST}:${SAME_ORIGIN_PORT}/${SUBPATH}/` } },
  ],
  webServer: [
    {
      command: `parcel --host ${HOST} --port ${DEV_PORT} ${parcelDirs('dev')}`,
      url: `http://${HOST}:${DEV_PORT}`,
      timeout: 180_000,
    },
    {
      command: `parcel build ${parcelDirs('prod')} && node e2e/serve-dist.mjs .playwright/prod-dist ${PROD_PORT}`,
      url: `http://${HOST}:${PROD_PORT}`,
      timeout: 180_000,
    },
    {
      command: `pnpm build:same-origin ${parcelDirs('same-origin', SUBPATH)} && node e2e/serve-dist.mjs .playwright/same-origin-dist ${SAME_ORIGIN_PORT} --no-cors`,
      url: `http://${HOST}:${SAME_ORIGIN_PORT}/${SUBPATH}/`,
      timeout: 180_000,
    },
  ],
});
