export interface ConversationEntry {
  user: string;
  ai: string;
  timestamp: Date;
}

export class Conversation {
  private readonly entries: ConversationEntry[];

  constructor(readonly userId: string, entries: ConversationEntry[] = []) {
    if (!userId.trim()) throw new Error('userId không được để trống');
    this.entries = [...entries];
  }

  add(user: string, ai: string, limit = 20): void {
    this.entries.push({ user, ai, timestamp: new Date() });
    if (this.entries.length > limit) this.entries.splice(0, this.entries.length - limit);
  }

  recent(limit = 10): ConversationEntry[] {
    return this.entries.slice(-limit);
  }

  all(): ConversationEntry[] {
    return [...this.entries];
  }
}
