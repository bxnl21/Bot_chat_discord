import 'dotenv/config';
import { Client, GatewayIntentBits, Message } from 'discord.js';
import { GoogleGenAI } from '@google/genai';
import mongoose from 'mongoose';
import { startReminderScheduler } from './services/scheduler';
import { Reminder } from './models/Reminder';
import { Todo } from './models/Todo';
import { scrapeArticleText } from './services/scraper';
import { splitMessage } from './services/splitter';
import { processAttachments } from './services/attachmentHandler';
import { config } from './config';

// ==========================================
// 1. CẤU HÌNH DATABASE MONGODB
// ==========================================
mongoose.connect(config.mongoUri)
  .then(() => console.log(' Đã kết nối thành công tới vùng nhớ Đám mây MongoDB Atlas!'))
  .catch(err => console.error(' Lỗi kết nối MongoDB:', err));

const MemorySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  conversations: [
    {
      user: String,
      ai: String,
      timestamp: { type: Date, default: Date.now }
    }
  ]
});
const MemoryModel = mongoose.model('UserMemory', MemorySchema);

// ==========================================
// 2. KHỞI TẠO DISCORD CLIENT & GEMINI ENGINE
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const gemini = new GoogleGenAI({ apiKey: config.geminiApiKey });

const BASE_INSTRUCTION = `Bạn là Mon#0377, một trợ lý ảo thông minh tích hợp Google Search thời gian thực trên Discord. Hãy phân tích câu hỏi, dùng công cụ tìm kiếm khi cần thông tin mới, kết hợp ký ức để trả lời thân thiện, ngắn gọn bằng tiếng Việt.

 ĐẶC BIỆT (XỬ LÝ TỆP ĐÍNH KÈM / PDF / ẢNH): Khi người dùng gửi file PDF hoặc hình ảnh, hệ thống sẽ tự động đọc và đính kèm nội dung tệp vào câu lệnh. Hãy đọc kỹ nội dung trong phần [NỘI DUNG TỆP PDF ĐÍNH KÈM] hoặc hình ảnh được gửi kèm để trả lời, tóm tắt hoặc phân tích theo đúng yêu cầu của người dùng. Tuyệt đối KHÔNG từ chối hoặc nói rằng bạn không đọc được file PDF!

 ĐẶC BIỆT (TẠO LỊCH/NHẮC NHỞ): Khi người dùng yêu cầu nhắc nhở hoặc lên lịch, hãy đồng ý và đính kèm JSON ở CUỐI CÙNG: \`[REMINDER: {"content": "nội dung cần nhắc bằng tiếng Việt", "time": "chuỗi_thời_gian_ISO"}]\`.

 ĐẶC BIỆT (XEM LỊCH HẸN): Khi người dùng muốn xem lịch hẹn, đính kèm JSON ở CUỐI CÙNG: \`[GET_REMINDERS: {"date": "YYYY-MM-DD"}]\`.

 ĐẶC BIỆT (XÓA LỊCH HẸN): Khi người dùng muốn hủy/xóa lịch hẹn, đính kèm JSON ở CUỐI CÙNG: \`[DELETE_REMINDER: {"keyword": "từ_khóa_cần_xóa"}]\`.

 ĐẶC BIỆT (QUẢN LÝ TODO LIST): 
- Thêm việc cần làm: \`[TODO_ADD: {"content": "nội dung việc cần làm"}]\`
- Xem danh sách việc: \`[TODO_GET: {}]\`
- Xóa việc/Xóa hết: \`[TODO_DELETE: {"keyword": "từ_khóa_hoặc_all"}]\``;
client.once('clientReady', (c) => {
  console.log(` Bot AI Mon#0377 đã sẵn sàng hoạt động! Tên: ${c.user?.tag}`);
  startReminderScheduler(client);
});

