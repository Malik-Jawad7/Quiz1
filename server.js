const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// MongoDB Connection String
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority';

// Improved MongoDB connection with better error handling
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully');
  console.log('📊 Database:', mongoose.connection.name);
  console.log('🔗 Connection State:', mongoose.connection.readyState);
})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
  console.log('📝 Attempting to use fallback database...');
});

// Connection events
mongoose.connection.on('connected', () => {
  console.log('📡 MongoDB event connected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB event error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB event disconnected');
});

// Close MongoDB connection on app termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

// MongoDB Models
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNumber: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  marksObtained: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const QuestionSchema = new mongoose.Schema({
  category: { type: String, required: true },
  questionText: { type: String, required: true },
  options: [{
    text: { type: String, required: true },
    isCorrect: { type: Boolean, required: true }
  }],
  marks: { type: Number, default: 1 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  createdAt: { type: Date, default: Date.now }
});

const ConfigSchema = new mongoose.Schema({
  quizTime: { type: Number, default: 30 },
  passingPercentage: { type: Number, default: 40 },
  totalQuestions: { type: Number, default: 100 },
  categoryStatus: { type: Object, default: {} },
  updatedAt: { type: Date, default: Date.now }
});

const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String },
  role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Question = mongoose.model('Question', QuestionSchema);
const Config = mongoose.model('Config', ConfigSchema);
const Admin = mongoose.model('Admin', AdminSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'shamsi_institute_secret_key_2024';

// Simple mock data storage for development if MongoDB fails
let mockQuestions = [];
let mockResults = [];
let mockConfig = {
  quizTime: 30,
  passingPercentage: 40,
  totalQuestions: 100
};

// Authentication Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // For development, accept any valid JWT token
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Check if MongoDB is connected
const isMongoDBConnected = () => {
  return mongoose.connection.readyState === 1;
};

// ==================== ROUTES ====================

// Health Check with MongoDB status
app.get('/api/health', async (req, res) => {
  const dbStatus = isMongoDBConnected() ? 'Connected to MongoDB' : 'Using Mock Data';
  
  res.json({
    success: true,
    message: 'Shamsi Institute Quiz System API',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    status: 'Live',
    mongoState: mongoose.connection.readyState,
    mongoDB: isMongoDBConnected() ? '✅ Connected' : '❌ Disconnected'
  });
});

// Setup Admin (First Time)
app.get('/api/setup-admin', async (req, res) => {
  try {
    // If MongoDB is connected, use it
    if (isMongoDBConnected()) {
      const adminExists = await Admin.findOne({ username: 'admin' });
      
      if (adminExists) {
        return res.json({
          success: true,
          message: 'Admin already exists in MongoDB',
          database: 'MongoDB'
        });
      }
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = new Admin({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@shamsi.edu.pk',
        role: 'superadmin'
      });
      
      await admin.save();
      
      // Create default config
      const config = new Config();
      await config.save();
      
      console.log('✅ Admin created in MongoDB');
      
      res.json({
        success: true,
        message: 'Admin setup successful in MongoDB',
        admin: {
          username: 'admin',
          email: 'admin@shamsi.edu.pk'
        },
        database: 'MongoDB'
      });
    } else {
      // Use mock data if MongoDB is not connected
      console.log('⚠️ Using mock admin setup');
      res.json({
        success: true,
        message: 'Admin setup successful (Development Mode)',
        admin: {
          username: 'admin',
          email: 'admin@shamsi.edu.pk'
        },
        database: 'Mock Data'
      });
    }
  } catch (error) {
    console.error('❌ Setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Setup failed',
      error: error.message,
      database: isMongoDBConnected() ? 'MongoDB' : 'Mock Data'
    });
  }
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Development mode - accept admin/admin123
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { id: 'dev_admin_id', username: 'admin', role: 'superadmin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        message: 'Login successful (Development Mode)',
        token,
        user: {
          username: 'admin',
          email: 'admin@shamsi.edu.pk',
          role: 'superadmin'
        }
      });
    }
    
    // If MongoDB is connected, try to authenticate from database
    if (isMongoDBConnected()) {
      const admin = await Admin.findOne({ username });
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      const token = jwt.sign(
        { id: admin._id, username: admin.username, role: admin.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        message: 'Login successful (MongoDB)',
        token,
        user: {
          username: admin.username,
          email: admin.email,
          role: admin.role
        }
      });
    }
    
    // Default fallback
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// Get Dashboard Stats
app.get('/api/admin/dashboard', authMiddleware, async (req, res) => {
  try {
    if (isMongoDBConnected()) {
      const totalStudents = await User.countDocuments();
      const totalQuestions = await Question.countDocuments();
      const totalAttempts = await User.countDocuments({ submittedAt: { $ne: null } });
      
      const results = await User.find({ submittedAt: { $ne: null } });
      const averageScore = results.length > 0 
        ? results.reduce((sum, r) => sum + r.percentage, 0) / results.length 
        : 0;
      
      const passCount = results.filter(r => r.passed).length;
      const passRate = results.length > 0 ? (passCount / results.length) * 100 : 0;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayAttempts = await User.countDocuments({ submittedAt: { $gte: today } });
      
      // Get config
      let config = await Config.findOne();
      if (!config) {
        config = new Config();
        await config.save();
      }
      
      res.json({
        success: true,
        stats: {
          totalStudents,
          totalQuestions,
          totalAttempts,
          averageScore: averageScore.toFixed(2),
          passRate: passRate.toFixed(2),
          todayAttempts,
          quizTime: config.quizTime,
          passingPercentage: config.passingPercentage
        },
        database: 'MongoDB'
      });
    } else {
      // Mock data for development
      res.json({
        success: true,
        stats: {
          totalStudents: mockResults.length,
          totalQuestions: mockQuestions.length,
          totalAttempts: mockResults.length,
          averageScore: 75,
          passRate: 80,
          todayAttempts: 3,
          quizTime: mockConfig.quizTime,
          passingPercentage: mockConfig.passingPercentage
        },
        database: 'Mock Data'
      });
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats',
      error: error.message
    });
  }
});

