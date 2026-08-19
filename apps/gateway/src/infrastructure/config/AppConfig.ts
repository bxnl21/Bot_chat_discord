function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Thiếu biến môi trường bắt buộc: ${name}`);
  return value;
}

export interface AppConfig {
  discordToken: string; geminiApiKey: string; geminiModel: string; geminiFallbackModel: string; mongoUri: string;
  aiChannelId: string; requireMention: boolean; workerUrl: string; workerToken: string;
}

export function loadConfig(): AppConfig {
  return {
    discordToken: required('DISCORD_TOKEN'), geminiApiKey: required('GEMINI_API_KEY'),
    mongoUri: required('MONGO_URI'), workerToken: required('WORKER_TOKEN'),
    geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
    geminiFallbackModel: process.env.GEMINI_FALLBACK_MODEL?.trim() || 'gemini-3.5-flash-lite',
    aiChannelId: required('AI_CHANNEL_ID'),
    requireMention: process.env.REQUIRE_MENTION?.trim().toLowerCase() === 'true',
    workerUrl: process.env.WORKER_URL?.trim() || 'http://worker:8000',
  };
}
