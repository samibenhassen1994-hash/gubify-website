import type { LegalDocument } from "./legal-types";
import { sections1 } from "./terms-part1";
import { sections2 } from "./terms-part2";
import { sections3 } from "./terms-part3";
import { sections4 } from "./terms-part4";
import { sections5 } from "./terms-part5";

export const termsDocument = {...{"slug":"terms","title":"Terms of Service","description":"Terms governing use of the Gubify app, website, Private Gubs, public Communities and related services.","eyebrow":"Using Gubify","versionLabel":"Terms version","navLinks":[["Support","/support"],["Privacy Policy","/privacy"],["Community Guidelines","/guidelines"]],"lastUpdated":"September 9, 2026","version":"2026-09-09.2"}, sections: [...sections1,...sections2,...sections3,...sections4,...sections5]} satisfies LegalDocument;
