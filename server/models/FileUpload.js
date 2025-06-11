// server/models/FileUpload.js
const mongoose = require('mongoose');

const fileUploadSchema = new mongoose.Schema({
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
  questionBankPath: { type: String, required: true },
  syllabusPath: { type: String, required: true },
  originalNames: {
    questionBank: String,
    syllabus: String
  },
  uploadedAt: { type: Date, default: Date.now }
});

const FileUpload = mongoose.model('FileUpload', fileUploadSchema);

module.exports = FileUpload;
