# Verification — 6 November 2026

## Confirmed locally

- 12 backend integration checks pass: contact persistence/restart, validation, payload size, origin restrictions, rate limits, SQL parameter binding, public-file boundaries, production origin requirements, hosted adapter behavior, retention, and missing-storage handling.
- Browser checks cover Chromium desktop (1440 × 1000), Firefox desktop (1280 × 900), and iPhone-sized WebKit (390 × 844).
- All 24 browser cases pass after correcting a test selector that included an aria-hidden plus sign in the menu's accessible name. There was no application navigation defect.
- Page and project-dialog automated axe WCAG A/AA checks report no violations in all three engines. Low-contrast navigation index numbers were found and fixed during the first audit.
- No JavaScript console errors during initial page load.
- No horizontal document overflow at 320, 375, 390, 540, 768, 1024, 1440, or 1920 CSS pixels.
- Real contact submissions succeed against the Node backend. Rate-limit and network failure states preserve the message and re-enable submission.
- Matrix filters/selection, keyboard activation, dialog close/focus return, terminal command history, safe text output, mobile navigation, disclosures, reduced motion, and no-JavaScript content were exercised.
- Desktop hero, whole page, projects, matrix, contact, and mobile screenshots were visually inspected.
- Hosted artifact validates as ESM and serves its embedded homepage. All fonts and JS assets are local, including GSAP and ScrollTrigger.

## Scope

Browser automation runs real browser engines; the mobile test uses device emulation, not physical iPhone hardware. Automated accessibility scans do not replace manual assistive-technology testing. Docker configuration is included but was not executed. External social accounts were retained from the previous project; account ownership was not reverified. Email notifications are not configured.

See deployment results in the delivery response for hosted publication and live API verification.
