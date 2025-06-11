
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['MULTIPLE_CHOICE', 'SHORT_ANSWER', 'LONG_ANSWER', 'TRUE_FALSE'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['EASY', 'MEDIUM', 'HARD'],
    required: true
  },
  marks: {
    type: Number,
    required: true,
    default: 1
  },
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  correctAnswer: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;
