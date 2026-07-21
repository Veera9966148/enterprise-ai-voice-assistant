/**
 * Client-side file processing helper for Vision AI and Document Intelligence
 * Handles reading images, PDFs, DOCX, TXT, Markdown, CSV, and Excel spreadsheets.
 */

export interface ProcessedFileInput {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileType: "image" | "document";
  base64Data: string; // Pure base64 string without data:mime;base64, prefix
  dataUrl: string;    // Full data URL for rendering previews
  rawText?: string;   // Optional extracted text for plain text docs
}

export function detectFileTypeAndMime(file: File): {
  fileType: "image" | "document";
  mimeType: string;
  extension: string;
} {
  const fileName = file.name.toLowerCase();
  const ext = fileName.split(".").pop() || "";

  if (file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(ext)) {
    let mime = file.type || "image/png";
    if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
    if (ext === "webp") mime = "image/webp";
    if (ext === "gif") mime = "image/gif";
    return { fileType: "image", mimeType: mime, extension: ext };
  }

  // Document types
  let mime = file.type || "application/octet-stream";
  if (ext === "pdf") mime = "application/pdf";
  else if (ext === "docx") mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  else if (ext === "doc") mime = "application/msword";
  else if (ext === "txt") mime = "text/plain";
  else if (ext === "md" || ext === "markdown") mime = "text/markdown";
  else if (ext === "csv") mime = "text/csv";
  else if (ext === "xlsx") mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  else if (ext === "xls") mime = "application/vnd.ms-excel";
  else if (ext === "json") mime = "application/json";

  return { fileType: "document", mimeType: mime, extension: ext };
}

export async function processUploadedFile(file: File): Promise<ProcessedFileInput> {
  const { fileType, mimeType, extension } = detectFileTypeAndMime(file);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // Plain text reading for TXT, Markdown, CSV, JSON
    if (["txt", "md", "csv", "json", "xml", "html"].includes(extension)) {
      const textReader = new FileReader();
      textReader.onload = () => {
        const textContent = textReader.result as string;

        // Also convert to data URL for consistency
        const dataUrlReader = new FileReader();
        dataUrlReader.onload = () => {
          const dataUrl = dataUrlReader.result as string;
          const base64Data = dataUrl.split(",")[1] || "";
          resolve({
            fileName: file.name,
            fileSize: file.size,
            mimeType,
            fileType,
            base64Data,
            dataUrl,
            rawText: textContent,
          });
        };
        dataUrlReader.onerror = (e) => reject(e);
        dataUrlReader.readAsDataURL(file);
      };
      textReader.onerror = (e) => reject(e);
      textReader.readAsText(file);
      return;
    }

    // Binary / Base64 reading for Images, PDFs, DOCX, XLSX
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(",")[1] || "";
      resolve({
        fileName: file.name,
        fileSize: file.size,
        mimeType,
        fileType,
        base64Data,
        dataUrl,
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
