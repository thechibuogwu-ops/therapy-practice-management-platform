import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.resolve(process.cwd(), ".uploads");
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
  // Content-Disposition must never receive raw user input. Use only the basename
  // and replace characters that could create a header or path interpretation.
  const baseName = path.basename(String(name || ""));
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

// Backward-compatible alias for existing callers.
export const safeDownloadFilename = safeDownloadName;

export function saveBuffer(buffer: Buffer, mime: string, subdir: "documents" | "attachments") {
  const dir = path.resolve(UPLOAD_DIR, subdir);
  if (!dir.startsWith(`${UPLOAD_DIR}${path.sep}`)) throw new Error("Invalid storage location");
  fs.mkdirSync(dir, { recursive: true });
  const storedName = `${crypto.randomUUID()}${ALLOWED_MIMES[mime]}`;
  const filePath = path.join(dir, storedName);
  fs.writeFileSync(filePath, buffer, { flag: "wx" });
  return { storedName, filePath: `${subdir}/${storedName}`, size: buffer.length, mime };
}

export function getFileBuffer(storedPath: string): Buffer | null {
  const fullPath = path.resolve(UPLOAD_DIR, storedPath);
  if (!fullPath.startsWith(`${UPLOAD_DIR}${path.sep}`) || !fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath);
}

export function deleteFile(storedPath: string) {
  const fullPath = path.resolve(UPLOAD_DIR, storedPath);
  if (fullPath.startsWith(`${UPLOAD_DIR}${path.sep}`) && fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
}
