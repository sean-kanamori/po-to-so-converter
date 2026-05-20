# Actek Mfg. Purchase Order Reader — Knowledge Base

## What is this project?

A web application built for **Actek Mfg & Eng Inc** that accepts PDF purchase orders (from any customer, in any format) and uses the Claude AI API to extract structured data from them. The extracted data is displayed as editable Sales Order cards. Users can correct any extraction errors inline, then export one or all orders as a CSV file.

**Live URL:** https://po-to-so-converter.vercel.app  
**GitHub:** https://github.com/sean-kanamori/po-to-so-converter  
**Owner/User:** Sean Kanamori — sean.kanamori@gmail.com  
**Company:** Actek Mfg & Eng Inc, 1110 Fullerton Road, City of Industry CA 91748

---

## Business Context

Actek Mfg receives purchase orders from customers like McMaster-Carr. These POs come in various formats (different layouts, column orders, field names). Staff previously had to manually re-key PO data into Sales Orders. This app automates that extraction step so staff only need to review and correct the AI's output before exporting to CSV for their internal system.

---

## What data is extracted from each PO?

| Field | Notes |
|---|---|
| Bill To: Company Name | Who is placing the order |
| Bill To: Contact Name | Attention line |
| Bill To: Address | Full address as single string |
| Bill To: Phone | |
| Ship To: Company Name | Where goods are shipped |
| Ship To: Contact Name | |
| Ship To: Address | |
| Ship To: Phone | |
| PO Number | e.g. AB-34571360 |
| Date | Auto-translated to MM/DD/YYYY |
| Requested Ship Date | Auto-translated to MM/DD/YYYY |
| Shipping Method | e.g. UPS Ground, Xpo Logistics |
| Freight Account | e.g. Y6196E |
| Terms | e.g. Net 30, McMaster-Carr T&C |
| Line Items — Qty | Auto-normalized to whole integer (commas/decimals removed) |
| Line Items — Item # | Part number |
| Line Items — Description | Full item description |
| Line Items — Price Per Unit | Numeric, filtered to digits/decimal/$/, |
| Line Items — Extended Price | Price × Qty (extracted or calculated) |
| PO Total | Sum of all extended prices |

---

## How does the extraction work?

1. User uploads a PDF via drag-and-drop or file picker
2. The PDF is sent to a Next.js API route (`/api/extract`)
3. The route encodes the PDF as base64 and sends it to the **Anthropic API** using the `document` content type (Claude reads the PDF natively — no OCR library needed)
4. Claude Opus (`claude-opus-4-5`) returns a structured JSON object with all PO fields
5. The app applies post-processing: date normalization, qty normalization
6. The SO card renders with all fields editable
7. User reviews, corrects if needed, then exports

**Model used:** `claude-opus-4-5`  
**Max tokens:** 16,000 (raised from 4,096 after a large 8-page / 67-line-item McMaster-Carr PO caused truncation errors)

---

## What validations are enforced?

| Field | Rule | Behavior |
|---|---|---|
| Date | MM/DD/YYYY | Auto-translated from ISO, named-month, short-year, etc. Red border if still invalid |
| Requested Ship Date | MM/DD/YYYY | Same as above |
| Qty | Positive whole number | Commas and decimals stripped automatically on input and at extraction time |
| Price / Unit | Non-negative number | Filtered to digits, `.`, `$`, `,` |

Cards show a **"⚠ N fields need review"** badge when validation errors exist. The nav bar shows a total error count across all open orders.

---

## What formats does date translation handle?

- `2025-01-15` → `01/15/2025` (ISO 8601)
- `January 15, 2025` → `01/15/2025`
- `Jan 15 2025` → `01/15/2025`
- `1/15/25` → `01/15/2025` (short year)
- `01-15-2025` → `01/15/2025`
- `20250115` → `01/15/2025` (compact numeric)
- Typing digits `01152025` → `01/15/2025` (slashes inserted live)

