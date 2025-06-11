// server/routes/questions.js - Enhanced with your exact processed data structure
const express = require('express');
const { check, validationResult } = require('express-validator');
const Question = require('../models/Question');
const Exam = require('../models/Exam');
const ProcessedData = require('../models/ProcessedData');
const auth = require('../middlewares/auth');

const router = express.Router();

// @route   POST /api/questions/generate
// @desc    Generate questions using processed data or AI
// @access  Private
router.post('/generate', auth, async (req, res) => {
  try {
    const { courseId, examType, questionConfigs, useProcessedData = true } = req.body;
    
    if (!courseId || !examType || !questionConfigs) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }
    
    let generatedQuestions = [];
    let dataSource = 'ai_generated';
    
    if (useProcessedData) {
      // Try to use processed data first
      const processedData = await ProcessedData.findOne({
        educator: req.educator._id,
        course: courseId,
        processingStatus: 'COMPLETED'
      });
      
      if (processedData && processedData.questions.length > 0) {
        console.log(`Found ${processedData.questions.length} processed questions`);
        generatedQuestions = generateFromProcessedData(
          processedData, 
          examType, 
          questionConfigs
        );
        dataSource = 'processed_data';
      } else {
        console.log('No processed data found, using AI generation');
        generatedQuestions = generateWithAI(courseId, examType, questionConfigs);
      }
    } else {
      // Use AI generation directly
      generatedQuestions = generateWithAI(courseId, examType, questionConfigs);
    }
    
    res.json({
      questions: generatedQuestions,
      source: dataSource,
      totalQuestions: generatedQuestions.length
    });
    
  } catch (error) {
    console.error('Question generation error:', error);
    res.status(500).json({ message: 'Failed to generate questions' });
  }
});

// Function to generate questions from your processed data structure
function generateFromProcessedData(processedData, examType, questionConfigs) {
  const { questions, topics } = processedData;
  const generatedQuestions = [];
  
  console.log(`Processing ${questions.length} questions and ${topics.length} topics`);
  
  if (examType === 'CIE') {
    // Generate CIE questions (3 sections)
    const sections = [1, 2, 3];
    
    for (const section of sections) {
      const sectionConfigs = questionConfigs.filter(q => 
        q.questionId.startsWith(section.toString()) &&
        (!q.questionId.endsWith('c') || q.includeC)
      );
      
      for (const config of sectionConfigs) {
        // Find matching questions from processed data using your exact structure
        const matchingQuestions = questions.filter(q => {
          // Match difficulty (your structure: Easy, Medium, Hard)
          const difficultyMatch = q.difficulty && 
            q.difficulty.toLowerCase() === config.level.toLowerCase();
          
          // Match marks (allow ±2 marks difference with your predicted_marks field)
          const marksMatch = q.predicted_marks && 
            Math.abs(q.predicted_marks - config.marks) <= 2;
          
          // Match unit preference
          const unitMatch = q.matched_unit && 
            q.matched_unit.toLowerCase().includes(`unit ${section.toString().toLowerCase()}`);
          
          // Match topic if specified
          const topicMatch = !config.topic || 
            (q.matched_topic && q.matched_topic.toLowerCase().includes(config.topic.toLowerCase()));
          
          return difficultyMatch && marksMatch && (unitMatch || topicMatch);
        });
        
        // Sort by relevance using your similarity score
        matchingQuestions.sort((a, b) => {
          let scoreA = 0, scoreB = 0;
          
          // Higher topic_similarity is better (your field)
          if (a.topic_similarity) scoreA += a.topic_similarity * 100;
          if (b.topic_similarity) scoreB += b.topic_similarity * 100;
          
          // Exact marks match bonus
          if (a.predicted_marks === config.marks) scoreA += 50;
          if (b.predicted_marks === config.marks) scoreB += 50;
          
          // Unit match bonus
          if (a.matched_unit && a.matched_unit.includes(`Unit ${section}`)) scoreA += 25;
          if (b.matched_unit && b.matched_unit.includes(`Unit ${section}`)) scoreB += 25;
          
          return scoreB - scoreA;
        });
        
        if (matchingQuestions.length > 0) {
          // Select the best matching question
          const selectedQuestion = matchingQuestions[0];
          
          generatedQuestions.push({
            questionId: config.questionId,
            text: selectedQuestion.question, // Your field name
            marks: config.marks,
            difficulty: config.level,
            bloomLevel: selectedQuestion.bloom_level, // Your field name
            unit: selectedQuestion.matched_unit, // Your field name
            topic: selectedQuestion.matched_topic, // Your field name
            source: 'processed_data',
            originalId: selectedQuestion._id,
            similarity: selectedQuestion.topic_similarity // Your field name
          });
        } else {
          // Generate AI question if no match found
          const aiQuestion = generateAIQuestionForConfig(config, section);
          generatedQuestions.push(aiQuestion);
        }
      }
    }
  } else {
    // Generate Semester End questions (5 COs, 2 questions each)
    const cos = [1, 2, 3, 4, 5];
    
    for (const co of cos) {
      for (let setIdx = 1; setIdx <= 2; setIdx++) {
        const questionNum = (co - 1) * 2 + setIdx;
        const questionSet = questionConfigs.filter(q => 
          parseInt(q.questionId) === questionNum &&
          (!q.questionId.endsWith('c') || q.includeC)
        );
        
        for (const config of questionSet) {
          // Find matching questions for this CO
          const matchingQuestions = questions.filter(q => {
            const difficultyMatch = q.difficulty && 
              q.difficulty.toLowerCase() === config.level.toLowerCase();
            const marksMatch = q.predicted_marks && 
              Math.abs(q.predicted_marks - config.marks) <= 3;
            const topicMatch = !config.topic || 
              (q.matched_topic && q.matched_topic.toLowerCase().includes(config.topic.toLowerCase()));
            
            return difficultyMatch && marksMatch && topicMatch;
          });
          
          // Sort by similarity score
          matchingQuestions.sort((a, b) => (b.topic_similarity || 0) - (a.topic_similarity || 0));
          
          if (matchingQuestions.length > 0) {
            const selectedQuestion = matchingQuestions[0];
            
            generatedQuestions.push({
              questionId: config.questionId,
              text: selectedQuestion.question,
              marks: config.marks,
              difficulty: config.level,
              bloomLevel: selectedQuestion.bloom_level,
              unit: selectedQuestion.matched_unit,
              topic: selectedQuestion.matched_topic,
              co: co,
              source: 'processed_data',
              originalId: selectedQuestion._id,
              similarity: selectedQuestion.topic_similarity
            });
          } else {
            // Generate AI question if no match found
            const aiQuestion = generateAIQuestionForConfig(config, null, co);
            generatedQuestions.push(aiQuestion);
          }
        }
      }
    }
  }
  
  console.log(`Generated ${generatedQuestions.length} questions from processed data`);
  return generatedQuestions;
}

