import assert from 'node:assert/strict';
import test from 'node:test';
import { splitMessage } from './splitter';

test('never returns a chunk longer than the configured limit', () => {
  const chunks = splitMessage('x'.repeat(5_000), 1_900);
  assert.equal(chunks.join(''), 'x'.repeat(5_000));
  assert.ok(chunks.every((chunk) => chunk.length <= 1_900));
});

test('prefers splitting at natural whitespace', () => {
  assert.deepEqual(splitMessage('hello world again', 11), ['hello world', 'again']);
});
