const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority';

console.log('🔗 Attempting MongoDB connection...');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB Connected!');
})
.catch(err => {
  console.error('❌ MongoDB Connection Failed:', err.message);
});

// Schemas and Models
const userSchema = new mongoose.Schema({
  name: String,
  rollNumber: String,
  category: String,
  score: Number,
  percentage: Number,
  marksObtained: Number,
  totalMarks: Number,
  passed: Boolean,
  submittedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const questionSchema = new mongoose.Schema({
  category: String,
  questionText: String,
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  marks: Number,
  difficulty: String,
  createdAt: { type: Date, default: Date.now }
});

const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: String,
  role: String,
  createdAt: { type: Date, default: Date.now }
});

const configSchema = new mongoose.Schema({
  quizTime: Number,
  passingPercentage: Number,
  totalQuestions: Number,
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Question = mongoose.model('Question', questionSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Config = mongoose.model('Config', configSchema);

// JWT Secret
const JWT_SECRET = 'shamsi_institute_secret_key_2024';

// Check if MongoDB is connected
const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};

// ==================== HELPER FUNCTIONS ====================

async function createSampleData() {
  try {
    console.log('🔄 Creating sample MongoDB data...');
    
    // Create admin if not exists
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@shamsi.edu.pk',
        role: 'superadmin'
      });
      console.log('✅ Created admin user');
    }
    
    // Create sample users
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const sampleUsers = [
        {
          name: 'Ali Ahmed',
          rollNumber: 'SI-2024-001',
          category: 'html',
          score: 85,
          percentage: 85,
          marksObtained: 85,
          totalMarks: 100,
          passed: true,
          submittedAt: new Date()
        }
      ];
      
      await User.insertMany(sampleUsers);
      console.log(`✅ Created ${sampleUsers.length} sample users`);
    }
    
    // Create config
    const configCount = await Config.countDocuments();
    if (configCount === 0) {
      await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 10
      });
      console.log('✅ Created default config');
    }
    
    console.log('🎉 Sample data creation complete!');
    
  } catch (error) {
    console.error('Error creating sample data:', error);
  }
}

// ==================== ROUTES ====================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Shamsi Institute Quiz System API is running',
    timestamp: new Date().toISOString(),
    mongodb: isDBConnected() ? 'connected' : 'disconnected'
  });
});

// Initialize database endpoint
app.get('/api/init-db', async (req, res) => {
  try {
    if (isDBConnected()) {
      await createSampleData();
      
      res.json({
        success: true,
        message: 'Database initialized with sample data'
      });
    } else {
      res.json({
        success: false,
        message: 'MongoDB not connected'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Init error',
      error: error.message
    });
  }
});

// ==================== ADMIN ROUTES ====================

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Login attempt:', username);
    
    // Development mode credentials (always work)
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { id: 'dev_admin_id', username: 'admin', role: 'superadmin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          username: 'admin',
          email: 'admin@shamsi.edu.pk',
          role: 'superadmin'
        }
      });
    }
    
    // If MongoDB is connected, try to check there too
    if (isDBConnected()) {
      const admin = await Admin.findOne({ username });
      
      if (admin) {
        const validPassword = await bcrypt.compare(password, admin.password);
        if (validPassword) {
          const token = jwt.sign(
            { id: admin._id, username: admin.username, role: admin.role },
            JWT_SECRET,
            { expiresIn: '24h' }
          );
          
          return res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
              username: admin.username,
              email: admin.email,
              role: admin.role
            }
          });
        }
      }
    }
    
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login error',
      error: error.message
    });
  }
});

// Get Dashboard Stats
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    console.log('📊 Dashboard stats requested');
    
    if (isDBConnected()) {
      // Get counts
      const totalStudents = await User.countDocuments();
      const totalQuestions = await Question.countDocuments();
      const totalAttempts = await User.countDocuments({ submittedAt: { $ne: null } });
      
      const results = await User.find({ submittedAt: { $ne: null } });
      const averageScore = results.length > 0 
        ? results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length 
        : 0;
      
      const passCount = results.filter(r => r.passed).length;
      const passRate = results.length > 0 ? (passCount / results.length) * 100 : 0;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayAttempts = await User.countDocuments({ 
        submittedAt: { $gte: today } 
      });
      
      // Get config
      let config = await Config.findOne();
      if (!config) {
        config = {
          quizTime: 30,
          passingPercentage: 40,
          totalQuestions: 10
        };
      }
      
      res.json({
        success: true,
        stats: {
          totalStudents,
          totalQuestions,
          totalAttempts,
          averageScore: parseFloat(averageScore.toFixed(2)),
          passRate: parseFloat(passRate.toFixed(2)),
          todayAttempts,
          quizTime: config.quizTime,
          passingPercentage: config.passingPercentage
        }
      });
      
    } else {
      res.json({
        success: true,
        stats: {
          totalStudents: 0,
          totalQuestions: 0,
          totalAttempts: 0,
          averageScore: 0,
          passRate: 0,
          todayAttempts: 0,
          quizTime: 30,
          passingPercentage: 40
        }
      });
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Dashboard error',
      error: error.message
    });
  }
});

