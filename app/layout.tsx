import type { Metadata } from "next";
import { DM_Sans, Lato } from "next/font/google";
import { AppToaster } from "@/components/app-toaster";
import "./globals.css";

const display = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
  fallback: ["Segoe UI", "Helvetica Neue", "system-ui", "sans-serif"],
});

const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  fallback: ["Segoe UI", "Helvetica Neue", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Ighub Testing Platform",
  description: "Ighub Testing Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
