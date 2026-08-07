import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Welcome",
  description: "Visitor check-in",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The kiosk lives in Guided Access on an iPad; a stray pinch-zoom leaves the
  // check-in form unusable until someone notices.
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
