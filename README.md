# DAT.co Robo-Advisor

This project is a web-based robo-advisor dashboard for `HW 2`. It tracks `Strategy (MSTR)` using the `Premium to NAV` indicator, a common DAT.co valuation metric.

## Indicator

The selected indicator is:

`Premium to NAV = stock close / estimated NAV per share - 1`

Where:

- `NAV per share = BTC holdings * BTC price / shares outstanding`
- `mNAV = stock close / estimated NAV per share`

This dashboard visualizes both:

- `Premium to NAV`
- `MSTR close vs estimated NAV per share`

## Data Sources

- `MSTR` daily close: Yahoo Finance chart endpoint
- `BTC/USD` daily close: CoinGecko market chart endpoint
- `BTC holdings history`: public Strategy treasury announcements encoded as dated events in `lib/datco.ts`

## Local Development

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:3000`.

## Deploy

This project is set up for Vercel:

```bash
pnpm build
```

Push to GitHub and import the repository into Vercel, or deploy with the Vercel CLI.

## Optional OpenAI Summary

If you want the bonus-style LLM summary instead of the built-in rule-based summary, add this to `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
```

Without the key, the app still works and falls back to a deterministic summary.

## Files

- `app/page.tsx`: dashboard page
- `app/api/indicator/route.ts`: server-side aggregation route
- `lib/datco.ts`: indicator formulas and treasury event timeline
- `REPORT.md`: report draft for submission
