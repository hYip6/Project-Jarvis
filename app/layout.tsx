import type { Metadata } from "next";
import { Barlow_Condensed, Figtree } from "next/font/google";
import { HelpGuide } from "./components/HelpGuide";
import "./globals.css";

const sans = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

const display = Barlow_Condensed({
  weight: ["400", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-barlow",
});

export const metadata: Metadata = {
  title: "SBU Bite Bridge MVP",
  description: "Student dining dollar order exchange marketplace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <HelpGuide />
      </body>
    </html>
  );
}
