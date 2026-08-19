import { Conversation } from '../entities/Conversation';
import { Reminder } from '../entities/Reminder';
import { Todo } from '../entities/Todo';

export interface ConversationRepository {
  findByUserId(userId: string): Promise<Conversation>;
  save(conversation: Conversation): Promise<void>;
}

export interface ReminderRepository {
  save(reminder: Reminder): Promise<void>;
  findAppointmentsByUserAndDate(userId: string, date: string): Promise<Reminder[]>;
  findDue(now: Date): Promise<Reminder[]>;
  deleteAppointmentsByKeyword(userId: string, keyword: string): Promise<number>;
  deleteAllAppointments(userId: string): Promise<number>;
  deletePendingRemindersByKeyword(userId: string, keyword: string): Promise<number>;
}

export interface TodoRepository {
  save(todo: Todo): Promise<void>;
  findByUserId(userId: string): Promise<Todo[]>;
  deleteByKeyword(userId: string, keyword: string): Promise<number>;
  deleteAll(userId: string): Promise<number>;
}