---

## What does qty normalization do?

Removes commas and truncates decimals to produce a whole number:
- `1,241` → `1241`
- `1,000.00` → `1000`
- `2.5` → `2`

Applied both at extraction time (Claude sometimes returns `"1,241 EA"`) and on every keystroke when editing.

---

## Known issue that was fixed: McMaster-Carr PO error

A real McMaster-Carr PO (AB-34571360, 8 pages, 67 line items, $151,015.74 order value) failed to extract. Root cause: `max_tokens` was set to `4096`, which was insufficient to hold the full JSON response for 67 detailed line items. The response was silently truncated, causing `JSON.parse()` to fail with a 422 error. Fixed by raising `max_tokens` to `16000`.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15+ (App Router), TypeScript |
| Styling | Tailwind CSS v4 + custom CSS variables |
| Font | PT Sans (Google Fonts) |
| Color palette | Navy `#263470` primary, `#f6f7fb` background, `#b6c5e1` borders |
| PDF extraction | Anthropic API (`@anthropic-ai/sdk`) — native PDF document support |
| CSV export | Custom client-side builder (no library) |
| Deployment | Vercel (team: `sean-kanamoris-projects`) |
| Repo | GitHub (`sean-kanamori/po-to-so-converter`) |

---

## Visual design

Style is based on **actekmfg.com** — industrial/corporate aesthetic:
- Navy blue `#263470` primary color
- Cool blue-gray `#f6f7fb` page background
- PT Sans font throughout (no serifs)
- Sharp 4–6px border radius (not bubbly)
- 5px navy→blue gradient top bar on each card
- Style preview reference: `quiz-project/style-preview-5.html` in the `complete-course` repo

---

## File structure

```
app/
  globals.css          — Design tokens + reusable CSS classes
  layout.tsx           — PT Sans font import, page title
  page.tsx             — Full UI: upload zone, SO cards, validation, CSV export
  api/extract/
    route.ts           — POST /api/extract — receives PDF, calls Claude, returns JSON
lib/
  types.ts             — TypeScript types: PurchaseOrder, POFile, LineItem, ContactInfo
  csvExport.ts         — buildCSV() and downloadCSV()
CLAUDE.md              — Dev context (auto-loaded by Claude Code)
KNOWLEDGE.md           — This file (Q&A knowledge base)
.env.local             — ANTHROPIC_API_KEY (not committed)
.env.example           — Template
```

---

## Deployment commands

```bash
# Push to GitHub
git add . && git commit -m "message" && git push origin main

# Deploy to Vercel
~/.local/bin/vercel --token <VERCEL_TOKEN> --yes --scope sean-kanamoris-projects --prod

# Add/update a Vercel env var
curl -X POST \
  -H "Authorization: Bearer <VERCEL_TOKEN>" \
  -H "Content-Type: application/json" \
  "https://api.vercel.com/v10/projects/prj_r2qDlTYSBVccXMHpoRSDxGxhRPKh/env?teamId=team_HwOa7PcYftuErrKxTns3DcgR" \
  -d '{"key":"KEY","value":"val","type":"encrypted","target":["production","preview","development"]}'
```

**Note:** `gh` CLI is not installed. GitHub repo operations use `curl` + REST API with a PAT. Vercel CLI installed at `~/.local/bin/vercel`.

**Vercel project ID:** `prj_r2qDlTYSBVccXMHpoRSDxGxhRPKh`  
**Vercel team ID:** `team_HwOa7PcYftuErrKxTns3DcgR`

---

## Open items / future work

- Sample PO testing is ongoing — extraction prompt may need tuning for edge-case formats
- No authentication — app is publicly accessible; add auth before wider rollout
- `pdf-parse` npm package is installed but unused (extraction is done entirely by Claude); could serve as pre-processing fallback
- Extended price could auto-recalculate when qty or price/unit is edited manually
- Could add a "Copy to clipboard" option alongside CSV export
