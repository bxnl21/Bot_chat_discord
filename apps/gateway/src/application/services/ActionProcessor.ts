import { Reminder } from '../../domain/entities/Reminder';
import { Todo } from '../../domain/entities/Todo';
import { ReminderRepository, TodoRepository } from '../../domain/repositories/Repositories';

export class ActionProcessor {
  constructor(private reminders: ReminderRepository, private todos: TodoRepository) {}

  async process(text: string, userId: string, channelId: string): Promise<string> {
    let output = text;
    output = await this.reminderActions(output, userId, channelId);
    output = await this.todoActions(output, userId);
    return output.trim();
  }

  private parse(text: string, marker: string): Record<string, string> | null {
    const match = text.match(new RegExp(`\\[${marker}:\\s*({.*?})\\s*\\]`));
    if (!match) return null;
    try { return JSON.parse(match[1]) as Record<string, string>; } catch { return null; }
  }

  private parseAll(text: string, marker: string): Record<string, string>[] {
    const matches = text.matchAll(new RegExp(`\\[${marker}:\\s*({.*?})\\s*\\]`, 'g'));
    const values: Record<string, string>[] = [];
    for (const match of matches) {
      try { values.push(JSON.parse(match[1]) as Record<string, string>); }
      catch { throw new Error(`Action ${marker} không chứa JSON hợp lệ`); }
    }
    return values;
  }

  private remove(text: string, marker: string): string {
    return text.replace(new RegExp(`\\[${marker}:\\s*{.*?}\\s*\\]`, 'g'), '').trim();
  }

  private async reminderActions(text: string, userId: string, channelId: string): Promise<string> {
    // Apply destructive actions first so "replace my schedule" means
    // delete old appointments, create new ones, then return the refreshed list.
    const deleteAppointment = this.parse(text, 'DELETE_APPOINTMENT');
    if (deleteAppointment?.keyword) {
      const count = this.isAllKeyword(deleteAppointment.keyword)
        ? await this.reminders.deleteAllAppointments(userId)
        : await this.reminders.deleteAppointmentsByKeyword(userId, deleteAppointment.keyword);
      text = this.remove(text, 'DELETE_APPOINTMENT') + `\n\nĐã xóa **${count}** lịch hẹn.`;
    }
    const deleteReminder = this.parse(text, 'DELETE_REMINDER');
    if (deleteReminder?.keyword) {
      const count = await this.reminders.deletePendingRemindersByKeyword(userId, deleteReminder.keyword);
      text = this.remove(text, 'DELETE_REMINDER') + `\n\nĐã xóa **${count}** lời nhắc.`;
    }

    text = await this.createScheduledItems(text, 'APPOINTMENT', 'appointment', userId, channelId);
    text = await this.createScheduledItems(text, 'REMINDER', 'reminder', userId, channelId);

    const get = this.parse(text, 'GET_APPOINTMENTS') || this.parse(text, 'GET_REMINDERS');
    if (get?.date) {
      const items = await this.reminders.findAppointmentsByUserAndDate(userId, get.date);
      // The database is the only source of truth for a requested schedule.
      // Discard any list generated from conversational memory to avoid duplicates/stale entries.
      text = items.length
        ? `**Lịch hẹn ngày ${get.date}:**` + items.map(x => `\n- **${this.formatVietnamTime(x.targetTime)}** — ${x.content}`).join('')
        : `Không có lịch hẹn nào trong ngày **${get.date}**.`;
    }
    return text;
  }

  private async createScheduledItems(text: string, marker: string, kind: 'appointment' | 'reminder', userId: string, channelId: string): Promise<string> {
    const creates = this.parseAll(text, marker);
    if (creates.length) {
      const items = creates.map(create => {
        if (!create.content || !create.time) throw new Error('Lời nhắc thiếu nội dung hoặc thời gian');
        return new Reminder(undefined, userId, channelId, create.content, this.parseVietnamTime(create.time), false, kind);
      });
      await Promise.all(items.map(item => this.reminders.save(item)));
      text = this.remove(text, marker);
    }
    return text;
  }

  private formatVietnamTime(value: Date): string {
    return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }).format(value);
  }

  private isAllKeyword(value: string): boolean {
    return /^(all|tất cả|toàn bộ)$/i.test(value.trim());
  }

  private parseVietnamTime(value: string): Date {
    const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(value)
      ? `${value}+07:00`
      : value;
    return new Date(normalized);
  }

  private async todoActions(text: string, userId: string): Promise<string> {
    const add = this.parse(text, 'TODO_ADD');
    if (add?.content) {
      await this.todos.save(new Todo(undefined, userId, add.content));
      text = this.remove(text, 'TODO_ADD') + `\n\nĐã thêm: **${add.content}**`;
    }
    if (text.includes('[TODO_GET:')) {
      const items = await this.todos.findByUserId(userId);
      text = this.remove(text, 'TODO_GET');
      text += items.length ? '\n\n**Danh sách việc cần làm:**' + items.map((x, i) => `\n${i + 1}. ${x.content}`).join('') : '\n\nDanh sách việc cần làm đang trống.';
    }
    const del = this.parse(text, 'TODO_DELETE');
    if (del?.keyword) {
      const count = del.keyword === 'all' ? await this.todos.deleteAll(userId) : await this.todos.deleteByKeyword(userId, del.keyword);
      text = this.remove(text, 'TODO_DELETE') + `\n\nĐã xóa **${count}** công việc.`;
    }
    return text;
  }
}
