export type CommunityShareNavigator = {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: {
    writeText: (text: string) => Promise<void>;
  };
};

export type CommunityShareResult = "shared" | "copied" | "cancelled" | "error";

type CommunityShareInput = {
  slug: string;
  communityName: string;
  navigatorLike: CommunityShareNavigator;
};

function canonicalCommunityUrl(slug: string) {
  return `https://gubify.com/community/${encodeURIComponent(slug)}`;
}

function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

export async function shareCommunity({
  slug,
  communityName,
  navigatorLike,
}: CommunityShareInput): Promise<CommunityShareResult> {
  const url = canonicalCommunityUrl(slug);

  if (typeof navigatorLike.share === "function") {
    try {
      await navigatorLike.share({
        title: `${communityName} | Gubify`,
        text: `Check out ${communityName} on Gubify.`,
        url,
      });
      return "shared";
    } catch (error) {
      return isAbortError(error) ? "cancelled" : "error";
    }
  }

  try {
    if (typeof navigatorLike.clipboard?.writeText !== "function") {
      return "error";
    }
    await navigatorLike.clipboard.writeText(url);
    return "copied";
  } catch {
    return "error";
  }
}

export function getCommunityShareFeedback(result: CommunityShareResult) {
  if (result === "copied") return "Link copied";
  if (result === "error") return "Unable to share Community.";
  return null;
}
