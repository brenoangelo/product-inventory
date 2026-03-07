import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const interTight  = Inter_Tight({
  variable: "--font-inter-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StockFlow - Gestão de Estoque & Fluxo de Caixa",
  description:
    "Controle seu estoque e fluxo de caixa de forma simples e profissional.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${interTight.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
