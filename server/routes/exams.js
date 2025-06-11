
const express = require('express');
const { check, validationResult } = require('express-validator');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const auth = require('../middlewares/auth');

const router = express.Router();

// @route   POST /api/exams
// @desc    Create a new exam
// @access  Private
router.post(
  '/',
  [
    auth,
    check('examType', 'Exam type is required').not().isEmpty(),
    check('semester', 'Semester is required').not().isEmpty(),
    check('courseId', 'Course ID is required').not().isEmpty()
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { examType, semester, courseId, title, duration, instructions, examDate } = req.body;

    try {
      // Create new exam
      const exam = new Exam({
        educator: req.educator._id,
        examType,
        semester,
        course: courseId,
        title: title || `${examType} - ${semester}`,
        duration: duration || 60,
        instructions: instructions || 'Answer all questions. Each question carries marks as indicated.',
        examDate: examDate || null
      });

      // Save exam
      await exam.save();

      res.status(201).json(exam);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/exams
// @desc    Get all exams for current educator
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const exams = await Exam.find({ educator: req.educator._id })
      .populate('course', 'name code')
      .sort({ createdAt: -1 });
    
    res.json(exams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/exams/:id
// @desc    Get exam by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('course', 'name code')
      .populate('educator', 'name email');
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    // Check if educator owns the exam
    if (exam.educator._id.toString() !== req.educator._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to access this exam' });
    }
    
    // Get questions for this exam
    const questions = await Question.find({ exam: exam._id }).sort({ createdAt: 1 });
    
    // Calculate total marks
    const totalMarks = questions.reduce((sum, question) => sum + question.marks, 0);
    
    // Update exam with total marks if necessary
    if (totalMarks !== exam.totalMarks) {
      exam.totalMarks = totalMarks;
      await exam.save();
    }
    
    res.json({
      exam,
      questions,
      totalMarks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/exams/:id
// @desc    Update exam
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    // Check if educator owns the exam
    if (exam.educator.toString() !== req.educator._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to update this exam' });
    }
    
    const { title, duration, instructions, status, examDate } = req.body;
    
    // Update fields
    if (title) exam.title = title;
    if (duration) exam.duration = duration;
    if (instructions) exam.instructions = instructions;
    if (status) exam.status = status;
    if (examDate) exam.examDate = examDate;
    
    await exam.save();
    
    res.json(exam);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/exams/:id
// @desc    Delete exam and its questions
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    // Check if educator owns the exam
    if (exam.educator.toString() !== req.educator._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to delete this exam' });
    }
    
    // Delete all questions associated with this exam
    await Question.deleteMany({ exam: req.params.id });
    
    // Delete the exam
    await Exam.findByIdAndRemove(req.params.id);
    
    res.json({ message: 'Exam and its questions deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/exams/:id/status
// @desc    Update exam status
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['DRAFT', 'FINALIZED', 'PUBLISHED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    // Check if educator owns the exam
    if (exam.educator.toString() !== req.educator._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to update this exam' });
    }
    
    // Update status
    exam.status = status;
    await exam.save();
    
    res.json(exam);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/exams/course/:courseId
// @desc    Get all exams for a specific course
// @access  Private
router.get('/course/:courseId', auth, async (req, res) => {
  try {
    const exams = await Exam.find({ 
      educator: req.educator._id,
      course: req.params.courseId
    })
    .populate('course', 'name code')
    .sort({ createdAt: -1 });
    
    res.json(exams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/exams/type/:examType
// @desc    Get all exams of a specific type
// @access  Private
router.get('/type/:examType', auth, async (req, res) => {
  try {
    const exams = await Exam.find({ 
      educator: req.educator._id,
      examType: req.params.examType
    })
    .populate('course', 'name code')
    .sort({ createdAt: -1 });
    
    res.json(exams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
