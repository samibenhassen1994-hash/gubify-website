import type { LegalDocument } from "./legal-types";
import { sections1 } from "./guidelines-part1";
import { sections2 } from "./guidelines-part2";
import { sections3 } from "./guidelines-part3";

export const guidelinesDocument = {...{"slug":"guidelines","title":"Community Guidelines","description":"Rules for safe and responsible participation in Private Gubs, public Communities and other user-generated-content features.","eyebrow":"Safety at Gubify","versionLabel":"Guidelines version","navLinks":[["Support","/support"],["Terms of Service","/terms"],["Privacy Policy","/privacy"]],"lastUpdated":"September 9, 2026","version":"2026-09-09.2"}, sections: [...sections1,...sections2,...sections3]} satisfies LegalDocument;
