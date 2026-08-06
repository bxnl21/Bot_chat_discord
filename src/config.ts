function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Thiếu biến môi trường bắt buộc: ${name}`);
  return value;
}

export const config = {
  discordToken: requireEnvironmentVariable('DISCORD_TOKEN'),
  geminiApiKey: requireEnvironmentVariable('GEMINI_API_KEY'),
  mongoUri: requireEnvironmentVariable('MONGO_URI'),
  aiChannelId: process.env.AI_CHANNEL_ID?.trim() || '1518636726917005372',
  geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
} as const;
