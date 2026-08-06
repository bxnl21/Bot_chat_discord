import schedule from 'node-schedule';
import { Reminder } from '../models/Reminder';
import { Client, TextChannel } from 'discord.js';

export function startReminderScheduler(client: Client) {
  // Cấu hình chạy ngầm: Cứ vào giây thứ 0 của mỗi phút (Ví dụ 12:01:00, 12:02:00) sẽ chạy hàm bên dưới
  schedule.scheduleJob('0 * * * * *', async () => {
    try {
      const now = new Date();
      
      // Tìm các nhắc nhở có thời gian nhỏ hơn hoặc bằng hiện tại và chưa được gửi
      const activeReminders = await Reminder.find({
        targetTime: { $lte: now },
        isSent: false
      });

      for (const reminder of activeReminders) {
        // Lấy kênh chat Discord nơi người dùng tạo nhắc nhở
        const channel = await client.channels.fetch(reminder.channelId) as TextChannel;
        
        if (channel) {
          // Gửi tin nhắn tag tên người dùng để nhắc nhở
          await channel.send(` <@${reminder.userId}> ơi! Đến giờ rồi: **${reminder.content}**`);
        }

        // Đánh dấu nhắc nhở này đã gửi xong để không bị nhắc lại
        reminder.isSent = true;
        await reminder.save();
      }
    } catch (error) {
      console.error("Lỗi khi quét lịch nhắc nhở:", error);
    }
  });
  
  console.log(" Hệ thống nhắc nhở thời gian thực đã được kích hoạt ngầm!");
}