import type { LegalDocument } from "./legal-types";
import { sections1 } from "./privacy-part1";
import { sections2 } from "./privacy-part2";
import { sections3 } from "./privacy-part3";
import { sections4 } from "./privacy-part4";

export const privacyDocument = {...{"slug":"privacy","title":"Privacy Policy","description":"How Gubify processes personal data across the app, website, Community discovery, moderation and account-deletion services.","eyebrow":"Privacy at Gubify","versionLabel":"Policy version","navLinks":[["Support","/support"],["Delete Account","/delete-account"],["Terms of Service","/terms"],["Community Guidelines","/guidelines"]],"lastUpdated":"September 9, 2026","version":"2026-09-09.2"}, sections: [...sections1,...sections2,...sections3,...sections4]} satisfies LegalDocument;
