export type AuthenticatedUser = {
  email: string;
  name: string;
  role: "Admin" | "Manager" | "Viewer" | string;
  storeAccess: string;
};

export type GoogleAuthConfig = {
  clientId: string;
  loginUri: string;
  publicLoginUrl: string;
};

