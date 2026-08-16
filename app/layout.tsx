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
  title: "Tater Tot Tour",
  description: "A rated map of tater tots across the Bay Area.",
};

/*
 * Cloudflare Web Analytics: cookieless, so no consent banner, and it needs no
 * DNS change — the beacon reports from the page itself, which is why this works
 * on GitHub Pages with the domain still at Namecheap.
 *
 * The token is public by nature (it ships in the page source), so it lives in a
 * repo variable rather than a secret. Absent the variable nothing renders at
 * all, which keeps local development out of the stats.
 */
const cloudflareToken = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* The app is a fixed full-screen map whose panels scroll internally, so
          the document itself must never scroll. Without this the root's dvh
          height and this element's percentage height resolve differently as
          mobile browser chrome hides, leaving the page scrollable by the
          difference — which slides the header up off the top of the screen.
          overscroll-none also stops the rubber-band bounce over the map. */}
      <body className="h-full overflow-hidden overscroll-none">
        {children}
        {cloudflareToken && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: cloudflareToken })}
          />
        )}
      </body>
    </html>
  );
}
