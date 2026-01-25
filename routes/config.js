const express = require('express');
const router = express.Router();
const Config = require('../models/Config');

// GET config
router.get('/config', async (req, res) => {
    try {
        console.log('GET /api/config called');
        let config = await Config.findOne();
        
        if (!config) {
            console.log('No config found, creating default');
            // Create default config if doesn't exist
            config = new Config({
                quizTime: 30,
                passingPercentage: 40,
                totalQuestions: 50
            });
            await config.save();
        }
        
        console.log('Returning config:', config);
        res.json({
            success: true,
            config: {
                quizTime: config.quizTime,
                passingPercentage: config.passingPercentage,
                totalQuestions: config.totalQuestions,
                updatedAt: config.updatedAt
            }
        });
    } catch (error) {
        console.error('Error fetching config:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching config'
        });
    }
});

// UPDATE config
router.post('/config', async (req, res) => {
    try {
        const { quizTime, passingPercentage, totalQuestions } = req.body;
        
        console.log('POST /api/config called with:', req.body);
        
        if (!quizTime || !passingPercentage || !totalQuestions) {
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
        
        // Find and update config, or create if doesn't exist
        let config = await Config.findOne();
        
        if (!config) {
            config = new Config({
                quizTime,
                passingPercentage,
                totalQuestions
            });
        } else {
            config.quizTime = quizTime;
            config.passingPercentage = passingPercentage;
            config.totalQuestions = totalQuestions;
            config.updatedAt = Date.now();
        }
        
        await config.save();
        
        res.json({
            success: true,
            message: 'Configuration updated successfully',
            config: {
                quizTime: config.quizTime,
                passingPercentage: config.passingPercentage,
                totalQuestions: config.totalQuestions,
                updatedAt: config.updatedAt
            }
        });
    } catch (error) {
        console.error('Error updating config:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating config'
        });
    }
});

// GET config for admin panel
router.get('/admin/config', async (req, res) => {
    try {
        const config = await Config.findOne();
        
        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Config not found'
            });
        }
        
        res.json({
            success: true,
            config: {
                quizTime: config.quizTime,
                passingPercentage: config.passingPercentage,
                totalQuestions: config.totalQuestions,
                updatedAt: config.updatedAt
            }
        });
    } catch (error) {
        console.error('Error fetching admin config:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;