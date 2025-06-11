// server/models/QuestionPaper.js - New model for storing generated question papers

const mongoose = require('mongoose');

const questionPaperSchema = new mongoose.Schema({
  educator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Educator',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  examType: {
    type: String,
    required: true,
    enum: ['CIE', 'SEE']
  },
  semester: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String, // The formatted question paper text
    required: true
  },
  questions: [{
    questionId: String,
    text: String,
    marks: Number,
    difficulty: String,
    bloomLevel: String,
    unit: String,
    topic: String,
    co: Number,
    source: {
      type: String,
      enum: ['processed_data', 'ai_generated']
    },
    originalId: String,
    similarity: Number
  }],
  totalMarks: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  generationSource: {
    type: String,
    enum: ['processed_data', 'ai_generated', 'hybrid'],
    required: true
  },
  processedDataUsed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProcessedData'
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  lastDownloadedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
questionPaperSchema.index({ educator: 1, createdAt: -1 });
questionPaperSchema.index({ course: 1, examType: 1 });

const QuestionPaper = mongoose.model('QuestionPaper', questionPaperSchema);

module.exports = QuestionPaper;