// ==========================================
// 3. XỬ LÝ TIN NHẮN
// ==========================================
client.on('messageCreate', async (message: Message) => {
  if (message.author.bot) return;

  const AI_CHANNEL_ID = config.aiChannelId;
  const isMentioned = message.mentions.has(client.user!);
  const isAIChannel = message.channel.id === AI_CHANNEL_ID;

  if (isAIChannel || isMentioned) {
    try {
      if ('sendTyping' in message.channel) await message.channel.sendTyping();

      const cleanPrompt = message.content.replace(`<@${client.user?.id}>`, '').trim();
      const hasAttachments = message.attachments.size > 0;

      if (!cleanPrompt && !hasAttachments) {
        if (isMentioned) await message.reply('Bạn gọi mình có việc gì thế? ');
        return;
      }

      // --------------------------------------------------------
      //  CHỨC NĂNG 1: TÓM TẮT WEB TỪ LINK
      // --------------------------------------------------------
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urlMatch = cleanPrompt.match(urlRegex);
      const lowerPrompt = cleanPrompt.toLowerCase();

      const isSummaryIntent = lowerPrompt.includes('tóm tắt') || 
                              lowerPrompt.includes('summary') || 
                              lowerPrompt.includes('review') || 
                              lowerPrompt.includes('đọc giúp') ||
                              lowerPrompt.includes('xem giúp');

      if (urlMatch && isSummaryIntent) {
        const targetUrl = urlMatch[0];
        const waitingMsg = await message.reply(' Mình đang đọc bài viết và tóm tắt lại, đợi tí nhé...');

        try {
          const articleText = await scrapeArticleText(targetUrl);
          const truncatedText = articleText.substring(0, 10000);

          const summaryPrompt = `
Bạn là một trợ lý AI chuyên nghiệp. Hãy đọc và tóm tắt bài viết dưới đây bằng tiếng Việt một cách súc tích, rõ ràng.
Cấu trúc bài tóm tắt yêu cầu:
 **Tiêu đề / Chủ đề chính**: ...
 **Các ý chính cốt lõi**:
- (Gạch đầu dòng ý 1)
- (Gạch đầu dòng ý 2...)
 **Kết luận / Thông điệp chính**: ...

Nội dung bài viết:
${truncatedText}`;

          const response = await gemini.models.generateContent({
            model: config.geminiModel,
            contents: summaryPrompt
          });

          const summaryResult = response.text || 'Không thể tạo bản tóm tắt cho bài viết này.';
          const chunks = splitMessage(summaryResult);
          
          await waitingMsg.edit(chunks[0]);
          
          // Đã fix Type Error ở đây
          if ('send' in message.channel) {
            for (let i = 1; i < chunks.length; i++) {
              await message.channel.send(chunks[i]);
            }
          }
          return;

        } catch (scrapeError: any) {
          await waitingMsg.edit(` Không thể tóm tắt link này: ${scrapeError.message || 'Lỗi không xác định'}`);
          return;
        }
      }

      // --------------------------------------------------------
      //  CHỨC NĂNG 5: TÓM TẮT & RÚT GỌN KÝ ỨC (Lấy 10 câu gần nhất)
      // --------------------------------------------------------
      let userMemory = await MemoryModel.findOne({ userId: message.author.id });
      if (!userMemory) {
        userMemory = new MemoryModel({ userId: message.author.id, conversations: [] });
      }

      let memoryContext = '\n\n[NHẬT KÝ KÝ ỨC GẦN ĐÂY]:\n';
      const recentConversations = userMemory.conversations.slice(-10);

      if (recentConversations.length === 0) {
        memoryContext += '- Chưa có ký ức nào trước đây.';
      } else {
        recentConversations.forEach((chat, index) => {
          memoryContext += `${index + 1}. Bạn: "${chat.user}" -> Bot: "${chat.ai}"\n`;
        });
      }

      const currentTimeVN = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
      const timeContext = `\n\n[THỜI GIAN THỰC TẠI HIỆN TẠI]: Ngay bây giờ là: ${currentTimeVN}.`;
      const dynamicInstruction = BASE_INSTRUCTION + memoryContext + timeContext;

      // --------------------------------------------------------
      //  CHỨC NĂNG 3: ĐỌC VÀ XỬ LÝ FILE ĐÍNH KÈM (PDF & CẢNH/ẢNH OCR)
      // --------------------------------------------------------
      let promptContents: any[] = [];
      
      if (hasAttachments) {
        const processed = await processAttachments(Array.from(message.attachments));
        promptContents = [...processed.parts];
        console.log(
          `[Attachment] Đã chuẩn bị ${processed.fileNames.length} tệp ` +
          `(${(processed.totalBytes / 1024 / 1024).toFixed(2)} MB): ${processed.fileNames.join(', ')}`,
        );
      }
      const userQuery = cleanPrompt || "Hãy đọc, phân tích nội dung chi tiết và tóm tắt tệp/ảnh tớ vừa gửi.";
      // Đặt yêu cầu trước media theo khuyến nghị cho prompt đa phương thức.
      promptContents.unshift({ text: userQuery });

      // Gọi API Gemini
      let aiResponse = '';
      try {
        const response = await gemini.models.generateContent({
          model: config.geminiModel,
          contents: promptContents,
          config: { 
            systemInstruction: dynamicInstruction,
            ...(hasAttachments ? {} : { tools: [{ googleSearch: {} }] })
          }
        });
        aiResponse = response.text || '';
      } catch (geminiError: any) {
        const details = geminiError?.message || String(geminiError);
        console.error('Lỗi API Gemini:', details, geminiError);
        throw new Error(`Gemini không thể xử lý yêu cầu: ${details}`);
      }

      if (aiResponse) {
        // --------------------------------------------------------
        // 1. TẠO LỊCH NHẮC NHỞ
        // --------------------------------------------------------
        if (aiResponse.includes('[REMINDER:')) {
          try {
            const match = aiResponse.match(/\[REMINDER:\s*({.*?})\s*\]/);
            if (match) {
              const reminderData = JSON.parse(match[1]);
              await Reminder.create({
                userId: message.author.id,
                channelId: message.channel.id,
                content: reminderData.content,
                targetTime: new Date(reminderData.time),
                isSent: false
              });
              aiResponse = aiResponse.replace(/\[REMINDER:\s*{.*?}\s*\]/, '').trim();
            }
          } catch (err) {
            console.error('Lỗi bóc tách REMINDER:', err);
          }
        }

        // --------------------------------------------------------
        // 2. XEM LỊCH HẸN
        // --------------------------------------------------------
        if (aiResponse.includes('[GET_REMINDERS:')) {
          try {
            const match = aiResponse.match(/\[GET_REMINDERS:\s*({.*?})\s*\]/);
            if (match) {
              const getData = JSON.parse(match[1]);
              const targetDateStr = getData.date; 
              
              const startOfDay = new Date(`${targetDateStr}T00:00:00.000+07:00`);
              const endOfDay = new Date(`${targetDateStr}T23:59:59.999+07:00`);
              
              const listReminders = await Reminder.find({
                userId: message.author.id,
                targetTime: { $gte: startOfDay, $lte: endOfDay }
              }).sort({ targetTime: 1 });

              aiResponse = aiResponse.replace(/\[GET_REMINDERS:\s*{.*?}\s*\]/, '').trim();

              if (listReminders.length === 0) {
                aiResponse += `\n Không có lịch hẹn nào trong ngày **${targetDateStr}**!`;
              } else {
                aiResponse += `\n\n **Danh sách lịch hẹn ngày ${targetDateStr}:**`;
                listReminders.forEach((item, index) => {
                  const timeStr = item.targetTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
                  const status = item.isSent ? " (Đã nhắc)" : " (Chờ nhắc)";
                  aiResponse += `\n${index + 1}. **[${timeStr}]**: ${item.content} ${status}`;
                });
              }
            }
          } catch (err) {
            console.error('Lỗi bóc tách GET_REMINDERS:', err);
          }
        }

        // --------------------------------------------------------
        //  CHỨC NĂNG 2: XÓA LỊCH HẸN
        // --------------------------------------------------------
        if (aiResponse.includes('[DELETE_REMINDER:')) {
          try {
            const match = aiResponse.match(/\[DELETE_REMINDER:\s*({.*?})\s*\]/);
            if (match) {
              const deleteData = JSON.parse(match[1]);
              const keyword = deleteData.keyword;

              const deletedResult = await Reminder.deleteMany({
                userId: message.author.id,
                isSent: false,
                content: { $regex: keyword, $options: 'i' }
              });

              aiResponse = aiResponse.replace(/\[DELETE_REMINDER:\s*{.*?}\s*\]/, '').trim();

              if (deletedResult.deletedCount > 0) {
                aiResponse += `\n\n Đã xóa **${deletedResult.deletedCount}** lịch hẹn có từ khóa "*${keyword}*".`;
              } else {
                aiResponse += `\n\n Không tìm thấy lịch hẹn chưa phát nào có từ khóa "*${keyword}*".`;
              }
            }
          } catch (err) {
            console.error('Lỗi bóc tách DELETE_REMINDER:', err);
          }
        }

        // --------------------------------------------------------
        //  CHỨC NĂNG 4: THÊM / XEM / XÓA TODO LIST
        // --------------------------------------------------------
        if (aiResponse.includes('[TODO_ADD:')) {
          try {
            const match = aiResponse.match(/\[TODO_ADD:\s*({.*?})\s*\]/);
            if (match) {
              const todoData = JSON.parse(match[1]);
              await Todo.create({ userId: message.author.id, content: todoData.content });
              aiResponse = aiResponse.replace(/\[TODO_ADD:\s*{.*?}\s*\]/, '').trim();
              aiResponse += `\n\n Đã thêm vào danh sách ghi chú: **"${todoData.content}"**`;
            }
          } catch (err) { console.error('Lỗi TODO_ADD:', err); }
        }

        if (aiResponse.includes('[TODO_GET:')) {
          try {
            const todos = await Todo.find({ userId: message.author.id }).sort({ createdAt: -1 });
            aiResponse = aiResponse.replace(/\[TODO_GET:\s*{.*?}\s*\]/, '').trim();

            if (todos.length === 0) {
              aiResponse += `\n\n Danh sách ghi chú/việc cần làm của bạn đang trống!`;
            } else {
              aiResponse += `\n\n **Danh sách ghi chú / việc cần làm:**`;
              todos.forEach((item, index) => {
                aiResponse += `\n${index + 1}. ${item.content}`;
              });
            }
          } catch (err) { console.error('Lỗi TODO_GET:', err); }
        }

        if (aiResponse.includes('[TODO_DELETE:')) {
          try {
            const match = aiResponse.match(/\[TODO_DELETE:\s*({.*?})\s*\]/);
            if (match) {
              const deleteData = JSON.parse(match[1]);
              const keyword = deleteData.keyword;

              if (keyword === 'all') {
                await Todo.deleteMany({ userId: message.author.id });
                aiResponse += `\n\n Đã dọn dẹp sạch sẽ toàn bộ danh sách ghi chú của bạn!`;
              } else {
                const deleted = await Todo.deleteMany({
                  userId: message.author.id,
                  content: { $regex: keyword, $options: 'i' }
                });
                aiResponse += `\n\n Đã xóa **${deleted.deletedCount}** ghi chú liên quan tới "*${keyword}*".`;
              }
              aiResponse = aiResponse.replace(/\[TODO_DELETE:\s*{.*?}\s*\]/, '').trim();
            }
          } catch (err) { console.error('Lỗi TODO_DELETE:', err); }
        }

        // --------------------------------------------------------
        // LƯU KÝ ỨC MỚI VÀ GỬI TIN NHẮN CHIA NHỎ DISCORD
        // --------------------------------------------------------
        userMemory.conversations.push({ user: cleanPrompt || '[Đính kèm tệp/ảnh]', ai: aiResponse });
        if (userMemory.conversations.length > 20) {
          userMemory.conversations.shift();
        }
        await userMemory.save();

        // Tự động phân đoạn tin nhắn gửi qua Discord bằng splitMessage
        const responseChunks = splitMessage(aiResponse);
        await message.reply(responseChunks[0]);
        
        // Đã fix Type Error ở đoạn cuối cùng này
        if ('send' in message.channel) {
          for (let i = 1; i < responseChunks.length; i++) {
            await message.channel.send(responseChunks[i]);
          }
        }

      } else {
        await message.reply('Bộ não Gemini hiện tại không phản hồi dữ liệu. Bạn thử lại xem!');
      }

    } catch (finalError) {
      console.error('Lỗi hệ thống:', finalError);
      await message.reply('Hệ thống xử lý đám mây của mình đang gặp sự cố nhỏ!');
    }
  }
});

client.login(config.discordToken);
