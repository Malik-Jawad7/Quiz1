const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CORS Configuration
app.use(cors({
  origin: ['https://quiz2-iota-one.vercel.app', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully!');
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
  submittedAt: { type: Date }
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
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    version: '1.0.0'
  });
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const admin = await Admin.findOne({ username });
    
    if (admin && password === admin.password) {
      res.json({
        success: true,
        message: 'Login successful',
        user: { 
          username: admin.username, 
          role: 'admin',
          email: admin.email 
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  } catch (error) {
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
        totalQuestions: config.totalQuestions,
        updatedAt: config.updatedAt
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
        totalQuestions: config.totalQuestions,
        updatedAt: config.updatedAt
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
    const categories = ['html', 'css', 'javascript', 'react', 'mern'];
    const categoryInfo = [];
    
    for (const category of categories) {
      const questionCount = await Question.countDocuments({ category });
      categoryInfo.push({
        value: category,
        label: category.toUpperCase(),
        questionCount,
        isReady: questionCount >= 3
      });
    }
    
    res.json({
      success: true,
      categories: categoryInfo
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
      category: category.toLowerCase(),
      createdAt: new Date()
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      user: {
        _id: user._id,
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

// Get Quiz Questions
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const config = await Config.findOne();
    const totalQuestions = config ? config.totalQuestions : 10;
    
    const allQuestions = await Question.find({ category: category.toLowerCase() });
    
    // If no questions in DB, return sample questions
    if (allQuestions.length === 0) {
      const sampleQuestions = [
        {
          _id: '1',
          questionText: `Sample ${category.toUpperCase()} Question 1`,
          options: [
            { text: 'Option A' },
            { text: 'Option B' },
            { text: 'Option C' },
            { text: 'Option D' }
          ],
          marks: 10
        },
        {
          _id: '2',
          questionText: `Sample ${category.toUpperCase()} Question 2`,
          options: [
            { text: 'Option A' },
            { text: 'Option B' },
            { text: 'Option C' },
            { text: 'Option D' }
          ],
          marks: 10
        }
      ];
      
      return res.json({
        success: true,
        questions: sampleQuestions,
        category: category,
        totalQuestions: sampleQuestions.length,
        totalMarks: 20
      });
    }
    
    const shuffledQuestions = [...allQuestions]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(totalQuestions, allQuestions.length));
    
    const questionsForQuiz = shuffledQuestions.map(question => ({
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
      category: category,
      totalQuestions: questionsForQuiz.length,
      totalMarks: questionsForQuiz.reduce((sum, q) => sum + (q.marks || 1), 0)
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
    
    if (user.submittedAt) {
      return res.status(400).json({
        success: false,
        message: 'Quiz already submitted'
      });
    }
    
    // Calculate score
    let score = 0;
    let totalMarks = 0;
    
    for (const answer of answers) {
      const question = await Question.findById(answer.questionId);
      if (question) {
        totalMarks += question.marks || 1;
        
        const correctOption = question.options.find(opt => opt.isCorrect);
        if (correctOption && correctOption.text === answer.selectedOption) {
          score += question.marks || 1;
        }
      }
    }
    
    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    
    const config = await Config.findOne();
    const passingPercentage = config ? config.passingPercentage : 40;
    const passed = percentage >= passingPercentage;
    
    user.score = score;
    user.marksObtained = score;
    user.totalMarks = totalMarks;
    user.percentage = parseFloat(percentage.toFixed(2));
    user.passed = passed;
    user.submittedAt = new Date();
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      result: {
        name: user.name,
        rollNumber: user.rollNumber,
        category: user.category,
        score: score,
        totalMarks: totalMarks,
        percentage: user.percentage,
        passed: passed,
        submittedAt: user.submittedAt,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit quiz'
    });
  }
});

// ==================== ADMIN ROUTES ====================

// Get All Questions (Admin)
app.get('/api/admin/questions', async (req, res) => {
  try {
    const questions = await Question.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      questions,
      count: questions.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch questions'
    });
  }
});

// Add Question (Admin)
app.post('/api/admin/questions', async (req, res) => {
  try {
    const { category, questionText, options, marks, difficulty } = req.body;
    
    if (!category || !questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide category, question text, and at least 2 options'
      });
    }
    
    const hasCorrectOption = options.some(opt => opt.isCorrect);
    if (!hasCorrectOption) {
      return res.status(400).json({
        success: false,
        message: 'At least one option must be marked as correct'
      });
    }
    
    const question = new Question({
      category: category.toLowerCase(),
      questionText,
      options,
      marks: marks || 1,
      difficulty: difficulty || 'medium'
    });
    
    await question.save();
    
    res.status(201).json({
      success: true,
      message: 'Question added successfully',
      question
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add question'
    });
  }
});

// Delete Question (Admin)
app.delete('/api/admin/questions/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete question'
    });
  }
});

