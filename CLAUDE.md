@AGENTS.md

# Actek Mfg. Purchase Order Reader — Project Context

## What this app does
Uploads PDF purchase orders (any format) and uses the Claude API to extract structured data, which is displayed as editable Sales Orders. Multiple POs can be loaded at once; each becomes a separate SO card. Output is a downloadable CSV — either per-SO or all SOs combined.

## Live URLs
- **Production app:** https://po-to-so-converter.vercel.app
- **GitHub repo:** https://github.com/sean-kanamori/po-to-so-converter
- **Vercel project:** https://vercel.com/sean-kanamoris-projects/po-to-so-converter

## Stack
- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 + custom CSS variables (industrial style inspired by actekmfg.com)
- **Font:** PT Sans (Google Fonts), navy `#263470` primary palette
- **PDF extraction:** Claude Opus (`claude-opus-4-5`) via `@anthropic-ai/sdk` — PDF sent as base64 `document` content block
- **Deployment:** Vercel (team: `sean-kanamoris-projects`)

## Project structure
```
app/
  globals.css          # Design tokens + component classes (industrial style)
  layout.tsx           # PT Sans font, page title "Actek Mfg. Purchase Order Reader"
  page.tsx             # Full UI: upload, SO cards, validation, CSV export
  api/extract/
    route.ts           # POST endpoint — receives PDF, calls Claude, returns JSON
lib/
  types.ts             # PurchaseOrder, POFile, LineItem, ContactInfo types
  csvExport.ts         # buildCSV() and downloadCSV() utilities
.env.local             # ANTHROPIC_API_KEY (not committed)
.env.example           # Template for the above
```

## Data extracted from each PO
Bill To (company, contact, address, phone), Ship To (same), PO #, Date, Requested Ship Date, Shipping Method, Freight Account, Terms, Line Items (qty, item #, description, price/unit, extended price), PO Total.

## Field validation (added after initial build)
| Field | Rule | Behaviour |
|---|---|---|
| Date, Requested Ship Date | MM/DD/YYYY | Auto-translated from ISO, named-month, short-year, etc. on extraction and onBlur. Red border + hint if still invalid. |
| Qty | Positive whole number | Non-digit characters stripped on input |
| Price / Unit | Non-negative number | Filtered to digits, `.`, `$`, `,` on input |

### Date translation (`parseToMMDDYYYY`)
Handles: ISO `2025-01-15`, `MM-DD-YYYY`, `M/D/YY`, `YYYYMMDD`, `January 15 2025`, `Jan 15, 2025`, and JS `Date.parse` fallback for other named-month formats.

## Deployment workflow
```bash
# Push to GitHub
git add . && git commit -m "message" && git push origin main

# Deploy to Vercel (run from project root)
~/.local/bin/vercel --token <VERCEL_TOKEN> --yes --scope sean-kanamoris-projects --prod

# Set / update an env var on Vercel
curl -X POST \
  -H "Authorization: Bearer <VERCEL_TOKEN>" \
  -H "Content-Type: application/json" \
  "https://api.vercel.com/v10/projects/prj_r2qDlTYSBVccXMHpoRSDxGxhRPKh/env?teamId=team_HwOa7PcYftuErrKxTns3DcgR" \
  -d '{"key":"ENV_VAR","value":"...","type":"encrypted","target":["production","preview","development"]}'
```

> **Note:** `gh` CLI is not installed on this machine. GitHub operations use `curl` against the REST API with a personal access token. The `vercel` CLI was installed to `~/.local/bin/vercel`.

## Vercel IDs (needed for API calls)
- Project ID: `prj_r2qDlTYSBVccXMHpoRSDxGxhRPKh`
- Team ID: `team_HwOa7PcYftuErrKxTns3DcgR`

## Design system (style-preview-5.html)
The industrial style lives in `app/globals.css` as CSS custom properties:
```css
--background: #f6f7fb;   /* cool blue-gray page */
--foreground: #47494e;   /* dark charcoal text */
--card: #ffffff;
--border: #b6c5e1;       /* light blue borders */
--accent: #263470;       /* navy — primary CTA, headings */
--accent-hover: #012956;
--accent-light: #e8edf3; /* pale blue fills */
--muted: #7f828b;
--accent-secondary: #3b5997; /* medium blue — links, gradient end */
```
Cards have a 5px navy→blue gradient top bar (`card-header-bar`). Border radius is 4–6px (not bubbly). The style preview is at `quiz-project/style-preview-5.html`.

## Known / future work
- Sample POs from the user have not yet been tested — the Claude extraction prompt may need tuning once real documents are provided
- No authentication — the app is publicly accessible; add auth if needed before wider rollout
- The `pdf-parse` npm package was installed but is not currently used (extraction is done entirely by Claude vision); it could serve as a pre-processing fallback
