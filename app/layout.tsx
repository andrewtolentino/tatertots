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
      <body className="h-full overflow-hidden overscroll-none">{children}</body>
    </html>
  );
}