// Get All Questions
app.get('/api/admin/questions', async (req, res) => {
  try {
    console.log('📝 Fetching all questions...');
    
    if (isDBConnected()) {
      const questions = await Question.find().sort({ createdAt: -1 });
      
      console.log(`✅ Found ${questions.length} questions in MongoDB`);
      
      res.json({
        success: true,
        questions,
        count: questions.length
      });
    } else {
      res.json({
        success: true,
        questions: [],
        count: 0
      });
    }
  } catch (error) {
    console.error('Error getting questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting questions',
      error: error.message
    });
  }
});

// Add New Question
app.post('/api/admin/questions', async (req, res) => {
  try {
    const { category, questionText, options, marks, difficulty } = req.body;
    
    console.log('➕ Adding new question:', { category, questionText });
    
    if (!category || !questionText || !options) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Validate exactly one correct option
    const correctOptions = options.filter(opt => opt.isCorrect);
    if (correctOptions.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Exactly one correct option is required'
      });
    }
    
    if (isDBConnected()) {
      const question = new Question({
        category,
        questionText,
        options,
        marks: marks || 1,
        difficulty: difficulty || 'medium'
      });
      
      await question.save();
      
      console.log(`✅ Question added to MongoDB with ID: ${question._id}`);
      
      res.json({
        success: true,
        message: 'Question added successfully',
        question
      });
    } else {
      res.json({
        success: false,
        message: 'MongoDB not connected'
      });
    }
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding question',
      error: error.message
    });
  }
});

// Delete Question
app.delete('/api/admin/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Deleting question:', id);
    
    if (isDBConnected()) {
      const result = await Question.findByIdAndDelete(id);
      
      if (result) {
        console.log(`✅ Question deleted: ${id}`);
        res.json({
          success: true,
          message: 'Question deleted successfully',
          deletedId: id
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }
    } else {
      res.json({
        success: false,
        message: 'MongoDB not connected'
      });
    }
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting question',
      error: error.message
    });
  }
});

// Get Results
app.get('/api/admin/results', async (req, res) => {
  try {
    console.log('📈 Fetching results...');
    
    if (isDBConnected()) {
      const results = await User.find({ submittedAt: { $ne: null } })
        .sort({ submittedAt: -1 });
      
      console.log(`✅ Found ${results.length} results in MongoDB`);
      
      res.json({
        success: true,
        results,
        count: results.length
      });
    } else {
      res.json({
        success: true,
        results: [],
        count: 0
      });
    }
  } catch (error) {
    console.error('Error getting results:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting results',
      error: error.message
    });
  }
});

// Delete Result
app.delete('/api/admin/results/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Deleting result:', id);
    
    if (isDBConnected()) {
      const result = await User.findByIdAndDelete(id);
      
      if (result) {
        console.log(`✅ Result deleted: ${id}`);
        res.json({
          success: true,
          message: 'Result deleted successfully',
          deletedId: id
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Result not found'
        });
      }
    } else {
      res.json({
        success: false,
        message: 'MongoDB not connected'
      });
    }
  } catch (error) {
    console.error('Error deleting result:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting result',
      error: error.message
    });
  }
});

// Delete All Results
app.delete('/api/admin/results', async (req, res) => {
  try {
    console.log('🗑️ Deleting ALL results');
    
    if (isDBConnected()) {
      const result = await User.deleteMany({ submittedAt: { $ne: null } });
      
      console.log(`✅ Deleted ${result.deletedCount} results`);
      res.json({
        success: true,
        message: `Deleted ${result.deletedCount} results`,
        deletedCount: result.deletedCount
      });
    } else {
      res.json({
        success: false,
        message: 'MongoDB not connected'
      });
    }
  } catch (error) {
    console.error('Error deleting all results:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting all results',
      error: error.message
    });
  }
});

