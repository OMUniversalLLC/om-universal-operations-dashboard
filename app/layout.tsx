import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sales & Mercury Operations | Management Portal",
  description: "Private management reporting for three-store sales and Mercury team task delivery.",
  openGraph: {
    title: "Sales & Mercury Operations",
    description: "Store performance and Mercury team delivery in one management view.",
    type: "website",
    images: [{ url: "/social-preview.png", width: 1792, height: 1024, alt: "Sales and Mercury Operations management dashboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sales & Mercury Operations",
    description: "Store performance and Mercury team delivery in one management view.",
    images: ["/social-preview.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
