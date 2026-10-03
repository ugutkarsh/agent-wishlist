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
  title: "Agent Wishlist",
  description: "What agents wish they had. Ranked.",
  openGraph: {
    title: "Agent Wishlist",
    description: "What agents wish they had. Ranked.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-950 font-sans text-zinc-100">
        <div className="flex-1">{children}</div>
        <footer className="border-t border-white/10 px-4 py-4 text-center text-sm text-zinc-500">
          Built with Supabase, Vercel, and OpenAI.
        </footer>
      </body>
    </html>
  );
}
