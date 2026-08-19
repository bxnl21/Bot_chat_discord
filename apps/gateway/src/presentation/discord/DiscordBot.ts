import { Client, GatewayIntentBits, Message } from 'discord.js';
import { HandleDiscordMessage } from '../../application/use-cases/HandleDiscordMessage';
import { DispatchDueReminders, ReminderNotifier } from '../../application/use-cases/DispatchDueReminders';
import { AttachmentInput } from '../../application/dto/MessageDto';
import { splitMessage } from './splitMessage';
import { AiQuotaExceededError } from '../../application/errors/AiQuotaExceededError';

export class DiscordNotifier implements ReminderNotifier {
  constructor(private getClient: () => Client) {}
  async send(channelId: string, userId: string, content: string): Promise<void> {
    const channel = await this.getClient().channels.fetch(channelId);
    if (!channel?.isTextBased() || !('send' in channel)) throw new Error(`Không thể gửi lời nhắc vào channel ${channelId}`);
    await channel.send(`<@${userId}> ơi! Đến giờ rồi: **${content}**`);
  }
}

export interface DiscordResponsePolicy {
  aiChannelId: string;
  requireMention: boolean;
}

export function shouldRespond(channelId: string, mentioned: boolean, policy: DiscordResponsePolicy): boolean {
  // The configured channel is a strict boundary: mentions from other channels
  // never bypass it. AppConfig guarantees that aiChannelId is not empty.
  if (channelId !== policy.aiChannelId) return false;
  if (policy.requireMention) return mentioned;
  return true;
}

export class DiscordBot {
  readonly client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
  private reminderTimer?: NodeJS.Timeout;
  private reminderDispatchRunning = false;
  constructor(private token: string, private policy: DiscordResponsePolicy, private handleMessage: HandleDiscordMessage, private dispatchReminders: DispatchDueReminders) {}
  async start(): Promise<void> {
    this.client.once('clientReady', ready => {
      console.log(`Bot đã sẵn sàng: ${ready.user.tag}`);
      void this.runReminderDispatch();
      this.reminderTimer = setInterval(() => void this.runReminderDispatch(), 15_000);
      this.reminderTimer.unref();
    });
    this.client.on('messageCreate', message => this.onMessage(message));
    await this.client.login(this.token);
  }
  private async runReminderDispatch(): Promise<void> {
    if (this.reminderDispatchRunning) return;
    this.reminderDispatchRunning = true;
    try { await this.dispatchReminders.execute(); }
    catch (error) { console.error('Reminder scheduler:', error); }
    finally { this.reminderDispatchRunning = false; }
  }
  private async onMessage(message: Message): Promise<void> {
    if (message.author.bot) return;
    const mentioned = message.mentions.has(this.client.user!);
    if (!shouldRespond(message.channel.id, mentioned, this.policy)) return;
    const prompt = message.content.replace(new RegExp(`<@!?${this.client.user?.id}>`, 'g'), '').trim();
    if (!prompt && message.attachments.size === 0) { await message.reply('Bạn cần mình giúp gì?'); return; }
    try {
      if ('sendTyping' in message.channel) await message.channel.sendTyping();
      const attachments: AttachmentInput[] = message.attachments.map(x => ({ name: x.name || 'file', mimeType: x.contentType, size: x.size, url: x.url }));
      const response = await this.handleMessage.execute({ userId: message.author.id, channelId: message.channel.id, prompt, attachments });
      const chunks = splitMessage(response);
      if (!chunks.length) throw new Error('Phản hồi trống');
      await message.reply(chunks[0]);
      if ('send' in message.channel) for (const chunk of chunks.slice(1)) await message.channel.send(chunk);
    } catch (error) {
      console.error('Message processing failed:', error);
      const messageText = error instanceof AiQuotaExceededError
        ? 'Gemini API đã hết hạn mức sử dụng. Yêu cầu chưa được thực hiện; vui lòng thử lại sau khi quota được làm mới hoặc kiểm tra gói API.'
        : 'Mình chưa xử lý được yêu cầu này. Vui lòng thử lại sau.';
      await message.reply(messageText);
    }
  }
}
