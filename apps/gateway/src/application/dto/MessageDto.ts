export interface AttachmentInput {
  name: string;
  mimeType: string | null;
  size: number;
  url: string;
}

export interface HandleMessageInput {
  userId: string;
  channelId: string;
  prompt: string;
  attachments: AttachmentInput[];
}

export interface DocumentAnalysis {
  fileName: string;
  mimeType: string;
  text: string;
  pageCount: number | null;
  warnings: string[];
}
