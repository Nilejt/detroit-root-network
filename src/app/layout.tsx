import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Detroit Root Network",
  description: "Find fresh food, current inventory, selling locations, and volunteer opportunities from Detroit urban farms.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
