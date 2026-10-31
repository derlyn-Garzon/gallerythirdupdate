# Sentinel's Journal

Critical security learnings and codebase-specific patterns.

## 2025-02-14 - Content Security Policy for Static Web Applications
**Vulnerability:** Static single-page applications without server-side HTTP security headers lack defense-in-depth protection against cross-site scripting (XSS), data exfiltration, or malicious resource injection.
**Learning:** For purely static web applications served without backend configuration access, Content Security Policy can be enforced via `<meta http-equiv="Content-Security-Policy">`. Specific font and style CDNs (like Google Fonts: `https://fonts.googleapis.com` for styles and `https://fonts.gstatic.com` for font binaries) must be explicitly whitelisted to prevent breaking styling while locking down `default-src 'none'`.
**Prevention:** Always define a strict CSP meta tag in static HTML templates with `default-src 'none'`, permitting only required local and trusted CDN endpoints.