// Function to generate AI questions when processed data is not available
function generateWithAI(courseId, examType, questionConfigs) {
  const generatedQuestions = [];
  
  if (examType === 'CIE') {
    const sections = [1, 2, 3];
    
    for (const section of sections) {
      const sectionConfigs = questionConfigs.filter(q => 
        q.questionId.startsWith(section.toString()) &&
        (!q.questionId.endsWith('c') || q.includeC)
      );
      
      for (const config of sectionConfigs) {
        const aiQuestion = generateAIQuestionForConfig(config, section);
        generatedQuestions.push(aiQuestion);
      }
    }
  } else {
    const cos = [1, 2, 3, 4, 5];
    
    for (const co of cos) {
      for (let setIdx = 1; setIdx <= 2; setIdx++) {
        const questionNum = (co - 1) * 2 + setIdx;
        const questionSet = questionConfigs.filter(q => 
          parseInt(q.questionId) === questionNum &&
          (!q.questionId.endsWith('c') || q.includeC)
        );
        
        for (const config of questionSet) {
          const aiQuestion = generateAIQuestionForConfig(config, null, co);
          generatedQuestions.push(aiQuestion);
        }
      }
    }
  }
  
  return generatedQuestions;
}

// Helper function to generate AI question for specific config
function generateAIQuestionForConfig(config, section = null, co = null) {
  const topics = [
    "process management", "memory management", "file systems", "I/O systems",
    "CPU scheduling", "deadlock handling", "virtual memory", "disk scheduling",
    "operating system security", "distributed systems", "system calls", "threading"
  ];
  
  const topic = config.topic || topics[Math.floor(Math.random() * topics.length)];
  
  const questionTemplates = {
    "easy": [
      `Define and explain ${topic} with suitable examples.`,
      `List the key characteristics and features of ${topic}.`,
      `What are the basic components of ${topic}? Explain briefly.`,
      `Draw a simple diagram to illustrate ${topic}.`
    ],
    "medium": [
      `Explain the working principle of ${topic} with detailed examples and applications.`,
      `Analyze the advantages and disadvantages of ${topic} in operating systems.`,
      `Describe the implementation process of ${topic} with algorithmic steps.`,
      `Compare and contrast different approaches to ${topic}.`
    ],
    "hard": [
      `Design and implement a comprehensive solution for ${topic} addressing complex scenarios.`,
      `Critically evaluate the performance implications of ${topic} in modern operating systems.`,
      `Develop an optimized algorithm for ${topic} and justify your design decisions.`,
      `Create a novel approach for ${topic} to solve real-world system challenges.`
    ]
  };
  
  const templates = questionTemplates[config.level] || questionTemplates["medium"];
  const questionText = templates[Math.floor(Math.random() * templates.length)];
  
  return {
    questionId: config.questionId,
    text: questionText,
    marks: config.marks,
    difficulty: config.level,
    bloomLevel: config.level === 'easy' ? 'L1' : config.level === 'medium' ? 'L3' : 'L5',
    unit: section ? `Unit ${section}` : 'General',
    topic: topic,
    co: co,
    source: 'ai_generated'
  };
}

