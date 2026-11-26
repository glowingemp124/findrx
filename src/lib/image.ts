const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const ACCEPTED_IMAGE_TYPES = ACCEPTED.join(",");

export type ImageResult = { ok: true; dataUrl: string } | { ok: false; error: string };

/**
 * Center-crops an uploaded image to a square and shrinks it to `size` pixels as JPEG, so profile
 * photos stay small enough for browser storage. A backend upload replaces this later.
 */
export async function toSquareAvatar(file: File, size = 192): Promise<ImageResult> {
  if (!ACCEPTED.includes(file.type)) return { ok: false, error: "Use a JPG, PNG, WebP or GIF image." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "Choose an image under 5 MB." };

  try {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return { ok: false, error: "Your browser couldn't process that image." };
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
    bitmap.close();
    return { ok: true, dataUrl: canvas.toDataURL("image/jpeg", 0.85) };
  } catch {
    return { ok: false, error: "That file couldn't be read as an image." };
  }
}
