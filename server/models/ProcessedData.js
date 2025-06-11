// server/models/ProcessedData.js - UPDATED VERSION with upload timestamp tracking

const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question_id: { type: Number, required: true },
  question: { type: String, required: true },
  predicted_marks: { type: Number, required: true },
  bloom_level: { type: String, required: true },
  difficulty: { type: String, required: true },
  matched_topic: { type: String, required: true },
  matched_unit: { type: String, required: true },
  topic_similarity: { type: Number, required: true }
});

const topicSchema = new mongoose.Schema({
  unit: { type: String, required: true },
  topic_id: { type: Number, required: true },
  topic: { type: String, required: true }
});

const processedDataSchema = new mongoose.Schema({
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
  questionBankFile: { type: String, required: true },
  syllabusFile: { type: String, required: true },
  originalFileNames: {
    questionBank: { type: String, required: true },
    syllabus: { type: String, required: true }
  },
  questions: [questionSchema],
  topics: [topicSchema],
  processingStatus: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'PENDING'
  },
  // Track when processing was completed
  processedAt: { type: Date },
  // Track when this data was uploaded (for sorting latest first)
  uploadedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  
  // Mark if this is the active/latest version for this course
  isActive: { type: Boolean, default: true },
  
  // Version tracking
  version: { type: Number, default: 1 }
});

// Index for efficient queries - get latest processed data first
processedDataSchema.index({ educator: 1, course: 1, uploadedAt: -1 });
processedDataSchema.index({ educator: 1, course: 1, isActive: 1 });

// Pre-save middleware to handle versioning and active status
processedDataSchema.pre('save', async function(next) {
  if (this.isNew) {
    // When creating new processed data, mark previous versions as inactive
    await this.constructor.updateMany(
      { 
        educator: this.educator, 
        course: this.course, 
        _id: { $ne: this._id } 
      },
      { 
        $set: { isActive: false } 
      }
    );
    
    // Set version number
    const latestVersion = await this.constructor.findOne(
      { educator: this.educator, course: this.course },
      {},
      { sort: { version: -1 } }
    );
    
    this.version = latestVersion ? latestVersion.version + 1 : 1;
  }
  next();
});

const ProcessedData = mongoose.model('ProcessedData', processedDataSchema);

module.exports = ProcessedData;