// @route   POST /api/questions/filter
// @desc    Filter questions from processed data using your exact structure
// @access  Private
router.post('/filter', auth, async (req, res) => {
  try {
    const { courseId, difficulty, bloomLevel, unit, marks } = req.body;
    
    const processedData = await ProcessedData.findOne({
      educator: req.educator._id,
      course: courseId,
      processingStatus: 'COMPLETED'
    });
    
    if (!processedData) {
      return res.status(404).json({ message: 'No processed data found for this course' });
    }
    
    let filteredQuestions = processedData.questions;
    
    // Apply filters using your exact field names
    if (difficulty) {
      filteredQuestions = filteredQuestions.filter(q => 
        q.difficulty && q.difficulty.toLowerCase() === difficulty.toLowerCase()
      );
    }
    
    if (bloomLevel) {
      filteredQuestions = filteredQuestions.filter(q => 
        q.bloom_level === bloomLevel
      );
    }
    
    if (unit) {
      filteredQuestions = filteredQuestions.filter(q => 
        q.matched_unit && q.matched_unit.toLowerCase().includes(unit.toLowerCase())
      );
    }
    
    if (marks) {
      filteredQuestions = filteredQuestions.filter(q => 
        q.predicted_marks && Math.abs(q.predicted_marks - marks) <= 1
      );
    }
    
    res.json({
      questions: filteredQuestions,
      totalCount: filteredQuestions.length,
      filters: { difficulty, bloomLevel, unit, marks }
    });
    
  } catch (error) {
    console.error('Question filtering error:', error);
    res.status(500).json({ message: 'Failed to filter questions' });
  }
});

// @route   GET /api/questions/stats/:courseId
// @desc    Get statistics about processed questions using your structure
// @access  Private
router.get('/stats/:courseId', auth, async (req, res) => {
  try {
    const processedData = await ProcessedData.findOne({
      educator: req.educator._id,
      course: req.params.courseId,
      processingStatus: 'COMPLETED'
    });
    
    if (!processedData) {
      return res.status(404).json({ message: 'No processed data found for this course' });
    }
    
    const questions = processedData.questions;
    const topics = processedData.topics;
    
    // Calculate statistics using your exact field names
    const stats = {
      totalQuestions: questions.length,
      totalTopics: topics.length,
      difficultyDistribution: {
        easy: questions.filter(q => q.difficulty === 'Easy').length,
        medium: questions.filter(q => q.difficulty === 'Medium').length,
        hard: questions.filter(q => q.difficulty === 'Hard').length
      },
      bloomLevelDistribution: {},
      marksDistribution: {},
      unitDistribution: {},
      averageSimilarity: 0
    };
    
    // Bloom level distribution using your bloom_level field
    const bloomLevels = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];
    bloomLevels.forEach(level => {
      stats.bloomLevelDistribution[level] = questions.filter(q => q.bloom_level === level).length;
    });
    
    // Marks distribution using your predicted_marks field
    stats.marksDistribution = {
      '1-3': questions.filter(q => q.predicted_marks >= 1 && q.predicted_marks <= 3).length,
      '4-6': questions.filter(q => q.predicted_marks >= 4 && q.predicted_marks <= 6).length,
      '7-10': questions.filter(q => q.predicted_marks >= 7 && q.predicted_marks <= 10).length,
      '11+': questions.filter(q => q.predicted_marks > 10).length
    };
    
    // Unit distribution using your matched_unit field
    const units = [...new Set(questions.map(q => q.matched_unit).filter(Boolean))];
    units.forEach(unit => {
      stats.unitDistribution[unit] = questions.filter(q => q.matched_unit === unit).length;
    });
    
    // Average topic similarity using your topic_similarity field
    const questionsWithSimilarity = questions.filter(q => q.topic_similarity != null);
    if (questionsWithSimilarity.length > 0) {
      stats.averageSimilarity = questionsWithSimilarity.reduce((sum, q) => sum + q.topic_similarity, 0) / questionsWithSimilarity.length;
    }
    
    res.json(stats);
    
  } catch (error) {
    console.error('Stats generation error:', error);
    res.status(500).json({ message: 'Failed to generate statistics' });
  }
});

module.exports = router;