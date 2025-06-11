
# Exam-Scribe AI Backend

This is the Express/MongoDB backend for the Exam-Scribe AI application.

## Setup Instructions

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/exam-scribe-ai
   JWT_SECRET=your_jwt_secret_key
   ```

3. Start the server:
   ```
   npm start
   ```

## API Endpoints

### Authentication
- POST /api/auth/register - Register a new educator
- POST /api/auth/login - Login an educator
- GET /api/auth/me - Get current educator information

### Courses
- GET /api/courses - Get all courses

### Exams
- POST /api/exams - Create a new exam
- GET /api/exams - Get all exams for the current educator

## Project Structure

```
server/
├── config/         # Configuration files
├── controllers/    # Route controllers
├── middlewares/    # Custom middlewares
├── models/         # Mongoose models
├── routes/         # Express routes
├── utils/          # Utility functions
├── .env            # Environment variables
├── server.js       # Entry point
└── package.json    # Dependencies
```
