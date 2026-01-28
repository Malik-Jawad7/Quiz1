const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// CORS Configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection - Simple version
const MONGODB_URI = 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority';

console.log('🔗 MongoDB Connecting...');

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Atlas Connected Successfully!');
    initializeDefaultData();
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });

// Schemas
const UserSchema = new mongoose.Schema({
  name: String,
  rollNumber: { type: String, unique: true },
  category: String,
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  marksObtained: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 100 },
  passed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  submittedAt: { type: Date, default: null }
});

const QuestionSchema = new mongoose.Schema({
  category: String,
  questionText: String,
  options: [{ text: String, isCorrect: Boolean }],
  marks: { type: Number, default: 1 },
  difficulty: { type: String, default: 'medium' },
  createdAt: { type: Date, default: Date.now }
});

const ConfigSchema = new mongoose.Schema({
  quizTime: { type: Number, default: 30 },
  passingPercentage: { type: Number, default: 40 },
  totalQuestions: { type: Number, default: 50 },
  updatedAt: { type: Date, default: Date.now }
});

const AdminSchema = new mongoose.Schema({
  username: { type: String, default: 'admin' },
  password: { type: String, default: 'admin123' },
  email: { type: String, default: 'admin@shamsi.edu.pk' }
});

const User = mongoose.model('User', UserSchema);
const Question = mongoose.model('Question', QuestionSchema);
const Config = mongoose.model('Config', ConfigSchema);
const Admin = mongoose.model('Admin', AdminSchema);

// Initialize default data
const initializeDefaultData = async () => {
  try {
    // Default admin
    let admin = await Admin.findOne({ username: 'admin' });
    if (!admin) {
      admin = new Admin();
      await admin.save();
      console.log('✅ Default admin created');
    }

    // Default config
    let config = await Config.findOne();
    if (!config) {
      config = new Config();
      await config.save();
      console.log('✅ Default config created');
    }

    // Sample questions
    const questionCount = await Question.countDocuments();
    if (questionCount === 0) {
      const sampleQuestions = [
        {
          category: 'html',
          questionText: 'What does HTML stand for?',
          options: [
            { text: 'Hyper Text Markup Language', isCorrect: true },
            { text: 'High Tech Modern Language', isCorrect: false }
          ],
          marks: 10,
          difficulty: 'easy'
        }
      ];
      
      await Question.insertMany(sampleQuestions);
      console.log('✅ Sample questions added');
    }
    
    console.log('📊 Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing data:', error);
  }
};

// ==================== API ROUTES ====================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Shamsi Institute Quiz System API',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Admin Login - SIMPLIFIED VERSION
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Login attempt:', username, password);
    
    // Hardcoded check for testing
    if (username === 'admin' && password === 'admin123') {
      return res.json({
        success: true,
        message: 'Login successful',
        user: { 
          username: 'admin', 
          role: 'admin',
          email: 'admin@shamsi.edu.pk' 
        }
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error'
    });
  }
});

// Get Config
app.get('/api/config', async (req, res) => {
  try {
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
        totalQuestions: config.totalQuestions
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch config'
    });
  }
});

// Update Config
app.put('/api/config', async (req, res) => {
  try {
    const { quizTime, passingPercentage, totalQuestions } = req.body;
    
    let config = await Config.findOne();
    if (!config) {
      config = new Config({ 
        quizTime, 
        passingPercentage, 
        totalQuestions 
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
      message: 'Configuration updated successfully',
      config: {
        quizTime: config.quizTime,
        passingPercentage: config.passingPercentage,
        totalQuestions: config.totalQuestions
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update config'
    });
  }
});

// Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Question.distinct('category');
    res.json({
      success: true,
      categories: categories.map(cat => ({
        value: cat,
        label: cat.toUpperCase(),
        questionCount: 5,
        isReady: true
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch categories'
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
        message: 'Please provide name, roll number, and category'
      });
    }
    
    const existingUser = await User.findOne({ rollNumber });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Roll number already registered'
      });
    }
    
    const user = new User({
      name,
      rollNumber,
      category
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        name: user.name,
        rollNumber: user.rollNumber,
        category: user.category,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed'
    });
  }
});

// Get Questions by Category
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const allQuestions = await Question.find({ category: category.toLowerCase() });
    
    const questionsForQuiz = allQuestions.map(question => ({
      _id: question._id,
      questionText: question.questionText,
      options: question.options.map(opt => ({
        text: opt.text,
      })),
      marks: question.marks
    }));
    
    res.json({
      success: true,
      questions: questionsForQuiz,
      totalQuestions: questionsForQuiz.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch quiz questions'
    });
  }
});

// Submit Quiz
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { rollNumber, answers } = req.body;
    
    const user = await User.findOne({ rollNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    user.submittedAt = new Date();
    await user.save();
    
    res.json({
      success: true,
      message: 'Quiz submitted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit quiz'
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Shamsi Institute Quiz System API',
    version: '1.0.0'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});