// Get All Questions
app.get('/api/admin/questions', authMiddleware, async (req, res) => {
  try {
    if (isMongoDBConnected()) {
      const questions = await Question.find().sort({ createdAt: -1 });
      
      res.json({
        success: true,
        questions,
        count: questions.length,
        database: 'MongoDB'
      });
    } else {
      // Mock questions
      if (mockQuestions.length === 0) {
        mockQuestions = [
          {
            _id: '1',
            category: 'html',
            questionText: 'What does HTML stand for?',
            options: [
              { text: 'Hyper Text Markup Language', isCorrect: true },
              { text: 'High Tech Modern Language', isCorrect: false },
              { text: 'Hyper Transfer Markup Language', isCorrect: false },
              { text: 'Home Tool Markup Language', isCorrect: false }
            ],
            marks: 1,
            difficulty: 'easy',
            createdAt: new Date().toISOString()
          }
        ];
      }
      
      res.json({
        success: true,
        questions: mockQuestions,
        count: mockQuestions.length,
        database: 'Mock Data'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get questions',
      error: error.message
    });
  }
});

// Add Question
app.post('/api/admin/questions', authMiddleware, async (req, res) => {
  try {
    const { category, questionText, options, marks, difficulty } = req.body;
    
    if (!category || !questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Category, question text, and at least 2 options are required'
      });
    }
    
    // Check if at least one option is correct
    const hasCorrect = options.some(opt => opt.isCorrect);
    if (!hasCorrect) {
      return res.status(400).json({
        success: false,
        message: 'Please mark one option as correct'
      });
    }
    
    if (isMongoDBConnected()) {
      // Check category marks limit (100 per category)
      const existingQuestions = await Question.find({ category });
      const currentTotalMarks = existingQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
      const newQuestionMarks = marks || 1;
      
      if (currentTotalMarks + newQuestionMarks > 100) {
        const remaining = 100 - currentTotalMarks;
        return res.status(400).json({
          success: false,
          message: `Cannot add question. ${category.toUpperCase()} already has ${currentTotalMarks}/100 marks. Only ${remaining} marks remaining.`
        });
      }
      
      // Create new question in MongoDB
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
      
      console.log('✅ Question saved to MongoDB');
      
      res.status(201).json({
        success: true,
        message: 'Question added successfully to MongoDB',
        question,
        database: 'MongoDB'
      });
    } else {
      // Save to mock data
      const newQuestion = {
        _id: Date.now().toString(),
        category: category.toLowerCase(),
        questionText: questionText.trim(),
        options: options.map(opt => ({
          text: opt.text.trim(),
          isCorrect: opt.isCorrect || false
        })),
        marks: marks || 1,
        difficulty: difficulty || 'medium',
        createdAt: new Date().toISOString()
      };
      
      mockQuestions.push(newQuestion);
      
      console.log('📝 Question saved to mock data');
      
      res.status(201).json({
        success: true,
        message: 'Question added successfully (Mock Data)',
        question: newQuestion,
        database: 'Mock Data'
      });
    }
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add question',
      error: error.message
    });
  }
});

