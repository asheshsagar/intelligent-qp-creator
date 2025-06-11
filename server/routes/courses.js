
const express = require('express');
const { check, validationResult } = require('express-validator');
const Course = require('../models/Course');
const auth = require('../middlewares/auth');

const router = express.Router();

// @route   GET /api/courses
// @desc    Get all courses
// @access  Private
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find().sort({ name: 1 });
    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/courses/:id
// @desc    Get course by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    res.json(course);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/courses
// @desc    Create a new course
// @access  Private (Admin only)
router.post(
  '/',
  [
    auth,
    check('name', 'Name is required').not().isEmpty(),
    check('code', 'Course code is required').not().isEmpty(),
    check('department', 'Department is required').not().isEmpty(),
    check('credits', 'Credits must be a number').optional().isNumeric()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if the course already exists
      let existingCourse = await Course.findOne({ code: req.body.code });
      if (existingCourse) {
        return res.status(400).json({ message: 'Course with this code already exists' });
      }

      const { name, code, department, credits, description } = req.body;

      const course = new Course({
        name,
        code,
        department,
        credits: credits || 3,
        description: description || ''
      });

      await course.save();
      res.status(201).json(course);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/courses/:id
// @desc    Update a course
// @access  Private (Admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, department, credits, description } = req.body;
    
    // Build course object
    const courseFields = {};
    if (name) courseFields.name = name;
    if (department) courseFields.department = department;
    if (credits) courseFields.credits = credits;
    if (description) courseFields.description = description;
    
    let course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Update and return the course
    course = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: courseFields },
      { new: true }
    );
    
    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/courses/:id
// @desc    Delete a course
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    await Course.findByIdAndRemove(req.params.id);
    
    res.json({ message: 'Course removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
