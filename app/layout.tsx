import type { Metadata } from "next";
import "./globals.css";
import { AiAssistant } from "@/components/ai-assistant";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: {
    default: "AVRMD — Medical XR Network",
    template: "%s | AVRMD",
  },
  description:
    "Find medical VR, AR, and MR solutions by clinical need, with the organizations, evidence, events, and hardware behind them.",
  metadataBase: new URL("https://avrmd.cyalin.com"),
  openGraph: {
    title: "AVRMD — Medical XR Network",
    description:
      "A professional, source-aware knowledge network for medical extended reality.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <AiAssistant />
      </body>
    </html>
  );
}
