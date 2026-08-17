# Secure Google login gateway

This script is bound to the private **Operations Management Master – Sales & Mercury** Google Sheet. It receives the Google identity token, verifies that Google issued it for this website, checks the email in the protected `Users` tab, and only then prepares the dashboard data.

## One-time activation

1. In the management Google Sheet, open **Extensions → Apps Script**.
2. Replace `Code.gs` with this folder's `Code.gs`, add an HTML file named `Index`, and copy `Index.html` into it.
3. In **Project Settings**, enable the manifest file and replace it with `appsscript.json`.
4. Create a Google OAuth web client for the dashboard. Add this GitHub Pages origin:
   `https://omuniversalllc.github.io`
5. Run `setGoogleClientId("YOUR_CLIENT_ID.apps.googleusercontent.com")` once in Apps Script.
6. Deploy as a web app: execute as **Me**, access **Anyone**. The script still blocks every email not active in `Users`.
7. Put the OAuth client ID and the deployed `/exec` URL into `public/auth-config.json`, then rebuild and publish GitHub Pages.

Never add passwords, OAuth secrets or identity tokens to the Sheet or GitHub repository.

