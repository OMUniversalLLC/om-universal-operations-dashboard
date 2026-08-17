"use client";

import { useEffect, useRef, useState } from "react";
import type { GoogleAuthConfig } from "./auth-types";

type GoogleIdentity = {
  accounts: {
    id: {
      initialize(options: { client_id: string; login_uri: string; ux_mode: "redirect"; auto_select: boolean }): void;
      renderButton(element: HTMLElement, options: Record<string, string | number>): void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

export default function LoginPage() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "setup" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const base = typeof document === "undefined" ? "/" : document.baseURI;

    fetch(new URL("auth-config.json", base), { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Authentication configuration was not found.");
        return response.json() as Promise<GoogleAuthConfig>;
      })
      .then((nextConfig) => {
        if (cancelled) return;
        if (!nextConfig.clientId || !nextConfig.loginUri) {
          setState("setup");
          return;
        }

        const render = () => {
          if (!window.google || !buttonRef.current) return;
          window.google.accounts.id.initialize({
            client_id: nextConfig.clientId,
            login_uri: nextConfig.loginUri,
            ux_mode: "redirect",
            auto_select: false,
          });
          buttonRef.current.replaceChildren();
          window.google.accounts.id.renderButton(buttonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
            logo_alignment: "left",
            width: 310,
          });
          setState("ready");
        };

        if (window.google) {
          render();
          return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.onload = render;
        script.onerror = () => setState("error");
        document.head.appendChild(script);
      })
      .catch(() => !cancelled && setState("error"));

    return () => { cancelled = true; };
  }, []);

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand"><span className="brandmark">OM</span><div><small>Private management portal</small><strong>OM Universal Operations</strong></div></div>
        <div className="login-copy">
          <p className="eyebrow">Secure company access</p>
          <h1 id="login-title">Sales reports and Mercury team monitoring.</h1>
          <p>Sign in with an approved Google account. The website checks your email, role and store access against the private Users sheet.</p>
        </div>
        <div className="login-action">
          <div ref={buttonRef} className="google-button" aria-live="polite" />
          {state === "loading" && <p>Preparing secure sign-in…</p>}
          {state === "setup" && <div className="setup-notice"><strong>Google connection is being activated.</strong><span>The dashboard remains locked until the secure login address is configured.</span></div>}
          {state === "error" && <div className="setup-notice error"><strong>Sign-in could not load.</strong><span>Refresh the page or ask the administrator to check the Google connection.</span></div>}
          {state === "ready" && <p>Use the same Google email that appears in the private Users sheet.</p>}
        </div>
        <div className="login-rules">
          <div><span>01</span><p><strong>No password sheet</strong><small>Google securely manages passwords.</small></p></div>
          <div><span>02</span><p><strong>Approved users only</strong><small>Inactive or unlisted emails are blocked.</small></p></div>
          <div><span>03</span><p><strong>Role-based access</strong><small>Store access comes from the Users sheet.</small></p></div>
        </div>
        <footer><span>OM Universal Operations</span><p>Google account authentication · Private report delivery</p></footer>
      </section>
    </main>
  );
}
