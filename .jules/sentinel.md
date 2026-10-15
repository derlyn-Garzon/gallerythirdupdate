# Sentinel's Journal - Critical Learnings

## 2025-05-18 - Content Security Policy for Static Web Apps
**Vulnerability:** Static web applications without server-side HTTP headers lack basic defense-in-depth against resource injection and cross-origin information leakage.
**Learning:** HTML `<meta>` tags allow specifying Content-Security-Policy (CSP) and Referrer-Policy directly on client-side static pages without server configuration access.
**Prevention:** Always declare CSP meta tags allowing only explicitly needed domains (e.g., Google Fonts `fonts.googleapis.com` and `fonts.gstatic.com`) and enforce `strict-origin-when-cross-origin` referrer policies.
