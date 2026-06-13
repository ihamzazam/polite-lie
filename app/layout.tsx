import type { Metadata } from "next";
import { Geist, Fraunces } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://polite-lie.vercel.app"),
  title: {
    default:
      "Polite Lie — practice interviews against a customer who lies politely",
    template: "%s · Polite Lie",
  },
  description:
    "Every AI research tool points the AI at your customers. This one points it at you. Run a discovery interview against a synthetic customer with a hidden agenda, then get graded on your technique.",
  openGraph: {
    title: "Polite Lie",
    description:
      "Practice customer interviews against a synthetic user who lies politely. Get graded on your technique.",
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
    <html
      lang="en"
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
