import type { Metadata } from "next";
import LegalDocumentPage from "../legal-document-page";
import { guidelinesDocument } from "../../lib/legal/guidelines";

export const metadata: Metadata = {
  title: "Community Guidelines | Gubify",
  description:
    "Rules for safe and responsible participation in Private Gubs, public Communities and other user-generated-content features.",
  alternates: { canonical: "/guidelines" },
  openGraph: {
    title: "Community Guidelines | Gubify",
    description:
      "Rules for safe and responsible participation in Private Gubs, public Communities and other user-generated-content features.",
    url: "https://gubify.com/guidelines",
    siteName: "Gubify",
    type: "website",
  },
};

export default function GuidelinesPage() {
  return <LegalDocumentPage document={guidelinesDocument} />;
}
