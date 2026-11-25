import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://donglinli.com',
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  // Keep scripts as separate files so /desk/ can run under a strict script-src 'self' policy.
  vite: { build: { assetsInlineLimit: 0 } }
});
