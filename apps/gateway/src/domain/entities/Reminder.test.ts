import assert from 'node:assert/strict';
import test from 'node:test';
import { Reminder } from './Reminder';

test('reminder becomes no longer due after being sent', () => {
  const reminder = new Reminder(undefined, 'u', 'c', 'Test', new Date('2026-01-01T00:00:00Z'));
  assert.equal(reminder.isDue(new Date('2026-01-02T00:00:00Z')), true);
  reminder.markAsSent();
  assert.equal(reminder.isDue(new Date('2026-01-02T00:00:00Z')), false);
});
