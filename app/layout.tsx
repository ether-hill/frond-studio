import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import ScrollToTop from "@/components/ScrollToTop";

const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Frond Studio — Natural selections",
  description:
    "A transdisciplinary design & technology studio — biophilic design, ethical AI, design systems and generative work, remotely worldwide.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={schibsted.variable} suppressHydrationWarning>
      <head>
        {/* Runs before first paint: (1) applies the saved/system colour theme so
            there's no flash of the wrong theme, and (2) marks JS active so GSAP
            reveal targets start hidden (degrades gracefully without JS). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement;try{var t=localStorage.getItem('frond-theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';d.setAttribute('data-theme',t);}catch(e){}try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('gsap-on');}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ScrollToTop />
        {children}
      </body>
    </html>
  );
}
