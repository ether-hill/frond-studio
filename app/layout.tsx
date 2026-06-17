import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Frond Studio — Design, built in motion",
  description:
    "A transdisciplinary design & technology studio — websites, apps and platforms for ambitious clients around the world.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={schibsted.variable} suppressHydrationWarning>
      <head>
        {/* Marks JS as active before first paint so GSAP reveal targets start
            hidden (no flash) while the page still degrades gracefully if JS is
            off. Mirrored by .gsap-on rules in globals.css + RevealRoot. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('gsap-on')}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
