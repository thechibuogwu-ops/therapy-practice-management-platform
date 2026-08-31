import { put, del, head } from "@vercel/blob";
import crypto from "crypto";

const configuredMegabytes = Number(process.env.MAX_UPLOAD_MB || "");
const configuredLimit = Number(process.env.MAX_UPLOAD_SIZE_BYTES || (Number.isFinite(configuredMegabytes) && configuredMegabytes > 0 ? configuredMegabytes * 1024 * 1024 : 10 * 1024 * 1024));
export const MAX_UPLOAD_SIZE_BYTES = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : 10 * 1024 * 1024;

const ALLOWED_MIMES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function hasPrefix(buffer: Buffer, values: number[]) {
  return buffer.length >= values.length && values.every((value, index) => buffer[index] === value);
}

function matchesExpectedSignature(mime: string, buffer: Buffer) {
  if (mime === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mime === "application/msword") return hasPrefix(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return hasPrefix(buffer, [0x50, 0x4b, 0x03, 0x04]);
  if (mime === "image/jpeg") return hasPrefix(buffer, [0xff, 0xd8, 0xff]);
  if (mime === "image/png") return hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mime === "image/webp") return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

export function isAllowedMime(mime: string) {
  return mime in ALLOWED_MIMES;
}

export async function validateFile(file: File): Promise<{ error: string | null; buffer?: Buffer }> {
  if (!isAllowedMime(file.type)) {
    return { error: "Unsupported file type. Allowed: PDF, DOC, DOCX, JPG, PNG, WEBP." };
  }
  if (file.size <= 0) return { error: "File is empty." };
  if (file.size > MAX_UPLOAD_SIZE_BYTES) return { error: `File is too large. Maximum size is ${Math.floor(MAX_UPLOAD_SIZE_BYTES / 1024 / 1024)} MB.` };

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesExpectedSignature(file.type, buffer)) {
    return { error: "The uploaded file does not match its declared file type." };
  }
  return { error: null, buffer };
}

export function safeDownloadName(name: string) {
  const baseName = String(name || "").split(/[\\/]/).pop() || "";
  const safe = baseName
    .normalize("NFKC")
    .replace(/[\r\n\x00-\x1F\x7F"\\/;]/g, "_")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/^\.+/, "")
    .replace(/\.{2,}/g, "_")
    .trim()
    .slice(0, 180);
  return safe || "download";
}

export const safeDownloadFilename = safeDownloadName;

export async function saveBuffer(buffer: Buffer, mime: string, subdir: "documents" | "attachments") {
  const storedName = `${crypto.randomUUID()}${ALLOWED_MIMES[mime]}`;
  const blobPath = `${subdir}/${storedName}`;
  const blob = await put(blobPath, buffer, { access: "private", contentType: mime });
  return { storedName, filePath: blob.pathname, size: buffer.length, mime, url: blob.url };
}

export async function getFileBuffer(storedPath: string): Promise<Buffer | null> {
  try {
    const info = await head(storedPath);
    const res = await fetch(info.url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

export async function deleteFile(storedPath: string) {
  try {
    await del(storedPath);
  } catch {
    // best-effort cleanup
  }
}