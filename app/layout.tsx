import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Fraunces } from "next/font/google";
import "./globals.css";
import PendoInitializer from "./pendo";

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
    images: ["/api/og"],
  },
  twitter: { card: "summary_large_image", images: ["/api/og"] },
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
      <Script id="pendo-install" strategy="afterInteractive">{`
(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track','trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('a00836df-07c3-4cff-aec9-ec791a349500');
`}</Script>
      <body className="min-h-full font-sans">
        <PendoInitializer />
        {children}
      </body>
    </html>
  );
}
