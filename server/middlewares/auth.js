
const jwt = require('jsonwebtoken');
const Educator = require('../models/Educator');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find educator by id
    const educator = await Educator.findById(decoded.id).select('-password');
    
    if (!educator) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    
    // Add educator to request object
    req.educator = educator;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;