// Get Configuration
app.get('/api/config', async (req, res) => {
  try {
    console.log('⚙️ Fetching configuration...');
    
    if (isDBConnected()) {
      let config = await Config.findOne();
      
      if (!config) {
        config = new Config({
          quizTime: 30,
          passingPercentage: 40,
          totalQuestions: 10
        });
        await config.save();
      }
      
      res.json({
        success: true,
        config
      });
    } else {
      res.json({
        success: true,
        config: {
          quizTime: 30,
          passingPercentage: 40,
          totalQuestions: 10
        }
      });
    }
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting configuration',
      error: error.message
    });
  }
});

// Update Configuration
app.put('/api/config', async (req, res) => {
  try {
    const { quizTime, passingPercentage, totalQuestions } = req.body;
    
    console.log('⚙️ Updating configuration:', { quizTime, passingPercentage, totalQuestions });
    
    if (isDBConnected()) {
      let config = await Config.findOne();
      
      if (config) {
        config.quizTime = quizTime || config.quizTime;
        config.passingPercentage = passingPercentage || config.passingPercentage;
        config.totalQuestions = totalQuestions || config.totalQuestions;
        config.updatedAt = new Date();
        await config.save();
      } else {
        config = new Config({
          quizTime: quizTime || 30,
          passingPercentage: passingPercentage || 40,
          totalQuestions: totalQuestions || 10
        });
        await config.save();
      }
      
      res.json({
        success: true,
        message: 'Configuration updated successfully',
        config
      });
    } else {
      res.json({
        success: false,
        message: 'MongoDB not connected'
      });
    }
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating configuration',
      error: error.message
    });
  }
});

// Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    console.log('📂 Fetching categories...');
    
    if (isDBConnected()) {
      // Get unique categories from questions
      const categories = await Question.distinct('category');
      
      // Format categories
      const formattedCategories = categories.map(cat => ({
        value: cat,
        label: cat.toUpperCase()
      }));
      
      res.json({
        success: true,
        categories: formattedCategories
      });
    } else {
      res.json({
        success: true,
        categories: []
      });
    }
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting categories',
      error: error.message
    });
  }
});

// Get Quiz Questions for Students
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    console.log('❓ Fetching quiz questions for category:', category);
    
    if (isDBConnected()) {
      // Get questions for this category
      const questions = await Question.find({ category });
      
      if (questions.length === 0) {
        return res.json({
          success: true,
          questions: [],
          message: 'No questions available for this category'
        });
      }
      
      // Get config for number of questions
      const config = await Config.findOne();
      const totalQuestions = config?.totalQuestions || 10;
      
      // Select random questions (limited to totalQuestions)
      const selectedQuestions = questions
        .sort(() => 0.5 - Math.random())
        .slice(0, totalQuestions);
      
      console.log(`✅ Found ${selectedQuestions.length} questions for quiz`);
      
      res.json({
        success: true,
        questions: selectedQuestions,
        count: selectedQuestions.length,
        quizTime: config?.quizTime || 30,
        passingPercentage: config?.passingPercentage || 40
      });
    } else {
      res.json({
        success: true,
        questions: [],
        message: 'No questions available'
      });
    }
  } catch (error) {
    console.error('Error getting quiz questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting quiz questions',
      error: error.message
    });
  }
});

// Submit Quiz Results
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { rollNumber, name, category, score, percentage, totalQuestions, correctAnswers } = req.body;
    
    console.log('📤 Submitting quiz result:', { rollNumber, name, percentage });
    
    if (isDBConnected()) {
      const user = new User({
        name,
        rollNumber,
        category,
        score,
        percentage,
        marksObtained: score,
        totalMarks: totalQuestions,
        passed: percentage >= 40,
        submittedAt: new Date()
      });
      
      await user.save();
      
      res.json({
        success: true,
        message: 'Quiz result saved successfully',
        result: user
      });
    } else {
      res.json({
        success: false,
        message: 'MongoDB not connected, result not saved'
      });
    }
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting quiz',
      error: error.message
    });
  }
});

// ==================== START SERVER ====================

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`
  🚀 Server running on port ${PORT}
  🌐 http://localhost:${PORT}
  
  ==== ADMIN CREDENTIALS ====
  👨‍💼 Username: admin
  🔑 Password: admin123
  
  ==== CURRENT STATUS ====
  MongoDB: ${isDBConnected() ? '✅ Connected' : '❌ Disconnected'}
  `);
});