// Delete Question
app.delete('/api/admin/questions/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isMongoDBConnected()) {
      const question = await Question.findById(id);
      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found in MongoDB'
        });
      }
      
      await Question.findByIdAndDelete(id);
      
      res.json({
        success: true,
        message: 'Question deleted successfully from MongoDB',
        database: 'MongoDB'
      });
    } else {
      // Delete from mock data
      const index = mockQuestions.findIndex(q => q._id === id);
      if (index === -1) {
        return res.status(404).json({
          success: false,
          message: 'Question not found in mock data'
        });
      }
      
      mockQuestions.splice(index, 1);
      
      res.json({
        success: true,
        message: 'Question deleted successfully from mock data',
        database: 'Mock Data'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete question',
      error: error.message
    });
  }
});

// Get Results
app.get('/api/admin/results', authMiddleware, async (req, res) => {
  try {
    if (isMongoDBConnected()) {
      const results = await User.find({ submittedAt: { $ne: null } })
        .sort({ submittedAt: -1 });
      
      res.json({
        success: true,
        results,
        count: results.length,
        database: 'MongoDB'
      });
    } else {
      // Mock results
      if (mockResults.length === 0) {
        mockResults = [
          {
            _id: '1',
            name: 'Ali Ahmed',
            rollNumber: 'SI-2024-001',
            category: 'html',
            score: 85,
            percentage: 85,
            marksObtained: 85,
            totalMarks: 100,
            passed: true,
            submittedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          }
        ];
      }
      
      res.json({
        success: true,
        results: mockResults,
        count: mockResults.length,
        database: 'Mock Data'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get results',
      error: error.message
    });
  }
});

// ============ ADDED DELETE ROUTES FOR RESULTS ============

// Delete Single Result
app.delete('/api/admin/results/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isMongoDBConnected()) {
      const result = await User.findByIdAndDelete(id);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Result not found in MongoDB'
        });
      }
      
      res.json({
        success: true,
        message: 'Result deleted permanently from MongoDB',
        deletedId: id,
        database: 'MongoDB'
      });
    } else {
      // Delete from mock data
      const index = mockResults.findIndex(r => r._id === id);
      if (index === -1) {
        return res.status(404).json({
          success: false,
          message: 'Result not found in mock data'
        });
      }
      
      mockResults.splice(index, 1);
      
      res.json({
        success: true,
        message: 'Result deleted from mock data',
        deletedId: id,
        database: 'Mock Data'
      });
    }
  } catch (error) {
    console.error('Delete result error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete result',
      error: error.message
    });
  }
});

