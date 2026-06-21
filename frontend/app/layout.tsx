import type { Metadata } from "next";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";

export const metadata: Metadata = {
  title: "UrbanFlow AI — Traffic Disruption Command Center",
  description: "AI-powered event traffic command center for Bengaluru",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <body style={{ height: "100%", overflow: "hidden" }}>{children}</body>
    </html>
  );
}
