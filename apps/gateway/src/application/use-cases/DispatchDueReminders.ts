import { ReminderRepository } from '../../domain/repositories/Repositories';
import { Clock } from '../ports/Ports';

export interface ReminderNotifier { send(channelId: string, userId: string, content: string): Promise<void>; }

export class DispatchDueReminders {
  constructor(private repository: ReminderRepository, private notifier: ReminderNotifier, private clock: Clock) {}
  async execute(): Promise<void> {
    const due = await this.repository.findDue(this.clock.now());
    const results = await Promise.allSettled(due.map(async reminder => {
      await this.notifier.send(reminder.channelId, reminder.userId, reminder.content);
      reminder.markAsSent();
      await this.repository.save(reminder);
    }));
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length) throw new AggregateError(failures.map(x => (x as PromiseRejectedResult).reason), `Không gửi được ${failures.length}/${due.length} lời nhắc`);
  }
}
