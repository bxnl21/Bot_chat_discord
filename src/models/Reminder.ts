import mongoose from 'mongoose';

export interface IReminder extends mongoose.Document {
  userId: string;
  channelId: string; // Kênh để bot gửi tin nhắn nhắc nhở
  content: string;   // Nội dung cần nhắc (Ví dụ: "Học lập trình TypeScript")
  targetTime: Date;  // Thời gian chính xác để nhắc nhở
  isSent: boolean;   // Đã nhắc chưa (để tránh nhắc trùng)
}

const ReminderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  channelId: { type: String, required: true },
  content: { type: String, required: true },
  targetTime: { type: Date, required: true },
  isSent: { type: Boolean, default: false }
});

export const Reminder = mongoose.model<IReminder>('Reminder', ReminderSchema);