// Delete All Results
app.delete('/api/admin/results', authMiddleware, async (req, res) => {
  try {
    if (isMongoDBConnected()) {
      const result = await User.deleteMany({ submittedAt: { $ne: null } });
      
      res.json({
        success: true,
        message: `All results (${result.deletedCount}) deleted permanently from MongoDB`,
        deletedCount: result.deletedCount,
        database: 'MongoDB'
      });
    } else {
      const deletedCount = mockResults.length;
      mockResults = [];
      
      res.json({
        success: true,
        message: `All results (${deletedCount}) deleted from mock data`,
        deletedCount,
        database: 'Mock Data'
      });
    }
  } catch (error) {
    console.error('Delete all results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete all results',
      error: error.message
    });
  }
});

// Alternative POST endpoint for delete all (if DELETE method doesn't work)
app.post('/api/admin/results/delete-all', authMiddleware, async (req, res) => {
  try {
    if (isMongoDBConnected()) {
      const result = await User.deleteMany({ submittedAt: { $ne: null } });
      
      res.json({
        success: true,
        message: `All results (${result.deletedCount}) deleted permanently from MongoDB`,
        deletedCount: result.deletedCount,
        database: 'MongoDB'
      });
    } else {
      const deletedCount = mockResults.length;
      mockResults = [];
      
      res.json({
        success: true,
        message: `All results (${deletedCount}) deleted from mock data`,
        deletedCount,
        database: 'Mock Data'
      });
    }
  } catch (error) {
    console.error('Delete all results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete all results',
      error: error.message
    });
  }
});

