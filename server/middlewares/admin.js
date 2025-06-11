
const admin = (req, res, next) => {
  // Check if user is authenticated and is an admin
  if (req.educator && req.educator.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};

module.exports = admin;
