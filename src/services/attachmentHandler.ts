export interface GeminiPart {
  inlineData?: { data: string; mimeType: string };
  text?: string;
}

export interface DiscordAttachmentLike {
  name?: string | null;
  contentType?: string | null;
  size?: number;
  url: string;
}

export interface ProcessedAttachments {
  parts: GeminiPart[];
  fileNames: string[];
  totalBytes: number;
}

const DOWNLOAD_TIMEOUT_MS = 30_000;
const MAX_TOTAL_BYTES = 18 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function getMimeType(attachment: DiscordAttachmentLike): string | null {
  const declaredType = attachment.contentType?.split(';', 1)[0]?.trim().toLowerCase();
  const extension = attachment.name?.toLowerCase().split('.').pop();

  if (declaredType === 'application/pdf' || extension === 'pdf') return 'application/pdf';
  if (declaredType && SUPPORTED_IMAGE_TYPES.has(declaredType)) return declaredType;

  const imageTypesByExtension: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
  };

  return extension ? imageTypesByExtension[extension] ?? null : null;
}

async function downloadAttachment(attachment: DiscordAttachmentLike): Promise<Buffer> {
  if (attachment.size && attachment.size > MAX_TOTAL_BYTES) {
    throw new Error(`Tệp vượt quá giới hạn ${MAX_TOTAL_BYTES / 1024 / 1024} MB`);
  }

  const response = await fetch(attachment.url, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Không thể tải tệp từ Discord (HTTP ${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_TOTAL_BYTES) {
    throw new Error(`Tệp vượt quá giới hạn ${MAX_TOTAL_BYTES / 1024 / 1024} MB`);
  }

  return buffer;
}

function normalizeAttachment(entry: unknown): DiscordAttachmentLike {
  const value = Array.isArray(entry) ? entry[1] : entry;

  if (!value || typeof value !== 'object' || !('url' in value)) {
    throw new Error('Attachment Discord không hợp lệ');
  }

  return value as DiscordAttachmentLike;
}

/**
 * Sends PDF files directly to Gemini native document vision. This preserves text,
 * scanned pages, diagrams, tables and layout while avoiding large PNG conversions.
 */
export async function processAttachments(entries: unknown[]): Promise<ProcessedAttachments> {
  const parts: GeminiPart[] = [];
  const fileNames: string[] = [];
  let totalBytes = 0;

  for (const entry of entries) {
    const attachment = normalizeAttachment(entry);
    const fileName = attachment.name?.trim() || 'tệp không tên';
    const mimeType = getMimeType(attachment);

    if (!mimeType) {
      throw new Error(
        `Không hỗ trợ định dạng của “${fileName}”. Bot chỉ đọc PDF, PNG, JPEG, WEBP, HEIC và HEIF.`,
      );
    }

    const buffer = await downloadAttachment(attachment);
    totalBytes += buffer.length;

    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new Error(`Tổng dung lượng tệp vượt quá giới hạn ${MAX_TOTAL_BYTES / 1024 / 1024} MB`);
    }

    fileNames.push(fileName);
    parts.push({ text: `\n[TỆP ĐÍNH KÈM: ${fileName}]` });
    parts.push({
      inlineData: {
        data: buffer.toString('base64'),
        mimeType,
      },
    });
  }

  return { parts, fileNames, totalBytes };
}
