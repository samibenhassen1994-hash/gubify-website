import type { Metadata } from "next";
import LegalDocumentPage from "../legal-document-page";
import { privacyDocument } from "../../lib/legal/privacy";

export const metadata: Metadata = {
  title: "Privacy Policy | Gubify",
  description:
    "How Gubify processes personal data across the app, website, Community discovery, moderation and account-deletion services.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | Gubify",
    description:
      "How Gubify processes personal data across the app, website, Community discovery, moderation and account-deletion services.",
    url: "https://gubify.com/privacy",
    siteName: "Gubify",
    type: "website",
  },
};

export default function PrivacyPage() {
  return <LegalDocumentPage document={privacyDocument} />;
}
