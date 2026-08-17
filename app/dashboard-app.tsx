"use client";

import type { AuthenticatedUser } from "./auth-types";
import DashboardClient, { type DashboardData } from "./dashboard-client";
import LoginPage from "./login-page";

declare global {
  interface Window {
    __OM_AUTH_USER__?: AuthenticatedUser;
    __OM_DASHBOARD_DATA__?: DashboardData;
    __OM_PUBLIC_LOGIN_URL__?: string;
  }
}

export default function DashboardApp() {
  const user = typeof window === "undefined" ? undefined : window.__OM_AUTH_USER__;
  const data = typeof window === "undefined" ? undefined : window.__OM_DASHBOARD_DATA__;

  if (!user || !data) return <LoginPage />;

  return (
    <DashboardClient
      data={data}
      currentUser={user}
      publicLoginUrl={window.__OM_PUBLIC_LOGIN_URL__}
    />
  );
}