// Get Config
app.get('/api/config', async (req, res) => {
  try {
    if (isMongoDBConnected()) {
      let config = await Config.findOne();
      
      if (!config) {
        config = new Config();
        await config.save();
      }
      
      res.json({
        success: true,
        config: {
          quizTime: config.quizTime,
          passingPercentage: config.passingPercentage,
          totalQuestions: config.totalQuestions,
          updatedAt: config.updatedAt
        },
        database: 'MongoDB'
      });
    } else {
      // Mock config
      res.json({
        success: true,
        config: mockConfig,
        database: 'Mock Data'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get config',
      error: error.message
    });
  }
});

// Update Config
app.put('/api/config', authMiddleware, async (req, res) => {
  try {
    const { quizTime, passingPercentage, totalQuestions } = req.body;
    
    if (isMongoDBConnected()) {
      let config = await Config.findOne();
      
      if (!config) {
        config = new Config({
          quizTime: quizTime || 30,
          passingPercentage: passingPercentage || 40,
          totalQuestions: totalQuestions || 100
        });
      } else {
        config.quizTime = quizTime || config.quizTime;
        config.passingPercentage = passingPercentage || config.passingPercentage;
        config.totalQuestions = totalQuestions || config.totalQuestions;
        config.updatedAt = new Date();
      }
      
      await config.save();
      
      res.json({
        success: true,
        message: 'Configuration updated successfully in MongoDB',
        config: {
          quizTime: config.quizTime,
          passingPercentage: config.passingPercentage,
          totalQuestions: config.totalQuestions,
          updatedAt: config.updatedAt
        },
        database: 'MongoDB'
      });
    } else {
      // Update mock config
      mockConfig = {
        quizTime: quizTime || mockConfig.quizTime,
        passingPercentage: passingPercentage || mockConfig.passingPercentage,
        totalQuestions: totalQuestions || mockConfig.totalQuestions
      };
      
      res.json({
        success: true,
        message: 'Configuration updated successfully in mock data',
        config: mockConfig,
        database: 'Mock Data'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update config',
      error: error.message
    });
  }
});

// Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = [
      'html', 'css', 'javascript', 'react', 'nextjs', 'vue', 'angular',
      'node', 'express', 'python', 'django', 'flask', 'java', 'spring',
      'php', 'laravel', 'mern', 'mongodb', 'mysql', 'postgresql',
      'git', 'docker', 'aws', 'typescript', 'graphql'
    ];
    
    if (isMongoDBConnected()) {
      const categoryInfo = [];
      for (const category of categories) {
        const questions = await Question.find({ category });
        const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
        const isComplete = totalMarks >= 100;
        
        categoryInfo.push({
          value: category,
          label: category.toUpperCase(),
          questionCount: questions.length,
          totalMarks: totalMarks,
          isComplete: isComplete
        });
      }
      
      res.json({
        success: true,
        categories: categoryInfo,
        database: 'MongoDB'
      });
    } else {
      // Mock categories
      const categoryInfo = categories.map(category => ({
        value: category,
        label: category.toUpperCase(),
        questionCount: mockQuestions.filter(q => q.category === category).length,
        totalMarks: mockQuestions.filter(q => q.category === category).reduce((sum, q) => sum + (q.marks || 1), 0),
        isComplete: false
      }));
      
      res.json({
        success: true,
        categories: categoryInfo,
        database: 'Mock Data'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get categories',
      error: error.message
    });
  }
});

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    if (isMongoDBConnected()) {
      // Check if user already exists
      const existingUser = await User.findOne({ rollNumber });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Roll number already exists'
        });
      }
      
      const user = new User({
        name,
        rollNumber: rollNumber.toUpperCase(),
        category: category.toLowerCase()
      });
      
      await user.save();
      
      res.status(201).json({
        success: true,
        message: 'Registration successful in MongoDB',
        user: {
          _id: user._id,
          name: user.name,
          rollNumber: user.rollNumber,
          category: user.category
        },
        database: 'MongoDB'
      });
    } else {
      // Mock registration
      const user = {
        _id: Date.now().toString(),
        name,
        rollNumber: rollNumber.toUpperCase(),
        category: category.toLowerCase(),
        createdAt: new Date().toISOString()
      };
      
      res.status(201).json({
        success: true,
        message: 'Registration successful (Development Mode)',
        user,
        database: 'Mock Data'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// Get Quiz Questions (for students)
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    if (isMongoDBConnected()) {
      // Get all questions for category
      const questions = await Question.find({ category });
      
      if (questions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No questions found for this category in MongoDB'
        });
      }
      
      // Get config for quiz settings
      const config = await Config.findOne();
      
      // Shuffle questions and limit
      const shuffledQuestions = questions
        .sort(() => Math.random() - 0.5)
        .slice(0, config?.totalQuestions || 50);
      
      // Don't send correct answers
      const quizQuestions = shuffledQuestions.map(q => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options.map(opt => ({ text: opt.text })),
        marks: q.marks || 1
      }));
      
      res.json({
        success: true,
        questions: quizQuestions,
        count: quizQuestions.length,
        category: category,
        quizTime: config?.quizTime || 30,
        totalMarks: quizQuestions.reduce((sum, q) => sum + (q.marks || 1), 0),
        database: 'MongoDB'
      });
    } else {
      // Mock quiz questions
      const categoryQuestions = mockQuestions.filter(q => q.category === category);
      
      if (categoryQuestions.length === 0) {
        // Create some mock questions if none exist
        categoryQuestions.push({
          _id: '1',
          questionText: `Sample ${category} question 1`,
          options: [
            { text: 'Option A' },
            { text: 'Option B' },
            { text: 'Option C' },
            { text: 'Option D' }
          ],
          marks: 1
        });
      }
      
      const quizQuestions = categoryQuestions.map(q => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options.map(opt => ({ text: opt.text })),
        marks: q.marks || 1
      }));
      
      res.json({
        success: true,
        questions: quizQuestions,
        count: quizQuestions.length,
        category: category,
        quizTime: mockConfig.quizTime,
        totalMarks: quizQuestions.reduce((sum, q) => sum + (q.marks || 1), 0),
        database: 'Mock Data'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get quiz questions',
      error: error.message
    });
  }
});

