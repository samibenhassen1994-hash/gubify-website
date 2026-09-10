import {
  LEGAL_LAST_UPDATED,
  LEGAL_VERSION,
  type LegalDocument,
} from "./legal-types";
import { sections1 } from "./guidelines-part1";
import { sections2 } from "./guidelines-part2";
import { sections3 } from "./guidelines-part3";

export const guidelinesDocument: LegalDocument = {
  slug: "guidelines",
  title: "Community Guidelines",
  description:
    "Rules for safe and responsible participation in Private Gubs, public Communities and other user-generated-content features.",
  eyebrow: "Safety at Gubify",
  versionLabel: "Guidelines version",
  version: LEGAL_VERSION,
  lastUpdated: LEGAL_LAST_UPDATED,
  navLinks: [
    ["Support", "/support"],
    ["Terms of Service", "/terms"],
    ["Privacy Policy", "/privacy"],
  ],
  sections: [...sections1, ...sections2, ...sections3],
};
