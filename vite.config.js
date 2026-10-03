import { defineConfig } from 'vite';

/* The invitation is addressed, not published. `no-store` on the document
   keeps shared screenshots' origin pages from lingering in any shared cache
   (office proxies, ISP middleboxes) - the one cache-layer leak that survives
   a guest clearing their own browser. The hashed asset files keep a long
   max-age instead, so repeat visits stay instant. */
const privacyHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
};

export default defineConfig({
  base: './',
  server: {
    headers: privacyHeaders,
  },
  preview: {
    headers: privacyHeaders,
  },
  build: {
    /* Production headers are set in vercel.json. */
  },
});