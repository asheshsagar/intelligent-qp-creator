// server/routes/questionPapers.js - Routes for managing generated question papers

const express = require('express');
const QuestionPaper = require('../models/QuestionPaper');
const auth = require('../middlewares/auth');

const router = express.Router();

// @route   POST /api/question-papers
// @desc    Save a generated question paper
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      courseId,
      examType,
      semester,
      title,
      content,
      questions,
      totalMarks,
      totalQuestions,
      generationSource,
      processedDataUsed
    } = req.body;

    const questionPaper = new QuestionPaper({
      educator: req.educator._id,
      course: courseId,
      examType,
      semester,
      title,
      content,
      questions,
      totalMarks,
      totalQuestions,
      generationSource,
      processedDataUsed
    });

    await questionPaper.save();

    // Populate course information
    await questionPaper.populate('course', 'name code');

    res.status(201).json({
      message: 'Question paper saved successfully',
      questionPaper
    });

  } catch (error) {
    console.error('Error saving question paper:', error);
    res.status(500).json({ 
      message: 'Failed to save question paper',
      error: error.message 
    });
  }
});

// @route   GET /api/question-papers
// @desc    Get all question papers for current educator
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const questionPapers = await QuestionPaper.find({ educator: req.educator._id })
      .populate('course', 'name code')
      .sort({ createdAt: -1 })
      .limit(20); // Limit to latest 20

    res.json(questionPapers);

  } catch (error) {
    console.error('Error fetching question papers:', error);
    res.status(500).json({ 
      message: 'Failed to fetch question papers',
      error: error.message 
    });
  }
});

// @route   GET /api/question-papers/:id
// @desc    Get a specific question paper
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const questionPaper = await QuestionPaper.findOne({
      _id: req.params.id,
      educator: req.educator._id
    }).populate('course', 'name code');

    if (!questionPaper) {
      return res.status(404).json({ message: 'Question paper not found' });
    }

    res.json(questionPaper);

  } catch (error) {
    console.error('Error fetching question paper:', error);
    res.status(500).json({ 
      message: 'Failed to fetch question paper',
      error: error.message 
    });
  }
});

// @route   PUT /api/question-papers/:id/download
// @desc    Track download of question paper
// @access  Private
router.put('/:id/download', auth, async (req, res) => {
  try {
    const questionPaper = await QuestionPaper.findOneAndUpdate(
      {
        _id: req.params.id,
        educator: req.educator._id
      },
      {
        $inc: { downloadCount: 1 },
        $set: { lastDownloadedAt: new Date() }
      },
      { new: true }
    ).populate('course', 'name code');

    if (!questionPaper) {
      return res.status(404).json({ message: 'Question paper not found' });
    }

    res.json({
      message: 'Download tracked successfully',
      questionPaper
    });

  } catch (error) {
    console.error('Error tracking download:', error);
    res.status(500).json({ 
      message: 'Failed to track download',
      error: error.message 
    });
  }
});

// @route   DELETE /api/question-papers/:id
// @desc    Delete a question paper
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const questionPaper = await QuestionPaper.findOneAndDelete({
      _id: req.params.id,
      educator: req.educator._id
    });

    if (!questionPaper) {
      return res.status(404).json({ message: 'Question paper not found' });
    }

    res.json({ message: 'Question paper deleted successfully' });

  } catch (error) {
    console.error('Error deleting question paper:', error);
    res.status(500).json({ 
      message: 'Failed to delete question paper',
      error: error.message 
    });
  }
});

// @route   GET /api/question-papers/course/:courseId
// @desc    Get question papers for a specific course
// @access  Private
router.get('/course/:courseId', auth, async (req, res) => {
  try {
    const questionPapers = await QuestionPaper.find({
      educator: req.educator._id,
      course: req.params.courseId
    })
      .populate('course', 'name code')
      .sort({ createdAt: -1 });

    res.json(questionPapers);

  } catch (error) {
    console.error('Error fetching course question papers:', error);
    res.status(500).json({ 
      message: 'Failed to fetch course question papers',
      error: error.message 
    });
  }
});

// @route   GET /api/question-papers/stats
// @desc    Get question paper statistics for educator
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await QuestionPaper.aggregate([
      { $match: { educator: req.educator._id } },
      {
        $group: {
          _id: null,
          totalPapers: { $sum: 1 },
          totalDownloads: { $sum: '$downloadCount' },
          cieCount: {
            $sum: { $cond: [{ $eq: ['$examType', 'CIE'] }, 1, 0] }
          },
          seeCount: {
            $sum: { $cond: [{ $eq: ['$examType', 'SEE'] }, 1, 0] }
          },
          avgQuestions: { $avg: '$totalQuestions' },
          avgMarks: { $avg: '$totalMarks' }
        }
      }
    ]);

    const result = stats[0] || {
      totalPapers: 0,
      totalDownloads: 0,
      cieCount: 0,
      seeCount: 0,
      avgQuestions: 0,
      avgMarks: 0
    };

    res.json(result);

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      message: 'Failed to fetch statistics',
      error: error.message 
    });
  }
});

module.exports = router;