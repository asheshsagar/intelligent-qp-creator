// server/routes/fileUpload.js - UPDATED VERSION with latest data handling

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ProcessedData = require('../models/ProcessedData');
const auth = require('../middlewares/auth');
const axios = require('axios');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// @route   POST /api/upload/process-documents
// @desc    Upload question bank and syllabus PDFs and process them
// @access  Private
router.post('/process-documents', auth, upload.fields([
  { name: 'questionBank', maxCount: 1 },
  { name: 'syllabus', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('📥 Upload request received');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('User:', req.educator);
    
    const { courseId } = req.body;
    
    if (!courseId) {
      console.log('❌ Missing courseId');
      return res.status(400).json({ message: 'Course ID is required' });
    }
    
    if (!req.files || !req.files.questionBank || !req.files.syllabus) {
      console.log('❌ Missing files');
      console.log('Files received:', req.files);
      return res.status(400).json({ message: 'Both question bank and syllabus PDFs are required' });
    }
    
    const questionBankFile = req.files.questionBank[0];
    const syllabusFile = req.files.syllabus[0];
    
    console.log('✅ Files received:');
    console.log('Question Bank:', questionBankFile.filename);
    console.log('Syllabus:', syllabusFile.filename);
    
    // Create processed data record with original file names
    const processedData = new ProcessedData({
      educator: req.educator._id,
      course: courseId,
      questionBankFile: questionBankFile.filename,
      syllabusFile: syllabusFile.filename,
      originalFileNames: {
        questionBank: questionBankFile.originalname,
        syllabus: syllabusFile.originalname
      },
      questions: [],
      topics: [],
      processingStatus: 'PENDING',
      uploadedAt: new Date() // Explicitly set upload time
    });
    
    await processedData.save();
    console.log('✅ ProcessedData record created:', processedData._id);
    
    // Trigger Google Colab processing (async)
    triggerColabProcessing(processedData._id, questionBankFile.path, syllabusFile.path);
    
    res.status(200).json({ 
      message: 'Files uploaded successfully. Processing started.',
      processId: processedData._id,
      status: 'PENDING'
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ message: 'File upload failed', error: error.message });
  }
});

// Function to trigger Google Colab processing
async function triggerColabProcessing(processId, questionBankPath, syllabusPath) {
  try {
    console.log('🔄 Starting Colab processing for:', processId);
    
    // Update status to processing
    await ProcessedData.findByIdAndUpdate(processId, { 
      processingStatus: 'PROCESSING' 
    });
    
    const colabWebhookUrl = process.env.COLAB_WEBHOOK_URL;
    if (!colabWebhookUrl) {
      console.error('❌ COLAB_WEBHOOK_URL not configured in environment variables');
      await ProcessedData.findByIdAndUpdate(processId, { 
        processingStatus: 'FAILED' 
      });
      return;
    }
    
    // Convert file paths to base64
    const questionBankBase64 = fs.readFileSync(questionBankPath, { encoding: 'base64' });
    const syllabusBase64 = fs.readFileSync(syllabusPath, { encoding: 'base64' });
    
    const payload = {
      processId: processId,
      questionBank: questionBankBase64,
      syllabus: syllabusBase64,
      callbackUrl: `${process.env.BASE_URL}/api/upload/processing-complete`
    };
    
    console.log('📤 Sending to Colab:', colabWebhookUrl);
    
    // Send to Google Colab
    await axios.post(colabWebhookUrl, payload, {
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.COLAB_API_KEY}`
      }
    });
    
    console.log(`✅ Processing triggered successfully for process ID: ${processId}`);
    
  } catch (error) {
    console.error('❌ Colab processing trigger failed:', error);
    
    // Update status to failed
    await ProcessedData.findByIdAndUpdate(processId, { 
      processingStatus: 'FAILED' 
    });
  }
}

// @route   POST /api/upload/processing-complete
// @desc    Callback endpoint for Google Colab to send processed data
// @access  Public (but should be secured with API key)
router.post('/processing-complete', async (req, res) => {
  try {
    console.log('📥 Processing complete callback received');
    
    const { processId, questions, topics, status } = req.body;
    
    // Verify API key (optional security measure)
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.COLAB_API_KEY) {
      console.log('❌ Unauthorized callback attempt');
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    if (status === 'success') {
      // Update with processed data
      await ProcessedData.findByIdAndUpdate(processId, {
        questions: questions,
        topics: topics,
        processingStatus: 'COMPLETED',
        processedAt: new Date()
      });
      
      console.log(`✅ Processing completed for process ID: ${processId}`);
      console.log(`📊 Questions: ${questions.length}, Topics: ${topics.length}`);
    } else {
      // Mark as failed
      await ProcessedData.findByIdAndUpdate(processId, {
        processingStatus: 'FAILED'
      });
      
      console.log(`❌ Processing failed for process ID: ${processId}`);
    }
    
    res.status(200).json({ message: 'Status updated successfully' });
    
  } catch (error) {
    console.error('❌ Processing complete callback error:', error);
    res.status(500).json({ message: 'Failed to update processing status' });
  }
});

// @route   GET /api/upload/processing-status/:processId
// @desc    Check processing status
// @access  Private
router.get('/processing-status/:processId', auth, async (req, res) => {
  try {
    const processedData = await ProcessedData.findById(req.params.processId)
      .populate('course', 'name code');
    
    if (!processedData) {
      return res.status(404).json({ message: 'Process not found' });
    }
    
    // Check if educator owns this process
    if (processedData.educator.toString() !== req.educator._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    res.json({
      processId: processedData._id,
      status: processedData.processingStatus,
      course: processedData.course,
      questionsCount: processedData.questions.length,
      topicsCount: processedData.topics.length,
      processedAt: processedData.processedAt,
      createdAt: processedData.createdAt,
      uploadedAt: processedData.uploadedAt,
      version: processedData.version,
      isActive: processedData.isActive,
      originalFileNames: processedData.originalFileNames
    });
    
  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({ message: 'Failed to check status' });
  }
});

// @route   GET /api/upload/processed-data/:courseId
// @desc    Get LATEST processed data for a course (fixes the syllabus issue)
// @access  Private
router.get('/processed-data/:courseId', auth, async (req, res) => {
  try {
    // Get the LATEST active processed data for this course
    const processedData = await ProcessedData.findOne({
      educator: req.educator._id,
      course: req.params.courseId,
      processingStatus: 'COMPLETED',
      isActive: true // Only get active (latest) version
    })
    .populate('course', 'name code')
    .sort({ uploadedAt: -1 }); // Sort by upload time, latest first
    
    if (!processedData) {
      return res.status(404).json({ message: 'No processed data found for this course' });
    }
    
    console.log(`✅ Returning LATEST processed data for course ${req.params.courseId}:`);
    console.log(`   - Version: ${processedData.version}`);
    console.log(`   - Uploaded: ${processedData.uploadedAt}`);
    console.log(`   - Questions: ${processedData.questions.length}`);
    console.log(`   - Topics: ${processedData.topics.length}`);
    
    res.json(processedData);
    
  } catch (error) {
    console.error('❌ Get processed data error:', error);
    res.status(500).json({ message: 'Failed to get processed data' });
  }
});

// @route   GET /api/upload/my-uploads
// @desc    Get all uploads for current educator (sorted by latest first)
// @access  Private
router.get('/my-uploads', auth, async (req, res) => {
  try {
    const uploads = await ProcessedData.find({ educator: req.educator._id })
      .populate('course', 'name code')
      .sort({ uploadedAt: -1 }); // Sort by upload time, latest first
    
    res.json(uploads);
    
  } catch (error) {
    console.error('❌ Get uploads error:', error);
    res.status(500).json({ message: 'Failed to get uploads' });
  }
});

// @route   GET /api/upload/course-history/:courseId
// @desc    Get upload history for a specific course
// @access  Private
router.get('/course-history/:courseId', auth, async (req, res) => {
  try {
    const uploads = await ProcessedData.find({
      educator: req.educator._id,
      course: req.params.courseId
    })
      .populate('course', 'name code')
      .sort({ uploadedAt: -1 });
    
    res.json(uploads);
    
  } catch (error) {
    console.error('❌ Get course history error:', error);
    res.status(500).json({ message: 'Failed to get course history' });
  }
});

// Temporary test route for debugging
router.get('/test', auth, (req, res) => {
  res.json({ 
    message: 'Upload route is working',
    user: req.educator.name,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;