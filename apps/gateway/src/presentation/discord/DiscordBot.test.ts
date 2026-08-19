import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldRespond } from './DiscordBot';

test('responds without a mention only in the configured AI channel', () => {
  const policy = { aiChannelId: 'ai-channel', requireMention: false };
  assert.equal(shouldRespond('ai-channel', false, policy), true);
  assert.equal(shouldRespond('other-channel', false, policy), false);
  assert.equal(shouldRespond('other-channel', true, policy), false);
});

test('requireMention mode ignores unmentioned messages but always accepts mentions', () => {
  const policy = { aiChannelId: 'channel-a', requireMention: true };
  assert.equal(shouldRespond('channel-a', false, policy), false);
  assert.equal(shouldRespond('channel-a', true, policy), true);
});

test('configured channel remains strict even when requireMention is enabled', () => {
  const policy = { aiChannelId: 'ai-channel', requireMention: true };
  assert.equal(shouldRespond('ai-channel', true, policy), true);
  assert.equal(shouldRespond('other-channel', true, policy), false);
});
