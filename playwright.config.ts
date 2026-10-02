import { defineConfig, devices } from '@playwright/test';

const DEV_PORT = 4321;
const PROD_PORT = 4322;

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
    { name: 'dev', use: { baseURL: `http://localhost:${DEV_PORT}` } },
    { name: 'prod', use: { baseURL: `http://localhost:${PROD_PORT}` } },
  ],
  webServer: [
    {
      command: `parcel --port ${DEV_PORT} ${parcelDirs('dev')}`,
      url: `http://localhost:${DEV_PORT}`,
      timeout: 180_000,
    },
    {
      command: `parcel build ${parcelDirs('prod')} && node e2e/serve-dist.mjs .playwright/prod-dist ${PROD_PORT}`,
      url: `http://localhost:${PROD_PORT}`,
      timeout: 180_000,
    },
  ],
});
