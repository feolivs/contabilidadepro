import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { CacheProvider } from "@/providers/cache-provider";
import { baseMetadata } from "@/lib/metadata";
import { LazyProviders } from "@/providers/lazy-providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = baseMetadata;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          enableColorScheme
          storageKey="contador-solo-theme"
          themes={['light', 'dark', 'system']}
        >
          <QueryProvider>
            <CacheProvider autoCleanup={false} cleanupInterval={10 * 60 * 1000}>
              <AuthProvider>
                <LazyProviders>
                  {children}
                  <ToastProvider />
                </LazyProviders>
              </AuthProvider>
            </CacheProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
