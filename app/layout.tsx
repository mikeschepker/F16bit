import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const pixelHeading = Press_Start_2P({
  variable: "--font-pixel-heading",
  subsets: ["latin"],
  weight: "400",
});

const pixelBody = VT323({
  variable: "--font-pixel-body",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "F16bit — retro F1 replays",
  description:
    "Unofficial fan project: real Formula 1 race data redrawn as a 16-bit arcade broadcast.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${pixelHeading.variable} ${pixelBody.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#05070f] text-[#dbe4ff]">
        {children}
        <footer className="mt-auto py-4 text-center text-[11px] font-pixel-body text-[#4a5a86] px-4">
          Unofficial fan project — race data via{" "}
          <a
            href="https://openf1.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[#8fa2c8]"
          >
            OpenF1
          </a>
          . Not affiliated with Formula 1, FIA, or any team.
        </footer>
      </body>
    </html>
  );
}
