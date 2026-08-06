import mongoose from 'mongoose';

const TodoSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Todo = mongoose.model('Todo', TodoSchema);