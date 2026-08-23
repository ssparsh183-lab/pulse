import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { CursorGlow } from "@/components/shared/cursor-glow";
import { ThemeProvider } from "@/components/shared/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PULSE — Turn Chat Chaos Into Signal",
  description:
    "Real-time audience signal engine for live streams. Convert thousands of noisy messages into a handful of actionable, prioritized insights.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          <CursorGlow />
          {children}
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "var(--panel-bg-1)",
                backdropFilter: "blur(12px)",
                border: "1px solid var(--panel-border)",
                color: "#fafafa",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}