import assert from 'node:assert/strict';
import test from 'node:test';
import { Reminder } from '../../domain/entities/Reminder';
import { DispatchDueReminders } from './DispatchDueReminders';

test('dispatches due reminders and marks them as sent', async () => {
  const reminder = new Reminder('id', 'user', 'channel', 'Uống nước', new Date('2026-01-01T00:00:00Z'));
  let notification = '';
  const useCase = new DispatchDueReminders(
    {
      findDue: async () => [reminder], save: async () => {},
      findAppointmentsByUserAndDate: async () => [], deleteAppointmentsByKeyword: async () => 0, deleteAllAppointments: async () => 0, deletePendingRemindersByKeyword: async () => 0,
    },
    { send: async (_channel, _user, content) => { notification = content; } },
    { now: () => new Date('2026-01-01T00:01:00Z') },
  );
  await useCase.execute();
  assert.equal(notification, 'Uống nước');
  assert.equal(reminder.isSent, true);
});

test('a failed notification does not block another reminder', async () => {
  const reminders = [
    new Reminder('1', 'user', 'bad', 'Lỗi', new Date(0)),
    new Reminder('2', 'user', 'good', 'Thành công', new Date(0)),
  ];
  const saved: string[] = [];
  const useCase = new DispatchDueReminders(
    {
      findDue: async () => reminders, save: async reminder => { saved.push(reminder.id!); },
      findAppointmentsByUserAndDate: async () => [], deleteAppointmentsByKeyword: async () => 0, deleteAllAppointments: async () => 0, deletePendingRemindersByKeyword: async () => 0,
    },
    { send: async channel => { if (channel === 'bad') throw new Error('missing channel'); } },
    { now: () => new Date() },
  );
  await assert.rejects(useCase.execute(), AggregateError);
  assert.deepEqual(saved, ['2']);
  assert.equal(reminders[0].isSent, false);
  assert.equal(reminders[1].isSent, true);
});
