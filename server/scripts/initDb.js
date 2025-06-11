
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');

const defaultCourses = [
  { name: 'Machine Learning', code: 'ML' },
  { name: 'Advanced Computer Networks', code: 'ACN' },
  { name: 'Data Communication Networks', code: 'DCN' },
  { name: 'Deep Learning', code: 'DL' },
  { name: 'Data Structures', code: 'DS' },
  { name: 'Database Management Systems', code: 'DBMS' },
  { name: 'Artificial Intelligence', code: 'AI' },
  { name: 'Operating Systems', code: 'OS' }
];

const initDb = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if courses already exist
    const existingCourses = await Course.countDocuments();
    
    if (existingCourses === 0) {
      // Insert default courses
      await Course.insertMany(defaultCourses);
      console.log('Default courses inserted successfully');
    } else {
      console.log('Courses already exist in the database');
    }

    mongoose.disconnect();
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

initDb();
