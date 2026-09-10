import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AnnaSetu — Smart Agricultural Procurement Coordination Platform",
  description: "Dynamic procurement coordination, fair queueing, physical capacity modeling, and transaction transparency for Indian agriculture.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-surface text-gray-900 antialiased font-sans selection:bg-agro-200">
        {children}
      </body>
    </html>
  );
}
