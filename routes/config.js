// server/routes/config.js
const express = require('express');
const router = express.Router();
const Config = require('../models/Config');

// GET config
router.get('/', async (req, res) => {
  try {
    let config = await Config.findOne();
    
    if (!config) {
      config = new Config({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 100,
        maxMarks: 100
      });
      await config.save();
    }
    
    res.json({
      success: true,
      config: {
        quizTime: config.quizTime,
        passingPercentage: config.passingPercentage,
        totalQuestions: config.totalQuestions,
        maxMarks: config.maxMarks,
        categoryStatus: config.categoryStatus || {},
        updatedAt: config.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ Get config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch configuration'
    });
  }
});

// UPDATE config
router.post('/', async (req, res) => {
  try {
    const { quizTime, passingPercentage, totalQuestions, maxMarks } = req.body;
    
    if (!quizTime || !passingPercentage || !totalQuestions || !maxMarks) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    // Validate input
    if (quizTime < 1 || quizTime > 180) {
      return res.status(400).json({
        success: false,
        message: 'Quiz time must be between 1 and 180 minutes'
      });
    }
    
    if (passingPercentage < 0 || passingPercentage > 100) {
      return res.status(400).json({
        success: false,
        message: 'Passing percentage must be between 0 and 100'
      });
    }
    
    if (totalQuestions < 1 || totalQuestions > 200) {
      return res.status(400).json({
        success: false,
        message: 'Total questions must be between 1 and 200'
      });
    }
    
    if (maxMarks < 10 || maxMarks > 500) {
      return res.status(400).json({
        success: false,
        message: 'Maximum marks must be between 10 and 500'
      });
    }
    
    // Find and update config
    let config = await Config.findOne();
    
    if (!config) {
      config = new Config({
        quizTime,
        passingPercentage,
        totalQuestions,
        maxMarks
      });
    } else {
      config.quizTime = quizTime;
      config.passingPercentage = passingPercentage;
      config.totalQuestions = totalQuestions;
      config.maxMarks = maxMarks;
      config.updatedAt = Date.now();
    }
    
    await config.save();
    
    res.json({
      success: true,
      message: '✅ Configuration updated successfully',
      config: {
        quizTime: config.quizTime,
        passingPercentage: config.passingPercentage,
        totalQuestions: config.totalQuestions,
        maxMarks: config.maxMarks,
        updatedAt: config.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ Update config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration'
    });
  }
});

module.exports = router;