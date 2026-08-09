import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { BalanceProvider } from "@/context/BalanceContext";
import { SettingsProvider } from "@/context/SettingsContext";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });

export const metadata: Metadata = {
  title: "Steak — Play Money Casino",
  description: "A Stake-style social casino with provably fair originals. No real money.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${manrope.variable} ${bricolage.variable}`}>
      <body className="flex h-full bg-[var(--bg)] font-sans">
        <SettingsProvider>
          <BalanceProvider>
            <Sidebar />
            <div className="flex flex-col flex-1 min-h-screen overflow-y-auto">
              <Header />
              <main className="flex-1 p-4 md:p-6">{children}</main>
            </div>
          </BalanceProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
