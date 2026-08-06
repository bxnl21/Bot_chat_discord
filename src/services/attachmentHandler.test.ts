import assert from 'node:assert/strict';
import test from 'node:test';
import { processAttachments } from './attachmentHandler';

function asDataUrl(mimeType: string, data: Buffer): string {
  return `data:${mimeType};base64,${data.toString('base64')}`;
}

test('keeps an image PDF as application/pdf for Gemini native vision', async () => {
  const pdf = Buffer.from('%PDF-1.7 image-only fixture');
  const result = await processAttachments([
    ['discord-id', {
      name: 'scan.pdf',
      contentType: 'application/pdf',
      size: pdf.length,
      url: asDataUrl('application/pdf', pdf),
    }],
  ]);

  assert.equal(result.fileNames[0], 'scan.pdf');
  assert.equal(result.totalBytes, pdf.length);
  assert.equal(result.parts[1].inlineData?.mimeType, 'application/pdf');
  assert.equal(result.parts[1].inlineData?.data, pdf.toString('base64'));
});

test('accepts supported images and infers MIME type from extension', async () => {
  const image = Buffer.from('fake png bytes');
  const result = await processAttachments([{
    name: 'photo.png',
    contentType: null,
    url: asDataUrl('image/png', image),
  }]);

  assert.equal(result.parts[1].inlineData?.mimeType, 'image/png');
});

test('rejects unsupported attachment formats', async () => {
  await assert.rejects(
    processAttachments([{
      name: 'archive.zip',
      contentType: 'application/zip',
      url: asDataUrl('application/zip', Buffer.from('zip')),
    }]),
    /Không hỗ trợ định dạng/,
  );
});
