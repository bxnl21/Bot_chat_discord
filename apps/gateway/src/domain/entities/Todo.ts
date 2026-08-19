export class Todo {
  constructor(
    readonly id: string | undefined,
    readonly userId: string,
    readonly content: string,
    readonly createdAt = new Date(),
  ) {
    if (!content.trim()) throw new Error('Nội dung công việc không được để trống');
  }
}
