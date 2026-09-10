import {
  LEGAL_LAST_UPDATED,
  LEGAL_VERSION,
  type LegalDocument,
} from "./legal-types";
import { sections1 } from "./terms-part1";
import { sections2 } from "./terms-part2";
import { sections3 } from "./terms-part3";
import { sections4 } from "./terms-part4";
import { sections5 } from "./terms-part5";

export const termsDocument: LegalDocument = {
  slug: "terms",
  title: "Terms of Service",
  description:
    "Terms governing use of the Gubify app, website, Private Gubs, public Communities and related services.",
  eyebrow: "Using Gubify",
  versionLabel: "Terms version",
  version: LEGAL_VERSION,
  lastUpdated: LEGAL_LAST_UPDATED,
  navLinks: [
    ["Support", "/support"],
    ["Privacy Policy", "/privacy"],
    ["Community Guidelines", "/guidelines"],
  ],
  sections: [...sections1, ...sections2, ...sections3, ...sections4, ...sections5],
};
