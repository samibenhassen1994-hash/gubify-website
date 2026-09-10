import type { Metadata } from "next";
import LegalDocumentPage from "../legal-document-page";
import { termsDocument } from "../../lib/legal/terms";

export const metadata: Metadata = {
  title: "Terms of Service | Gubify",
  description:
    "Terms governing use of the Gubify app, website, Private Gubs, public Communities and related services.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service | Gubify",
    description:
      "Terms governing use of the Gubify app, website, Private Gubs, public Communities and related services.",
    url: "https://gubify.com/terms",
    siteName: "Gubify",
    type: "website",
  },
};

export default function TermsPage() {
  return <LegalDocumentPage document={termsDocument} />;
}
