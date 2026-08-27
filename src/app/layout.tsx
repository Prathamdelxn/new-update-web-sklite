import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthContext";
import { ToastProvider } from "@/providers/ToastContext";
import { ConfirmProvider } from "@/providers/ConfirmContext";
import { SocketProvider } from "@/providers/SocketContext";
import "@/bones/registry.js";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SkyStruct Lite | Construction Management",
  description: "Next-gen construction management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} antialiased`} suppressHydrationWarning>
      <body className="font-sans min-h-screen bg-[#F8FAFF] text-slate-900 selection:bg-blue-100 overflow-x-hidden" suppressHydrationWarning>
        {/* Subtle background accent */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-100/40 blur-[120px]" />
          <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-100/30 blur-[120px]" />
        </div>

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
      </body>
    </html>
  );
}
