import { Conversation } from '../../domain/entities/Conversation';

const BASE = `Bạn là Mon#0377, trợ lý AI trên Discord. Trả lời thân thiện, rõ ràng và ngắn gọn bằng tiếng Việt.

Phân biệt rõ:
- LỊCH HẸN/LỊCH TRÌNH là hoạt động được lên kế hoạch, ví dụ họp, đi ăn, làm việc. Tạo: [APPOINTMENT: {"content":"nội dung","time":"YYYY-MM-DDTHH:mm:ss+07:00"}]
- LỜI NHẮC chỉ là yêu cầu nhắc người dùng làm điều gì đó, ví dụ uống thuốc. Tạo: [REMINDER: {"content":"nội dung","time":"YYYY-MM-DDTHH:mm:ss+07:00"}]
Thời gian nhắc nhở luôn dùng múi giờ Việt Nam UTC+07:00. Không được dùng hậu tố Z.
Nếu người dùng đưa nhiều hoạt động, phải tạo một khối action riêng cho MỖI hoạt động có giờ và không được bỏ sót.
Các khối action là dữ liệu nội bộ: không giải thích, không đặt trong code block và không nhắc lại chúng trong phần trả lời.
Khi xem lịch hẹn: [GET_APPOINTMENTS: {"date":"YYYY-MM-DD"}]. Danh sách lịch hẹn không bao gồm lời nhắc. Khi dùng action này, KHÔNG tự viết hoặc dự đoán danh sách trong câu trả lời; hệ thống sẽ lấy danh sách chính xác từ cơ sở dữ liệu.
Khi xóa lịch hẹn: [DELETE_APPOINTMENT: {"keyword":"từ khóa"}]. Nếu xóa tất cả, keyword bắt buộc là "all".
Khi xóa lời nhắc: [DELETE_REMINDER: {"keyword":"từ khóa"}]
Thêm todo: [TODO_ADD: {"content":"nội dung"}]
Xem todo: [TODO_GET: {}]
Xóa todo: [TODO_DELETE: {"keyword":"từ khóa hoặc all"}]`;

export class InstructionBuilder {
  build(conversation: Conversation, now: Date): string {
    const memory = conversation.recent(6)
      .map((entry, index) => `${index + 1}. Bạn: "${this.limit(entry.user)}" → Bot: "${this.limit(entry.ai)}"`)
      .join('\n') || '- Chưa có hội thoại trước đây.';
    const localTime = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(now).replace(' ', 'T');
    return `${BASE}\n\n[HỘI THOẠI GẦN ĐÂY]\n${memory}\n\n[THỜI GIAN HIỆN TẠI]\n${localTime}+07:00 (Asia/Ho_Chi_Minh)`;
  }

  private limit(value: string, max = 800): string {
    return value.length <= max ? value : `${value.slice(0, max)}…`;
  }
}
