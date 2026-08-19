import mongoose, { Schema } from 'mongoose';
import { Conversation } from '../../domain/entities/Conversation';
import { Reminder } from '../../domain/entities/Reminder';
import { Todo } from '../../domain/entities/Todo';
import { ConversationRepository, ReminderRepository, TodoRepository } from '../../domain/repositories/Repositories';

// Keep the existing model/collection names and document shapes to preserve production data.
const ConversationModel = mongoose.model('UserMemory', new Schema({ userId: { type: String, unique: true, required: true }, conversations: [{ user: String, ai: String, timestamp: Date }] }));
const ReminderModel = mongoose.model('Reminder', new Schema({
  userId: { type: String, required: true }, channelId: { type: String, required: true },
  content: { type: String, required: true }, targetTime: { type: Date, required: true, index: true },
  isSent: { type: Boolean, default: false, index: true },
  kind: { type: String, enum: ['appointment', 'reminder'], index: true },
}));
const TodoModel = mongoose.model('Todo', new Schema({ userId: String, content: String, createdAt: Date }));

export class MongoConversationRepository implements ConversationRepository {
  async findByUserId(userId: string): Promise<Conversation> {
    const doc = await ConversationModel.findOne({ userId }).lean();
    return new Conversation(userId, (doc?.conversations || []).map(x => ({ user: x.user || '', ai: x.ai || '', timestamp: x.timestamp || new Date() })));
  }
  async save(value: Conversation): Promise<void> { await ConversationModel.updateOne({ userId: value.userId }, { userId: value.userId, conversations: value.all() }, { upsert: true }); }
}

export class MongoReminderRepository implements ReminderRepository {
  async save(x: Reminder): Promise<void> {
    const data = { userId: x.userId, channelId: x.channelId, content: x.content, targetTime: x.targetTime, isSent: x.isSent, kind: x.kind };
    if (x.id) await ReminderModel.updateOne({ _id: x.id }, data); else await ReminderModel.create(data);
  }
  private map(x: any): Reminder { return new Reminder(String(x._id), x.userId, x.channelId, x.content, x.targetTime, x.isSent, x.kind || 'appointment'); }
  async findAppointmentsByUserAndDate(userId: string, date: string): Promise<Reminder[]> {
    const start = new Date(`${date}T00:00:00+07:00`), end = new Date(`${date}T23:59:59.999+07:00`);
    return (await ReminderModel.find({ userId, targetTime: { $gte: start, $lte: end }, ...appointmentFilter() }).sort({ targetTime: 1 }).lean()).map(x => this.map(x));
  }
  async findDue(now: Date): Promise<Reminder[]> { return (await ReminderModel.find({ targetTime: { $lte: now }, isSent: { $ne: true } }).sort({ targetTime: 1 }).lean()).map(x => this.map(x)); }
  async deleteAppointmentsByKeyword(userId: string, keyword: string): Promise<number> { return (await ReminderModel.deleteMany({ userId, ...appointmentFilter(), content: { $regex: escapeRegex(keyword), $options: 'i' } })).deletedCount; }
  async deleteAllAppointments(userId: string): Promise<number> { return (await ReminderModel.deleteMany({ userId, ...appointmentFilter() })).deletedCount; }
  async deletePendingRemindersByKeyword(userId: string, keyword: string): Promise<number> { return (await ReminderModel.deleteMany({ userId, kind: 'reminder', isSent: { $ne: true }, content: { $regex: escapeRegex(keyword), $options: 'i' } })).deletedCount; }
}

export class MongoTodoRepository implements TodoRepository {
  async save(x: Todo): Promise<void> { await TodoModel.create({ userId: x.userId, content: x.content, createdAt: x.createdAt }); }
  async findByUserId(userId: string): Promise<Todo[]> { return (await TodoModel.find({ userId }).sort({ createdAt: -1 }).lean()).map(x => new Todo(String(x._id), x.userId || '', x.content || '', x.createdAt || new Date())); }
  async deleteByKeyword(userId: string, keyword: string): Promise<number> { return (await TodoModel.deleteMany({ userId, content: { $regex: escapeRegex(keyword), $options: 'i' } })).deletedCount; }
  async deleteAll(userId: string): Promise<number> { return (await TodoModel.deleteMany({ userId })).deletedCount; }
}

function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function appointmentFilter(): Record<string, unknown> { return { $or: [{ kind: 'appointment' }, { kind: { $exists: false } }] }; }
