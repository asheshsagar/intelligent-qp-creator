
const express = require('express');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Educator = require('../models/Educator');
const Course = require('../models/Course');
const auth = require('../middlewares/auth');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new educator
// @access  Public
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    check('department', 'Department is required').not().isEmpty(),
    check('semester', 'Semester is required').not().isEmpty(),
    check('courses', 'Courses must be an array').isArray()
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, department, semester, courses } = req.body;

    try {
      // Check if educator already exists
      let educator = await Educator.findOne({ email });
      if (educator) {
        return res.status(400).json({ message: 'Educator already exists' });
      }

      // Find course ids
      const courseIds = await Course.find({ code: { $in: courses } }).select('_id');
      
      // Create new educator
      educator = new Educator({
        name,
        email,
        password,
        department,
        semester,
        courses: courseIds
      });

      // Save educator
      await educator.save();

      res.status(201).json({ message: 'Educator registered successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login educator & get token
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Check if educator exists
      const educator = await Educator.findOne({ email });
      if (!educator) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await educator.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Create and sign token
      const payload = {
        id: educator.id
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '7d' },
        (err, token) => {
          if (err) throw err;
          
          // Return user info without password
          const userToReturn = {
            id: educator._id,
            name: educator.name,
            email: educator.email,
            department: educator.department,
            semester: educator.semester,
            role: educator.role,
            courses: educator.courses
          };
          
          res.json({ token, user: userToReturn });
        }
      );
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current educator
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    // Get educator with courses populated
    const educator = await Educator.findById(req.educator._id)
      .select('-password')
      .populate('courses', 'name code');
    
    res.json(educator);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update educator profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, department, semester, profilePicture } = req.body;
    
    // Find educator by id
    const educator = await Educator.findById(req.educator._id);
    
    // Update fields
    if (name) educator.name = name;
    if (department) educator.department = department;
    if (semester) educator.semester = semester;
    if (profilePicture) educator.profilePicture = profilePicture;
    
    await educator.save();
    
    res.json(educator);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/password
// @desc    Change password
// @access  Private
router.put(
  '/password',
  [
    auth,
    check('currentPassword', 'Current password is required').exists(),
    check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Get educator with password
      const educator = await Educator.findById(req.educator._id);
      
      // Check current password
      const isMatch = await educator.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      
      // Update password
      educator.password = newPassword;
      await educator.save();
      
      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/auth/forgot-password
// @desc    Forgot password - generate token
// @access  Public
router.post(
  '/forgot-password',
  [
    check('email', 'Please include a valid email').isEmail()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { email } = req.body;
      
      // Find educator by email
      const educator = await Educator.findOne({ email });
      if (!educator) {
        // Don't reveal that the email doesn't exist for security
        return res.status(200).json({ message: 'If a user with that email exists, a password reset link was sent' });
      }
      
      // Generate reset token
      const resetToken = educator.getResetPasswordToken();
      await educator.save();
      
      // In a real application, send email with reset link
      // For this example, just return the token
      if (process.env.NODE_ENV === 'development') {
        return res.json({ 
          message: 'Password reset token generated', 
          token: resetToken,
          // This would be the reset URL in a real application
          resetUrl: `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`
        });
      }
      
      res.status(200).json({ message: 'If a user with that email exists, a password reset link was sent' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password using token
// @access  Public
router.post(
  '/reset-password/:token',
  [
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      // Get hashed token
      const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');
      
      // Find educator by token and check if token has expired
      const educator = await Educator.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
      });
      
      if (!educator) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }
      
      // Set new password
      educator.password = req.body.password;
      educator.resetPasswordToken = undefined;
      educator.resetPasswordExpire = undefined;
      
      await educator.save();
      
      res.json({ message: 'Password reset successful' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/auth/courses
// @desc    Update educator courses
// @access  Private
router.put('/courses', auth, async (req, res) => {
  try {
    const { courses } = req.body;
    
    if (!courses || !Array.isArray(courses)) {
      return res.status(400).json({ message: 'Courses must be an array' });
    }
    
    // Find course ids
    const courseIds = await Course.find({ code: { $in: courses } }).select('_id');
    
    // Update educator courses
    const educator = await Educator.findByIdAndUpdate(
      req.educator._id,
      { courses: courseIds },
      { new: true }
    ).populate('courses', 'name code');
    
    res.json(educator);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
