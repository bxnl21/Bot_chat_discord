import { AttachmentInput, DocumentAnalysis } from '../../application/dto/MessageDto';
import { DocumentAnalyzer } from '../../application/ports/Ports';

const MAX_BYTES = 18 * 1024 * 1024;
export class PythonWorkerClient implements DocumentAnalyzer {
  constructor(private baseUrl: string, private token: string, private timeoutMs = 60_000) {}
  async analyze(attachment: AttachmentInput, correlationId: string): Promise<DocumentAnalysis> {
    if (attachment.size > MAX_BYTES) throw new Error(`Tệp ${attachment.name} vượt quá 18 MB`);
    const download = await fetch(attachment.url, { signal: AbortSignal.timeout(30_000) });
    if (!download.ok) throw new Error(`Không tải được ${attachment.name} (HTTP ${download.status})`);
    const bytes = await download.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) throw new Error(`Tệp ${attachment.name} vượt quá 18 MB`);
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: attachment.mimeType || 'application/octet-stream' }), attachment.name);
    const response = await fetch(`${this.baseUrl}/v1/documents/analyze`, {
      method: 'POST', body: form, signal: AbortSignal.timeout(this.timeoutMs),
      headers: { authorization: `Bearer ${this.token}`, 'x-correlation-id': correlationId },
    });
    if (!response.ok) throw new Error(`Worker xử lý thất bại (HTTP ${response.status}): ${(await response.text()).slice(0, 300)}`);
    return await response.json() as DocumentAnalysis;
  }
}
