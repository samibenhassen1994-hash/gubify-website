const CLOUDINARY_HOST = "res.cloudinary.com";
const CLOUDINARY_UPLOAD_PATH = "/image/upload/";
const SOCIAL_TRANSFORMATION = "c_fill,w_1200,h_630,q_auto,f_jpg";

export type CommunitySocialImage = {
  url: string;
  isCloudinary: boolean;
};

export function getCommunitySocialImage(
  imageUrl: unknown,
): CommunitySocialImage | null {
  if (typeof imageUrl !== "string") return null;

  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  if (url.hostname !== CLOUDINARY_HOST) {
    return { url: imageUrl, isCloudinary: false };
  }

  const uploadPathIndex = url.pathname.indexOf(CLOUDINARY_UPLOAD_PATH);
  if (uploadPathIndex === -1) return { url: imageUrl, isCloudinary: false };

  const imagePathStart = uploadPathIndex + CLOUDINARY_UPLOAD_PATH.length;
  const imagePath = url.pathname.slice(imagePathStart);
  if (!imagePath) return { url: imageUrl, isCloudinary: false };

  if (!imagePath.startsWith(`${SOCIAL_TRANSFORMATION}/`)) {
    url.pathname = `${url.pathname.slice(0, imagePathStart)}${SOCIAL_TRANSFORMATION}/${imagePath}`;
  }

  return { url: url.toString(), isCloudinary: true };
}

export function getCommunitySocialImageUrl(imageUrl: unknown) {
  return getCommunitySocialImage(imageUrl)?.url ?? null;
}
