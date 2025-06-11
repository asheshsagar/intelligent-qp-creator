require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Course = require('../models/Course');

const courses = [
  {
    name: 'Data Structures and Algorithms',
    code: 'CI201',
    department: 'Computer Science',
    credits: 4,
    description: 'Fundamentals of data structures and algorithms design and analysis.'
  },
  {
    name: 'Database Management Systems',
    code: 'CI301',
    department: 'Computer Science',
    credits: 3,
    description: 'Introduction to database concepts, design, and implementation.'
  },
  {
    name: 'Artificial Intelligence',
    code: 'CI401',
    department: 'Computer Science',
    credits: 4,
    description: 'Foundations of AI including search, knowledge representation, and machine learning.'
  },
  {
    name: 'Operating System',
    code: 'CI402',
    department: 'Computer Science',
    credits: 4,
    description: 'Process management, memory, scheduling, and file systems.'
  },
  {
    name: 'Advanced Computer Networks',
    code: 'CI501',
    department: 'Computer Science',
    credits: 4,
    description: 'Advanced routing, switching, and network protocols.'
  },
  {
    name: 'Linear Algebra',
    code: 'MATH201',
    department: 'Mathematics',
    credits: 3,
    description: 'Vector spaces, linear transformations, matrices, and determinants.'
  },
  {
    name: 'Digital Electronics',
    code: 'ECE201',
    department: 'Electronics',
    credits: 4,
    description: 'Introduction to digital systems, combinational and sequential circuits.'
  }
];

mongoose
  .connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("✅ MongoDB Connected");
    await Course.deleteMany(); // Remove old data
    await Course.insertMany(courses); // Add new data
    console.log("✅ Courses Seeded Successfully");
    mongoose.connection.close();
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    mongoose.connection.close();
  });
