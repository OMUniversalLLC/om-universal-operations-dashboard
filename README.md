# OM Universal Operations Dashboard

Management reporting for OM Universal, focused on:

- sales reporting for Plant City, Inverness and Vape Store;
- Quick C daily sales, cost and margin summaries;
- Mercury One task completion and management attention;
- transparent data-quality checks and source-period labels.

Inventory and audit modules are intentionally outside this project.

## Current access mode

The GitHub Pages dashboard is temporarily open and does not require sign-in. It displays the approved report snapshot bundled with the website.

The source Google Sheet remains private. The Google Sign-In, Apps Script gateway and protected `Users` tab remain available in the repository for later reactivation.

No passwords are stored in Google Sheets or this repository.

## Live addresses

- Open GitHub Pages dashboard: `https://omuniversalllc.github.io/om-universal-operations-dashboard/`
- Management Google Sheet: `https://docs.google.com/spreadsheets/d/1Jpz7Oydr8VbZ-9-HPwL3_K_dIINiN3m_HORQieE8iGc/edit`

## Data flow

The private management Sheet remains the formula source. The current public website displays the reviewed snapshot in `app/public-dashboard-data.json`; it does not read the private Sheet directly. To refresh the public dashboard, generate and publish a new approved snapshot.

When secure access is reactivated, Apps Script can read calculated values from `Sales_Data`, `QuickC_Summary`, `Mercury_Tasks`, `Support_Expenses` and `Website_Export`, then apply the user's configured store access.

The protected `Users` tab uses these columns:

- Email / User ID
- Name
- Role: Admin, Manager or Viewer
- Store Access
- Active: Yes or No
- Notes

## Optional secure access

Follow `google-apps-script/README.md`. Activation requires a Google OAuth web client ID and one Apps Script web-app deployment. Both services have free usage suitable for a small internal team.

## Local development and validation

```bash
pnpm install
pnpm run dev:pages
pnpm run build:pages
pnpm run test
```

The GitHub Pages build emits a fixed `assets/dashboard.js` file. The same interface can be reused by the authenticated Apps Script page when secure access is reactivated.

## Privacy note

The current website is public. Treat every value in `app/public-dashboard-data.json` as internet-visible and never add passwords, raw credentials, detailed task descriptions or other sensitive records. Removing a snapshot later does not erase it from older Git history.
