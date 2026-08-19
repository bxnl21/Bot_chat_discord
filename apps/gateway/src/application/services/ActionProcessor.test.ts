import assert from 'node:assert/strict';
import test from 'node:test';
import { ActionProcessor } from './ActionProcessor';
import { Reminder } from '../../domain/entities/Reminder';

test('treats an ISO reminder without offset as Vietnam time', async () => {
  let saved: Reminder | undefined;
  const processor = new ActionProcessor(
    {
      save: async value => { saved = value; },
      findAppointmentsByUserAndDate: async () => [], findDue: async () => [], deleteAppointmentsByKeyword: async () => 0, deleteAllAppointments: async () => 0, deletePendingRemindersByKeyword: async () => 0,
    },
    { save: async () => {}, findByUserId: async () => [], deleteByKeyword: async () => 0, deleteAll: async () => 0 },
  );

  const result = await processor.process(
    'Đã tạo. [REMINDER: {"content":"Uống nước","time":"2026-08-20T05:18:29"}]', 'user', 'channel',
  );

  assert.equal(result, 'Đã tạo.');
  assert.equal(saved?.targetTime.toISOString(), '2026-08-19T22:18:29.000Z');
});

test('preserves an explicit ISO offset', async () => {
  let saved: Reminder | undefined;
  const processor = new ActionProcessor(
    {
      save: async value => { saved = value; },
      findAppointmentsByUserAndDate: async () => [], findDue: async () => [], deleteAppointmentsByKeyword: async () => 0, deleteAllAppointments: async () => 0, deletePendingRemindersByKeyword: async () => 0,
    },
    { save: async () => {}, findByUserId: async () => [], deleteByKeyword: async () => 0, deleteAll: async () => 0 },
  );
  await processor.process('[REMINDER: {"content":"Họp","time":"2026-08-20T05:18:29+07:00"}]', 'user', 'channel');
  assert.equal(saved?.targetTime.toISOString(), '2026-08-19T22:18:29.000Z');
});

test('stores and removes every reminder marker in a multi-event schedule', async () => {
  const saved: Reminder[] = [];
  const processor = new ActionProcessor(
    {
      save: async value => { saved.push(value); },
      findAppointmentsByUserAndDate: async () => [], findDue: async () => [], deleteAppointmentsByKeyword: async () => 0, deleteAllAppointments: async () => 0, deletePendingRemindersByKeyword: async () => 0,
    },
    { save: async () => {}, findByUserId: async () => [], deleteByKeyword: async () => 0, deleteAll: async () => 0 },
  );
  const response = await processor.process([
    'Đã tạo lịch cho bạn.',
    '[REMINDER: {"content":"Ăn sáng","time":"2026-08-20T07:00:00+07:00"}]',
    '[REMINDER: {"content":"Làm việc","time":"2026-08-20T09:30:00+07:00"}]',
    '[REMINDER: {"content":"Ăn trưa","time":"2026-08-20T11:30:00+07:00"}]',
  ].join('\n'), 'user', 'channel');

  assert.equal(saved.length, 3);
  assert.deepEqual(saved.map(x => x.content), ['Ăn sáng', 'Làm việc', 'Ăn trưa']);
  assert.equal(response, 'Đã tạo lịch cho bạn.');
  assert.doesNotMatch(response, /REMINDER/);
});

test('lists appointments by time and excludes reminders', async () => {
  const appointment = new Reminder(undefined, 'user', 'channel', 'Đi ăn với bạn', new Date('2026-08-20T08:00:00Z'), false, 'appointment');
  const processor = new ActionProcessor(
    {
      save: async () => {}, findDue: async () => [],
      findAppointmentsByUserAndDate: async () => [appointment],
      deleteAppointmentsByKeyword: async () => 0, deleteAllAppointments: async () => 0, deletePendingRemindersByKeyword: async () => 0,
    },
    { save: async () => {}, findByUserId: async () => [], deleteByKeyword: async () => 0, deleteAll: async () => 0 },
  );
  const response = await processor.process('[GET_APPOINTMENTS: {"date":"2026-08-20"}]', 'user', 'channel');
  assert.match(response, /\*\*15:00\*\* — Đi ăn với bạn/);
  assert.doesNotMatch(response, /^1\./m);
});

test('deletes an appointment before returning the refreshed list', async () => {
  const appointments = [
    new Reminder('1', 'user', 'channel', 'Ăn sáng', new Date('2026-08-20T00:00:00Z'), true, 'appointment'),
    new Reminder('2', 'user', 'channel', 'Đi ăn với bạn', new Date('2026-08-20T08:00:00Z'), false, 'appointment'),
  ];
  const processor = new ActionProcessor(
    {
      save: async () => {}, findDue: async () => [],
      findAppointmentsByUserAndDate: async () => appointments,
      deleteAppointmentsByKeyword: async (_user, keyword) => {
        const before = appointments.length;
        for (let index = appointments.length - 1; index >= 0; index--) if (appointments[index].content.toLowerCase().includes(keyword.toLowerCase())) appointments.splice(index, 1);
        return before - appointments.length;
      },
      deleteAllAppointments: async () => appointments.splice(0).length,
      deletePendingRemindersByKeyword: async () => 0,
    },
    { save: async () => {}, findByUserId: async () => [], deleteByKeyword: async () => 0, deleteAll: async () => 0 },
  );
  const response = await processor.process(
    '[DELETE_APPOINTMENT: {"keyword":"đi ăn"}]\n[GET_APPOINTMENTS: {"date":"2026-08-20"}]', 'user', 'channel',
  );
  assert.match(response, /\*\*07:00\*\* — Ăn sáng/);
  assert.doesNotMatch(response, /Đi ăn với bạn/);
});

test('delete all removes every appointment and returns one authoritative schedule', async () => {
  const appointments = [
    new Reminder('1', 'user', 'channel', 'Lịch cũ', new Date('2026-08-20T02:30:00Z'), true, 'appointment'),
  ];
  const processor = new ActionProcessor(
    {
      save: async value => { appointments.push(value); }, findDue: async () => [],
      findAppointmentsByUserAndDate: async () => appointments,
      deleteAppointmentsByKeyword: async () => 0,
      deleteAllAppointments: async () => appointments.splice(0).length,
      deletePendingRemindersByKeyword: async () => 0,
    },
    { save: async () => {}, findByUserId: async () => [], deleteByKeyword: async () => 0, deleteAll: async () => 0 },
  );
  const response = await processor.process([
    'Danh sách do AI đoán:\n- **09:30** — Lịch cũ',
    '[DELETE_APPOINTMENT: {"keyword":"all"}]',
    '[APPOINTMENT: {"content":"Lịch mới","time":"2026-08-20T17:00:00+07:00"}]',
    '[GET_APPOINTMENTS: {"date":"2026-08-20"}]',
  ].join('\n'), 'user', 'channel');

  assert.equal(response, '**Lịch hẹn ngày 2026-08-20:**\n- **17:00** — Lịch mới');
  assert.doesNotMatch(response, /Lịch cũ/);
  assert.equal((response.match(/Lịch hẹn ngày/g) || []).length, 1);
});
