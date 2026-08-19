import assert from 'node:assert/strict';
import test from 'node:test';
import { Conversation } from './Conversation';

test('conversation keeps only the configured number of recent entries', () => {
  const conversation = new Conversation('user');
  for (let i = 0; i < 25; i++) conversation.add(`u${i}`, `a${i}`, 20);
  assert.equal(conversation.all().length, 20);
  assert.equal(conversation.recent(1)[0].user, 'u24');
});
