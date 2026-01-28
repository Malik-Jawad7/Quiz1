// server/routes/questions.js
const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Config = require('../models/Config');

// Check if category is ready (has 100 marks)
const checkCategoryReady = async (category) => {
  try {
    const questions = await Question.find({ category });
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    return totalMarks >= 100;
  } catch (error) {
    console.error('Error checking category ready:', error);
    return false;
  }
};

// Update all category status
const updateAllCategoryStatus = async () => {
  try {
    const categories = ['mern', 'react', 'node', 'mongodb', 'express'];
    const categoryStatus = {};
    
    for (const category of categories) {
      categoryStatus[category] = await checkCategoryReady(category);
    }
    
    let config = await Config.findOne();
    if (!config) {
      config = new Config({ categoryStatus });
    } else {
      config.categoryStatus = categoryStatus;
      config.updatedAt = new Date();
    }
    
    await config.save();
    return categoryStatus;
  } catch (error) {
    console.error('Error updating category status:', error);
    return null;
  }
};

// Add new question
router.post('/', async (req, res) => {
  try {
    const { category, questionText, options, marks, difficulty } = req.body;
    
    // Validate required fields
    if (!category || !questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Category, question text, and at least 2 options are required'
      });
    }
    
    // Validate correct answer
    const hasCorrect = options.some(opt => opt.isCorrect);
    if (!hasCorrect) {
      return res.status(400).json({
        success: false,
        message: 'Please mark one option as correct'
      });
    }
    
    // Check category marks limit
    const existingQuestions = await Question.find({ category });
    const currentTotalMarks = existingQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
    const newQuestionMarks = marks || 1;
    
    if (currentTotalMarks + newQuestionMarks > 100) {
      const remaining = 100 - currentTotalMarks;
      return res.status(400).json({
        success: false,
        message: `Cannot add question. Category "${category}" already has ${currentTotalMarks}/100 marks. Only ${remaining} marks remaining.`,
        currentMarks: currentTotalMarks,
        remainingMarks: remaining
      });
    }
    
    // Create new question
    const question = new Question({
      category: category.toLowerCase(),
      questionText: questionText.trim(),
      options: options.map(opt => ({
        text: opt.text.trim(),
        isCorrect: opt.isCorrect || false
      })),
      marks: newQuestionMarks,
      difficulty: difficulty || 'medium'
    });
    
    await question.save();
    
    // Update category status
    await updateAllCategoryStatus();
    
    res.json({
      success: true,
      message: '✅ Question added successfully!',
      question,
      categoryStatus: {
        currentMarks: currentTotalMarks + newQuestionMarks,
        remaining: 100 - (currentTotalMarks + newQuestionMarks)
      }
    });
  } catch (error) {
    console.error('❌ Add question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add question',
      error: error.message
    });
  }
});

// Get all questions
router.get('/', async (req, res) => {
  try {
    const questions = await Question.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      questions,
      count: questions.length
    });
  } catch (error) {
    console.error('❌ Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions'
    });
  }
});

// Get questions by category
router.get('/category/:category', async (req, res) => {
  try {
    const category = req.params.category.toLowerCase();
    
    // Check if category is ready
    const isCategoryReady = await checkCategoryReady(category);
    
    if (!isCategoryReady) {
      return res.status(400).json({
        success: false,
        message: `The ${category.toUpperCase()} category is not yet available. It needs 100 total marks worth of questions.`
      });
    }
    
    const questions = await Question.find({ category });
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    
    res.json({
      success: true,
      questions,
      categoryInfo: {
        name: category,
        questionCount: questions.length,
        totalMarks: totalMarks,
        isReady: isCategoryReady
      }
    });
  } catch (error) {
    console.error('❌ Get category questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions'
    });
  }
});

// Get available categories
router.get('/available-categories', async (req, res) => {
  try {
    const categories = ['mern', 'react', 'node', 'mongodb', 'express'];
    const availableCategories = [];
    
    for (const category of categories) {
      const isReady = await checkCategoryReady(category);
      if (isReady) {
        const questions = await Question.find({ category });
        const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
        
        availableCategories.push({
          value: category,
          label: category.toUpperCase(),
          isReady: true,
          questionCount: questions.length,
          totalMarks: totalMarks
        });
      }
    }
    
    res.json({
      success: true,
      categories: availableCategories,
      totalAvailable: availableCategories.length
    });
  } catch (error) {
    console.error('❌ Get available categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available categories'
    });
  }
});

// Get category statistics
router.get('/category-stats', async (req, res) => {
  try {
    const categories = ['mern', 'react', 'node', 'mongodb', 'express'];
    const stats = {};
    
    for (const category of categories) {
      const questions = await Question.find({ category });
      const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
      
      stats[category] = {
        totalMarks,
        questionCount: questions.length,
        isReady: totalMarks >= 100,
        percentage: (totalMarks / 100) * 100,
        remainingMarks: 100 - totalMarks,
        averageMarks: questions.length > 0 ? (totalMarks / questions.length).toFixed(2) : 0
      };
    }
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get category stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category statistics'
    });
  }
});

// Update question
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const question = await Question.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
    
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    
    // Update category status
    await updateAllCategoryStatus();
    
    res.json({
      success: true,
      message: '✅ Question updated successfully!',
      question
    });
  } catch (error) {
    console.error('❌ Update question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update question'
    });
  }
});

// Delete question
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    
    await Question.findByIdAndDelete(id);
    
    // Update category status
    await updateAllCategoryStatus();
    
    res.json({
      success: true,
      message: '✅ Question deleted successfully!'
    });
  } catch (error) {
    console.error('❌ Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete question'
    });
  }
});

// Check specific category status
router.get('/check-category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const isReady = await checkCategoryReady(category);
    
    const questions = await Question.find({ category });
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    
    res.json({
      success: true,
      category,
      isReady,
      totalMarks,
      questionCount: questions.length,
      remaining: 100 - totalMarks
    });
  } catch (error) {
    console.error('❌ Check category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check category status'
    });
  }
});

// Update all category status
router.post('/update-category-status', async (req, res) => {
  try {
    const categoryStatus = await updateAllCategoryStatus();
    res.json({
      success: true,
      message: 'Category status updated successfully',
      categoryStatus
    });
  } catch (error) {
    console.error('❌ Update category status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category status'
    });
  }
});

module.exports = router;