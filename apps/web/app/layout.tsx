import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "SpeckyAI",
  description: "Ambient meeting capture, AI notes, and PDFs."
};

export default function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props;

  return (
    <html lang="en">
      <body className="min-h-screen bg-speckyai-background text-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
