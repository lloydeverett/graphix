import { defineConfig, devices } from '@playwright/test';

const HOST = '127.0.0.1';
const DEV_PORT = 4321;
const PROD_PORT = 4322;
const SAME_ORIGIN_PORT = 4323;

// Each server builds into its own directories, so tests never disturb `pnpm dev`.
const parcelDirs = (name: string) =>
  `--dist-dir .playwright/${name}-dist --cache-dir .playwright/${name}-cache`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: true,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'dev', use: { baseURL: `http://${HOST}:${DEV_PORT}` } },
    { name: 'prod', use: { baseURL: `http://${HOST}:${PROD_PORT}` } },
    // Built with GRAPHIX_SAME_ORIGIN_PREVIEW=1 and served without CORS.
    { name: 'same-origin', use: { baseURL: `http://${HOST}:${SAME_ORIGIN_PORT}` } },
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
      command: `parcel build ${parcelDirs('same-origin')} && node e2e/serve-dist.mjs .playwright/same-origin-dist ${SAME_ORIGIN_PORT} --no-cors`,
      env: { GRAPHIX_SAME_ORIGIN_PREVIEW: '1' },
      url: `http://${HOST}:${SAME_ORIGIN_PORT}`,
      timeout: 180_000,
    },
  ],
});
