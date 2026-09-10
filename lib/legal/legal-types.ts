export type LegalBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] };

export type LegalSection = {
  id: string;
  title: string;
  blocks: LegalBlock[];
  callout?: boolean;
};

export type LegalDocument = {
  slug: "terms" | "privacy" | "guidelines";
  title: string;
  description: string;
  eyebrow: string;
  versionLabel: string;
  version: string;
  lastUpdated: string;
  navLinks: [string, string][];
  sections: LegalSection[];
};

export const LEGAL_VERSION = "2026-09-09.2";
export const LEGAL_LAST_UPDATED = "September 9, 2026";
