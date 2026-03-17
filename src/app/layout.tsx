import type { Metadata } from "next";
import "@/shared/styles/globals.css";
import { Sarabun } from "next/font/google";

const sarabun = Sarabun({
  style: "normal",
  subsets: ["latin", "thai"],
  weight: ["400", "700"],
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: "Authoring Tool Structure",
  description: "Authoring Tool Structure",
};  


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${sarabun.variable}`}>{children}</body>
    </html>
  );
}
