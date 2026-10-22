export const APP_DEEP_LINK = "https://gubify.com/community/{slug}";
export const ANDROID_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.gubify.app";
export const IOS_STORE_URL = "";

const GUBIFY_ANDROID_PACKAGE = "com.gubify.app";
const COMMUNITY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateSlug(slug: string): void {
  if (
    slug.length < 1 ||
    slug.length > 60 ||
    !COMMUNITY_SLUG_PATTERN.test(slug)
  ) {
    throw new TypeError("Invalid Community slug");
  }
}

export function buildCommunityHttpsUrl(slug: string): string {
  validateSlug(slug);
  return APP_DEEP_LINK.replace("{slug}", encodeURIComponent(slug));
}

export function buildAndroidCommunityIntent(slug: string): string {
  const canonical = new URL(buildCommunityHttpsUrl(slug));
  const fallback = encodeURIComponent(ANDROID_STORE_URL);
  return `intent://${canonical.host}${canonical.pathname}#Intent;scheme=https;package=${GUBIFY_ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`;
}

export function communityLaunchTarget(
  slug: string,
  userAgent: string,
): string | null {
  return /android/i.test(userAgent)
    ? buildAndroidCommunityIntent(slug)
    : null;
}
