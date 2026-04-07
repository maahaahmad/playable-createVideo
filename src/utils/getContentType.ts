// This function maps common video file extensions to their corresponding MIME content types. If the file extension is not recognized, it defaults to "application/octet-stream"
// It's important for S3 uploads to have the correct content type, as it helps the server understand how to handle the file

const CONTENT_TYPE_MAP: Record<string, string> = {
  // QuickTime / Apple
  ".mov": "video/quicktime",
  // MPEG-4
  ".mp4": "video/mp4",
  ".m4v": "video/x-m4v",
  // WebM
  ".webm": "video/webm",
  // AVI
  ".avi": "video/x-msvideo",
  // Windows Media
  ".wmv": "video/x-ms-wmv",
  // Matroska
  ".mkv": "video/x-matroska",
  // MPEG
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  // 3GPP (mobile)
  ".3gp": "video/3gpp",
  ".3g2": "video/3gpp2",
  // Flash (legacy)
  ".flv": "video/x-flv",
  ".f4v": "video/x-f4v",
  // OGG
  ".ogv": "video/ogg",
};

export function getContentType(fileName: string): string {
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  return CONTENT_TYPE_MAP[ext] ?? "application/octet-stream";
}