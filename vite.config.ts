import { defineConfig } from 'vite';
// GitHub Pages serves project sites from /<repo>/; local dev stays at '/'.
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/echo-spire/' : '/',
});
