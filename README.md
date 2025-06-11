
# Exam-Scribe AI

An AI-powered application for educators to create and manage exam questions.

## Project Structure

This is a MERN (MongoDB, Express, React, Node.js) application with:

- **Frontend**: React with TypeScript, Vite, Tailwind CSS, and Shadcn UI
- **Backend**: Node.js with Express and MongoDB

## Setup Instructions

### Frontend

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

3. Start the development server:
   ```
   npm run dev
   ```

### Backend

1. Navigate to the server directory:
   ```
   cd server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/exam-scribe-ai
   JWT_SECRET=your_jwt_secret_key
   ```

4. Initialize the database with default courses:
   ```
   node scripts/initDb.js
   ```

5. Start the server:
   ```
   npm run dev
   ```

## Features

- User authentication (register, login, profile management)
- Course management
- Exam setup (CIE and Semester exams)
- Question generation with AI

## Available Scripts

### Frontend
- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

### Backend
- `npm run dev` - Start the development server with nodemon
- `npm start` - Start the production server