// Delete All Questions (Admin)
app.delete('/api/admin/questions', async (req, res) => {
  try {
    const { confirm } = req.query;
    
    if (confirm !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Please confirm by adding ?confirm=true to the URL'
      });
    }
    
    const result = await Question.deleteMany({});
    
    res.json({
      success: true,
      message: `All questions (${result.deletedCount}) deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete all questions'
    });
  }
});

// Get All Results (Admin)
app.get('/api/admin/results', async (req, res) => {
  try {
    const users = await User.find().sort({ submittedAt: -1 });
    res.json({
      success: true,
      results: users,
      count: users.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch results'
    });
  }
});

// Delete Result (Admin)
app.delete('/api/admin/results/:id', async (req, res) => {
  try {
    const result = await User.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Result deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete result'
    });
  }
});

// Delete All Results (Admin)
app.delete('/api/admin/results', async (req, res) => {
  try {
    const { confirm } = req.query;
    
    if (confirm !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Please confirm by adding ?confirm=true to the URL'
      });
    }
    
    const result = await User.deleteMany({});
    
    res.json({
      success: true,
      message: `All results (${result.deletedCount}) deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete all results'
    });
  }
});

// Get Dashboard Stats
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const totalStudents = await User.countDocuments();
    const totalQuestions = await Question.countDocuments();
    const users = await User.find();
    
    const passedStudents = users.filter(user => user.passed).length;
    const totalPercentage = users.reduce((sum, user) => sum + (user.percentage || 0), 0);
    const averageScore = totalStudents > 0 ? (totalPercentage / totalStudents).toFixed(2) : 0;
    const passRate = totalStudents > 0 ? ((passedStudents / totalStudents) * 100).toFixed(2) : 0;
    
    const categories = ['html', 'css', 'javascript', 'react', 'mern'];
    const categoryStats = [];
    
    for (const category of categories) {
      const questionsInCategory = await Question.countDocuments({ category });
      const attemptsInCategory = await User.countDocuments({ category });
      categoryStats.push({
        category,
        questions: questionsInCategory,
        attempts: attemptsInCategory
      });
    }
    
    res.json({
      success: true,
      stats: {
        totalStudents,
        totalQuestions,
        totalAttempts: totalStudents,
        averageScore: parseFloat(averageScore),
        passRate: parseFloat(passRate),
        todayAttempts: 0,
        passedStudents,
        failedStudents: totalStudents - passedStudents
      },
      categoryStats
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get dashboard stats'
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Shamsi Institute Quiz System API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      admin: {
        login: '/api/admin/login',
        dashboard: '/api/admin/dashboard',
        questions: '/api/admin/questions',
        results: '/api/admin/results'
      },
      quiz: {
        categories: '/api/categories',
        register: '/api/auth/register',
        questions: '/api/quiz/questions/:category',
        submit: '/api/quiz/submit'
      },
      config: '/api/config'
    }
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  🚀 Server running on http://localhost:${PORT}
  📡 API Base URL: http://localhost:${PORT}/api
  🔗 Health Check: http://localhost:${PORT}/api/health
  👨‍💼 Admin Login: admin / admin123
  📊 MongoDB Status: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}
  `);
});

module.exports = app;