/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** '1' in a build by `pnpm build:same-origin`, set in vite.config.ts. */
  readonly GRAPHIX_SAME_ORIGIN_PREVIEW: string;
}
