export type ScheduledItemKind = 'appointment' | 'reminder';

export class Reminder {
  constructor(
    readonly id: string | undefined,
    readonly userId: string,
    readonly channelId: string,
    readonly content: string,
    readonly targetTime: Date,
    private sent = false,
    readonly kind: ScheduledItemKind = 'reminder',
  ) {
    if (!content.trim()) throw new Error('Nội dung nhắc nhở không được để trống');
    if (Number.isNaN(targetTime.getTime())) throw new Error('Thời gian nhắc nhở không hợp lệ');
  }

  isDue(now: Date): boolean { return !this.sent && this.targetTime <= now; }
  markAsSent(): void { this.sent = true; }
  get isSent(): boolean { return this.sent; }
}
