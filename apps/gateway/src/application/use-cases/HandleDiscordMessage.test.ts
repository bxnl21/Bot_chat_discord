import assert from 'node:assert/strict';
import test from 'node:test';
import { Conversation } from '../../domain/entities/Conversation';
import { HandleDiscordMessage, shouldUseGoogleSearch } from './HandleDiscordMessage';
import { InstructionBuilder } from '../services/InstructionBuilder';

test('message use case analyzes attachments and stores the response', async () => {
  const conversation = new Conversation('u'); let saved = false; let receivedPrompt = '';
  const useCase = new HandleDiscordMessage(
    { findByUserId: async () => conversation, save: async () => { saved = true; } },
    { analyze: async x => ({ fileName: x.name, mimeType: 'application/pdf', text: 'worker text', pageCount: 1, warnings: [] }) },
    { scrape: async () => 'article' },
    { generate: async x => { receivedPrompt = x.prompt; return 'AI response'; } },
    { process: async x => x } as any,
    new InstructionBuilder(), { now: () => new Date('2026-01-01T00:00:00Z') }, { generate: () => 'job-1' },
  );
  const result = await useCase.execute({ userId: 'u', channelId: 'c', prompt: 'Tóm tắt', attachments: [{ name: 'a.pdf', mimeType: 'application/pdf', size: 1, url: 'x' }] });
  assert.equal(result, 'AI response'); assert.match(receivedPrompt, /worker text/); assert.equal(saved, true);
});

test('uses Google Search only for current-information intent', () => {
  assert.equal(shouldUseGoogleSearch('Xin chào, bạn là ai?'), false);
  assert.equal(shouldUseGoogleSearch('Thời tiết hôm nay thế nào?'), true);
  assert.equal(shouldUseGoogleSearch('Hãy tìm kiếm tài liệu Node.js mới nhất'), true);
});
