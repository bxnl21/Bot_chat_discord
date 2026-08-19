import mongoose from 'mongoose';
import { ActionProcessor } from '../application/services/ActionProcessor';
import { InstructionBuilder } from '../application/services/InstructionBuilder';
import { DispatchDueReminders } from '../application/use-cases/DispatchDueReminders';
import { HandleDiscordMessage } from '../application/use-cases/HandleDiscordMessage';
import { GeminiAiService } from '../infrastructure/ai/GeminiAiService';
import { AppConfig } from '../infrastructure/config/AppConfig';
import { MongoConversationRepository, MongoReminderRepository, MongoTodoRepository } from '../infrastructure/database/MongoRepositories';
import { SystemClock, UuidGenerator } from '../infrastructure/system/SystemServices';
import { PythonWorkerClient } from '../infrastructure/worker/PythonWorkerClient';
import { ReadabilityArticleScraper } from '../infrastructure/scraper/ReadabilityArticleScraper';
import { DiscordBot, DiscordNotifier } from '../presentation/discord/DiscordBot';

export class AppContainer {
  private constructor(readonly bot: DiscordBot) {}
  static async create(config: AppConfig): Promise<AppContainer> {
    await mongoose.connect(config.mongoUri);
    const conversations = new MongoConversationRepository();
    const reminders = new MongoReminderRepository(); const todos = new MongoTodoRepository();
    const clock = new SystemClock(); const ids = new UuidGenerator();
    const ai = new GeminiAiService(config.geminiApiKey, config.geminiModel, config.geminiFallbackModel);
    const worker = new PythonWorkerClient(config.workerUrl, config.workerToken);
    const actions = new ActionProcessor(reminders, todos);
    const handler = new HandleDiscordMessage(conversations, worker, new ReadabilityArticleScraper(), ai, actions, new InstructionBuilder(), clock, ids);
    let bot!: DiscordBot;
    const notifier = new DiscordNotifier(() => bot.client);
    const dispatcher = new DispatchDueReminders(reminders, notifier, clock);
    bot = new DiscordBot(
      config.discordToken,
      { aiChannelId: config.aiChannelId, requireMention: config.requireMention },
      handler,
      dispatcher,
    );
    return new AppContainer(bot);
  }
}
