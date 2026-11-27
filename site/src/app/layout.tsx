import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const allo = localFont({
  src: "./fonts/AlloVariable.woff2",
  weight: "400 900",
  style: "normal",
  display: "swap",
  variable: "--font-allo",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://github.com/Benceszalaiii/meet-coder"),
  title: {
    default: "MeetCoder — nem kell figyelned, a kód megíródik",
    template: "%s · MeetCoder",
  },
  description:
    "A MeetCoder figyeli a tanár megosztott képernyőjét a Google Meetben, jegyzetel, és a saját projektedbe írja, amit a tanár épp kódol. macOS-re és Windowsra.",
};

export const viewport: Viewport = {
  themeColor: "#0b0b3b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" className={allo.variable}>
      <body>{children}</body>
    </html>
  );
}
