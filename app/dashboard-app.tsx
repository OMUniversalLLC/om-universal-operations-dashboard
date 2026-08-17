"use client";

import type { AuthenticatedUser } from "./auth-types";
import DashboardClient, { type DashboardData } from "./dashboard-client";
import publicDashboardData from "./public-dashboard-data.json";

declare global {
  interface Window {
    __OM_AUTH_USER__?: AuthenticatedUser;
    __OM_DASHBOARD_DATA__?: DashboardData;
    __OM_PUBLIC_LOGIN_URL__?: string;
  }
}

export default function DashboardApp() {
  const user = typeof window === "undefined" ? undefined : window.__OM_AUTH_USER__;
  const injectedData = typeof window === "undefined" ? undefined : window.__OM_DASHBOARD_DATA__;
  const publicLoginUrl = typeof window === "undefined" ? undefined : window.__OM_PUBLIC_LOGIN_URL__;
  const data = injectedData ?? (publicDashboardData as DashboardData);

  return (
    <DashboardClient
      data={data}
      currentUser={user}
      publicLoginUrl={publicLoginUrl}
    />
  );
}
