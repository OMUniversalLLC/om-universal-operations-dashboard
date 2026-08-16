# OM Universal Operations Dashboard

Professional management reporting for OM Universal, focused on:

- sales reporting for Plant City, Inverness and Vape Store;
- Quick C daily sales, cost and margin summaries;
- Mercury One task completion and management attention;
- transparent data-quality checks and source-period labels.

Inventory and audit modules are intentionally outside this project.

## Live websites

- GitHub Pages: `https://omuniversalllc.github.io/om-universal-operations-dashboard/`
- Private management deployment: `https://sales-mercury-operations.asrsn-cse.chatgpt.site`

## Data flow

The dashboard currently ships with the verified reporting snapshot in
`public/dashboard-data.json`. The Google Sheet remains the formula source and its
`Website_Export` tab is the approved layer for a future authenticated JSON
endpoint. Raw source tabs should not be published.

## Local development

Requirements: Node.js 22 or newer and pnpm 10.

```bash
pnpm install
pnpm run dev:pages
```

The local GitHub Pages preview uses the repository-aware static build.

## Validation builds

```bash
pnpm run build:pages
pnpm run build
```

- `build:pages` creates the static site in `dist-pages/` for GitHub Pages.
- `build` validates the private vinext/Sites deployment.

## GitHub Pages deployment

`.github/workflows/deploy-pages.yml` automatically rebuilds and deploys the
static dashboard after changes reach `main`. The workflow can also be run
manually from the repository's Actions tab.

## Privacy

The repository is private, but GitHub Pages visibility depends on the
organization's GitHub plan and Pages settings. Confirm the intended access level
before placing detailed or sensitive business data in `public/`.
