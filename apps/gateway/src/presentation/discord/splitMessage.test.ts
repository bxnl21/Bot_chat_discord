import assert from 'node:assert/strict';
import test from 'node:test';
import { splitMessage } from './splitMessage';
test('Discord chunks never exceed the limit', () => assert.ok(splitMessage('x'.repeat(5000)).every(x => x.length <= 1900)));
