# alok.dev — Cyber Portfolio

Alok Mishra’s black-and-red portfolio, continued from the earlier project and redesigned using the supplied reel as a visual reference. Includes GSAP animations, the interactive Systems Matrix, project dialogs, a local terminal, security field notes, and a persistent contact inbox.

## Run locally

Requires Node.js 24 or later.

```bash
npm ci
npm run prepare:assets
npm start
```

Open http://127.0.0.1:3000. For automatic server restarts, use `npm run dev`. Frontend changes appear after reloading the browser. Fonts and animation libraries are served locally; no font or script CDN is required.

## Included behavior

- GSAP entrance sequences, scroll reveals, an animated ticker and radar, and desktop portrait movement.
- Operating-system reduced-motion preferences and a persistent motion toggle. Essential content remains visible without JavaScript.
- Systems Matrix: eight modules, Build / Defend / Design filters, a module inspector, keyboard-operable selection, and announced state changes.
- Three project write-ups with accessible dialogs and restored focus. ThreatLens and PhishCheck remain explicitly labeled concepts.
- Terminal: `help`, `about`, `projects`, `skills`, `contact`, `clear`, and arrow-key history. It never executes system commands.
- Responsive navigation, security note disclosures, validated contact forms, preserved input after errors, and social contact alternatives.
- Local fonts, metadata, favicon, social sharing image, security headers, and explicit public asset allowlists.

## Contact inbox

`POST /api/contact` validates the payload and saves it before returning a receipt. `GET /api/health` verifies service availability. The form reports actual errors and never simulates delivery.

**Node deployment:** messages are stored in `DATA_DIR/messages.sqlite`. Read them with `npm run inbox`. There is no public inbox route. A persistent disk is required. Old messages are pruned after 90 days at startup and daily. Limits are 5 attempts per socket IP and 100 globally per 15 minutes in a single process; these counters reset on restart. Behind a shared reverse proxy, add trusted edge rate limiting because forwarded IP headers are intentionally not trusted.

**Sites deployment:** the Worker in `worker/handler.js` uses the provisioned `DB` D1 binding. SQL migrations live in `drizzle/`. Messages can be inspected by the owner through Sites database tools. Rate limits are enforced atomically in D1: 5 validated submissions per client and 100 globally per 15-minute fixed window. The client key is a per-window hash of Cloudflare’s trusted connection IP. Expired rate counters and messages older than 90 days are removed after successful submissions; no daily hosted maintenance schedule is configured. Node and Sites inboxes are separate.

Both versions use parameterized queries, origin checks, request/field limits, and a honeypot. Private files are not public routes. **Messages are stored; email notifications are not configured.** Reply using the sender’s email address from the private inbox.

## Production deployment

The Sites project identity is retained in `.openai/hosting.json`. New Sites use owner-only access by default. Do not create another Site when continuing this project. Use the Sites source/package/deploy workflow to update it. The build produces a dependency-free Worker ESM artifact in `dist/server/index.js` with embedded allowlisted assets, plus the hosting manifest and D1 migrations. Migration files already applied in production must not be edited; append migrations for schema changes.

```bash
npm run build          # Build and verify the Sites artifact
npm run build:preview  # Export static frontend to static-preview/
```

The static export is suitable for GitHub Pages; it cannot save contact messages. The form explains this on submission and directs visitors to LinkedIn. The full Node server and Sites deployment support real submissions.

To deploy the Node version, set `HOST=0.0.0.0`, `NODE_ENV=production`, `APP_ORIGIN` to the actual HTTPS origin (without a trailing slash), and `DATA_DIR` to a persistent disk. Run one instance for SQLite and terminate HTTPS at your hosting platform or reverse proxy.

```bash
docker build -t alok-cyber-portfolio .
docker run -d --name alok-cyber-portfolio \
  -p 127.0.0.1:3000:3000 \
  -e APP_ORIGIN=https://your-domain.example \
  -v alok-inbox:/app/data \
  alok-cyber-portfolio
```

Replace the example domain with your actual domain and update the absolute social image URL in `index.html` when moving hosts. The Dockerfile is supplied but Docker execution was not part of the browser verification.

## Validation

```bash
npm test                         # Node and hosted-adapter integration tests
npx playwright install chromium firefox webkit
npm run test:browser              # Chromium, Firefox, and iPhone-sized WebKit
```

Browser checks exercise module filtering, dialogs and focus, terminal history and safe text rendering, real contact persistence, failure recovery, navigation, reduced motion, and no-JavaScript content. Automated accessibility checks cover WCAG A/AA rules supported by axe. See `qa/VERIFICATION.md` for the tested scope; automated checks are not a complete accessibility audit.

## Editing and source layout

| File | Purpose |
| --- | --- |
| `index.html` | Profile, project copy, sections, social links, metadata |
| `css/style.css` | Black/red theme, typography, responsive layouts |
| `js/script.js` | GSAP motion, matrix data, project notes, terminal, contact |
| `server.js` | Node HTTP server and SQLite inbox |
| `worker/handler.js` | Hosted D1 adapter |
| `scripts/public-files.js` | Shared public-file allowlist |
| `scripts/prepare-assets.js` | Local GSAP and font preparation |
| `scripts/build-site.js` | Deterministic hosted artifact build |
| `drizzle/` | Hosted database migrations |
| `tests/` | Backend, Worker, and browser tests |
| `docs/REFERENCE.md` | Design and content provenance |

The Desktop source and its private inbox were not modified or imported. The portrait, college, project names, and social destinations were retained from that source. Update them here when they change. No professional credentials, project results, or testimonials were invented.

The original MIT license is retained for project code. GSAP is distributed under its own standard license: https://gsap.com/standard-license/. Barlow Condensed and Space Grotesk font licenses are included in `assets/fonts/`.
