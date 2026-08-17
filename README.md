# OM Universal Operations Dashboard

Private management reporting for OM Universal, focused on:

- sales reporting for Plant City, Inverness and Vape Store;
- Quick C daily sales, cost and margin summaries;
- Mercury One task completion and management attention;
- transparent data-quality checks and source-period labels.

Inventory and audit modules are intentionally outside this project.

## Secure access design

The public GitHub Pages address is only the login entrance. It contains no business-report JSON.

1. Google securely signs in the visitor.
2. The Apps Script gateway verifies Google's identity token.
3. The gateway checks the email, role, store access and `Active` value in the private `Users` tab.
4. Only approved visitors receive live calculated report values from the private management Sheet.

Passwords are never stored in Google Sheets or this repository.

## Live addresses

- GitHub Pages login: `https://omuniversalllc.github.io/om-universal-operations-dashboard/`
- Management Google Sheet: `https://docs.google.com/spreadsheets/d/1Jpz7Oydr8VbZ-9-HPwL3_K_dIINiN3m_HORQieE8iGc/edit`

The Apps Script web-app address is added to `public/auth-config.json` during one-time activation.

## Data flow

The private management Sheet remains the formula source. Apps Script reads the calculated values from `Sales_Data`, `QuickC_Summary`, `Mercury_Tasks`, `Support_Expenses` and `Website_Export` only after authentication. It returns management-ready summaries and applies the user's configured store access.

The protected `Users` tab uses these columns:

- Email / User ID
- Name
- Role: Admin, Manager or Viewer
- Store Access
- Active: Yes or No
- Notes

## One-time Google activation

Follow `google-apps-script/README.md`. Activation requires a Google OAuth web client ID and one Apps Script web-app deployment. Both services have free usage suitable for a small internal team.

## Local development and validation

```bash
pnpm install
pnpm run dev:pages
pnpm run build:pages
pnpm run test
```

The GitHub Pages build emits fixed `assets/dashboard.js` and `assets/dashboard.css` files so the authenticated Apps Script page can reuse the same reviewed interface.

## Privacy note

Removing report files from the current branch does not erase copies from older public Git history. Before using sensitive live data, purge the earlier report snapshot from repository history or move the clean frontend into a new public repository and make the old repository private.