// Submit Quiz
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { rollNumber, answers, category, name } = req.body;
    
    if (!rollNumber || !answers) {
      return res.status(400).json({
        success: false,
        message: 'Roll number and answers are required'
      });
    }
    
    if (isMongoDBConnected()) {
      // Find or create user
      let user = await User.findOne({ rollNumber });
      if (!user) {
        user = new User({
          name: name || 'Student',
          rollNumber,
          category: category || 'general'
        });
      }
      
      // Get config
      const config = await Config.findOne();
      const passingPercentage = config?.passingPercentage || 40;
      
      // Calculate score
      let score = 0;
      let totalMarks = 0;
      let correctAnswers = 0;
      
      for (const answer of answers) {
        const question = await Question.findById(answer.questionId);
        if (question) {
          totalMarks += question.marks || 1;
          const correctOption = question.options.find(opt => opt.isCorrect);
          
          if (correctOption && correctOption.text === answer.selectedOption) {
            score += question.marks || 1;
            correctAnswers++;
          }
        }
      }
      
      const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
      const passed = percentage >= passingPercentage;
      
      // Update user in MongoDB
      user.score = score;
      user.percentage = percentage;
      user.marksObtained = score;
      user.totalMarks = totalMarks;
      user.passed = passed;
      user.submittedAt = new Date();
      user.category = category || user.category;
      
      await user.save();
      
      res.json({
        success: true,
        message: 'Quiz submitted successfully to MongoDB',
        result: {
          _id: user._id,
          name: user.name,
          rollNumber: user.rollNumber,
          category: user.category,
          score,
          percentage: percentage.toFixed(2),
          marksObtained: score,
          totalMarks,
          correctAnswers,
          totalQuestions: answers.length,
          attempted: answers.length,
          passed,
          submittedAt: user.submittedAt,
          passingPercentage: passingPercentage
        },
        database: 'MongoDB'
      });
    } else {
      // Mock quiz submission
      const score = Math.floor(Math.random() * 20) + 60; // Random score 60-80
      const totalMarks = 100;
      const percentage = score;
      const passed = percentage >= mockConfig.passingPercentage;
      
      const result = {
        _id: Date.now().toString(),
        name: name || 'Student',
        rollNumber,
        category: category || 'general',
        score,
        percentage: percentage.toFixed(2),
        marksObtained: score,
        totalMarks,
        correctAnswers: Math.floor(score / 10),
        totalQuestions: 10,
        attempted: 10,
        passed,
        submittedAt: new Date().toISOString(),
        passingPercentage: mockConfig.passingPercentage
      };
      
      mockResults.push(result);
      
      res.json({
        success: true,
        message: 'Quiz submitted successfully (Development Mode)',
        result,
        database: 'Mock Data'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit quiz',
      error: error.message
    });
  }
});

// Get Category Stats
app.get('/api/category-stats', authMiddleware, async (req, res) => {
  try {
    const categories = ['mern', 'react', 'node', 'mongodb', 'express', 'html', 'css', 'javascript'];
    const stats = {};
    
    if (isMongoDBConnected()) {
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
        database: 'MongoDB'
      });
    } else {
      // Mock category stats
      for (const category of categories) {
        const questions = mockQuestions.filter(q => q.category === category);
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
        success: false,
        stats,
        database: 'Mock Data'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get category stats',
      error: error.message
    });
  }
});

// Check MongoDB Connection Status
app.get('/api/mongodb-status', (req, res) => {
  const status = isMongoDBConnected() ? 'Connected' : 'Disconnected';
  const state = mongoose.connection.readyState;
  const stateNames = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };
  
  res.json({
    success: true,
    status,
    state,
    stateName: stateNames[state] || 'Unknown',
    connectionString: MONGODB_URI ? 'Set' : 'Not set',
    timestamp: new Date().toISOString()
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found: ' + req.url
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  🚀 Server running on port ${PORT}
  📡 API Base URL: http://localhost:${PORT}
  🔗 Health Check: http://localhost:${PORT}/api/health
  🔍 MongoDB Status: http://localhost:${PORT}/api/mongodb-status
  👨‍💼 Admin Login: admin / admin123
  💾 Database: ${isMongoDBConnected() ? 'MongoDB ✅' : 'Mock Data ⚠️'}
  `);
});