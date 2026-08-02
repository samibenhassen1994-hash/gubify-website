export const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const GUBIFY_INVITE_ORIGIN = "https://gubify.com";
export const GUBIFY_ANDROID_PACKAGE = "com.gubify.app";
export const PRE_REGISTRATION_URL = `${GUBIFY_INVITE_ORIGIN}/pre-register`;

const inviteCodePattern = /^([A-HJ-NP-Z2-9]{4})-?([A-HJ-NP-Z2-9]{4})$/;

export type ParsedInviteCode = {
  canonical: string;
  visible: string;
};

export function parseInviteCode(value: unknown): ParsedInviteCode | null {
  if (typeof value !== "string" || (value.length !== 8 && value.length !== 9)) {
    return null;
  }

  const match = inviteCodePattern.exec(value.toUpperCase());
  if (!match) return null;

  const canonical = `${match[1]}${match[2]}`;
  return {
    canonical,
    visible: `${canonical.slice(0, 4)}-${canonical.slice(4)}`,
  };
}

export function buildInviteHttpsUrl(code: ParsedInviteCode): string {
  return `${GUBIFY_INVITE_ORIGIN}/join/${code.visible}`;
}

export function buildAndroidInviteIntent(code: ParsedInviteCode): string {
  const fallback = encodeURIComponent(PRE_REGISTRATION_URL);
  return `intent://gubify.com/join/${code.visible}#Intent;scheme=https;package=${GUBIFY_ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`;
}

type ClipboardWriter = {
  writeText(value: string): Promise<void>;
};

export async function copyInviteCode(
  visibleCode: string,
  clipboard: ClipboardWriter | undefined,
  fallback: (value: string) => boolean,
): Promise<boolean> {
  if (clipboard) {
    try {
      await clipboard.writeText(visibleCode);
      return true;
    } catch {
      // Continue with the local-only selection fallback.
    }
  }
  return fallback(visibleCode);
}
