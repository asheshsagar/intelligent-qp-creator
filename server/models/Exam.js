
const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  educator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Educator',
    required: true
  },
  title: {
    type: String,
    required: true,
    default: function() {
      return `${this.examType} - ${this.semester}`;
    }
  },
  examType: {
    type: String,
    required: true,
    enum: ['CIE1', 'CIE2', 'SEMESTER_END']
  },
  semester: {
    type: String,
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  totalMarks: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number, // in minutes
    default: 60
  },
  instructions: {
    type: String,
    default: 'Answer all questions. Each question carries marks as indicated.'
  },
  status: {
    type: String,
    enum: ['DRAFT', 'FINALIZED', 'PUBLISHED'],
    default: 'DRAFT'
  },
  examDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam;
