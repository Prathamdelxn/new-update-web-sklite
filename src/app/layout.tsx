import type { Metadata } from "next";
import { Inter, Noto_Sans_Arabic, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthContext";
import { ToastProvider } from "@/providers/ToastContext";
import { ConfirmProvider } from "@/providers/ConfirmContext";
import { SocketProvider } from "@/providers/SocketContext";
import { QueryProvider } from "@/providers/QueryProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Arabic UI text (used when the language is switched to العربية)
const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
  preload: false,
});

// Landing page label face (only downloaded where used)
const labelMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-label",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  // absolute base for the link-preview image (app/opengraph-image.png)
  metadataBase: new URL("https://skystructlite.vercel.app"),
  title: "SkyStruct Lite | Construction Management",
  description: "Next-gen construction management platform",
  openGraph: {
    siteName: "SkyStruct Lite",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${notoArabic.variable} ${labelMono.variable} antialiased`} suppressHydrationWarning>
      <body className="font-sans min-h-screen bg-[#F8FAFF] text-slate-900 selection:bg-blue-100 overflow-x-hidden" suppressHydrationWarning>
        {/* Subtle background accent */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-100/40 blur-[120px]" />
          <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-100/30 blur-[120px]" />
        </div>

        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
              <ConfirmProvider>
                <SocketProvider>
                  <main className="relative z-0">
                    {children}
                  </main>
                </SocketProvider>
              </ConfirmProvider>
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

