import assert from 'node:assert/strict';
import test from 'node:test';
import { isGeminiQuotaError } from './GeminiAiService';

test('recognizes Gemini quota errors by status or API message', () => {
  assert.equal(isGeminiQuotaError({ status: 429 }), true);
  assert.equal(isGeminiQuotaError(new Error('RESOURCE_EXHAUSTED: quota exceeded')), true);
  assert.equal(isGeminiQuotaError({ status: 500, message: 'server error' }), false);
});
