import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gubify.com"),
  title: "Gubify — Turn every message into action",
  description:
    "Gubify transforms group chat messages into tasks, events, proposals, shared budgets and group goals.",
  keywords: [
    "group chat",
    "group planning",
    "shared tasks",
    "shared budget",
    "group goals",
    "Gubify",
  ],
  openGraph: {
    title: "Gubify — Turn every message into action",
    description:
      "From everyday conversations to tasks, events, polls and shared goals — without leaving the chat.",
    url: "https://gubify.com",
    siteName: "Gubify",
    locale: "en_US",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Gubify",
              applicationCategory: "CommunicationApplication",
              operatingSystem: "Android, iOS",
              url: "https://gubify.com",
              description:
                "Gubify turns group chat messages into tasks, events, proposals, shared budgets and group goals.",
              offers: {
                "@type": "Offer",
                availability: "https://schema.org/PreOrder",
              },
            }).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
