import {
  LEGAL_LAST_UPDATED,
  LEGAL_VERSION,
  type LegalDocument,
} from "./legal-types";
import { sections1 } from "./privacy-part1";
import { sections2 } from "./privacy-part2";
import { sections3 } from "./privacy-part3";
import { sections4 } from "./privacy-part4";

export const privacyDocument: LegalDocument = {
  slug: "privacy",
  title: "Privacy Policy",
  description:
    "How Gubify processes personal data across the app, website, Community discovery, moderation and account-deletion services.",
  eyebrow: "Privacy at Gubify",
  versionLabel: "Policy version",
  version: LEGAL_VERSION,
  lastUpdated: LEGAL_LAST_UPDATED,
  navLinks: [
    ["Support", "/support"],
    ["Delete Account", "/delete-account"],
    ["Terms of Service", "/terms"],
    ["Community Guidelines", "/guidelines"],
  ],
  sections: [...sections1, ...sections2, ...sections3, ...sections4],
};
