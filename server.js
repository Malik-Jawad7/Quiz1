const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// ==================== CONFIGURATION ====================
const JWT_SECRET = process.env.JWT_SECRET || 'shamsi_secret_2024';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority&appName=Cluster0';

console.log('🚀 Shamsi Institute Quiz System API');
console.log('📡 MongoDB URI:', MONGODB_URI ? 'Configured' : 'Not Configured');

// ==================== CORS ====================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());

// ==================== MONGODB CONNECTION ====================
let isDBConnected = false;

const connectDB = async () => {
  if (isDBConnected) return true;
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 5,
    });
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log('📊 Database:', mongoose.connection.db?.databaseName || 'quiz_system');
    isDBConnected = true;
    
    // Initialize database
    await initializeDatabase();
    
    return true;
    
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    isDBConnected = false;
    return false;
  }
};

// Initialize database with default data
async function initializeDatabase() {
  try {
    // Check if admin exists, if not create default admin
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword,
        role: 'superadmin'
      });
      console.log('✅ Default admin created: admin/admin123');
    }
    
    // Check if questions exist, if not add sample questions
    const questionCount = await Question.countDocuments();
    if (questionCount === 0) {
      // Add sample HTML questions
      await Question.create([
        {
          category: 'html',
          questionText: 'HTML ka full form kya hai?',
          options: [
            { text: 'Hyper Text Markup Language', isCorrect: true },
            { text: 'High Text Machine Language', isCorrect: false },
            { text: 'Hyper Tabular Markup Language', isCorrect: false },
            { text: 'None of these', isCorrect: false }
          ],
          marks: 1
        },
        {
          category: 'html',
          questionText: 'HTML mein image insert karne ke liye kaun sa tag use hota hai?',
          options: [
            { text: '<img>', isCorrect: true },
            { text: '<picture>', isCorrect: false },
            { text: '<image>', isCorrect: false },
            { text: '<src>', isCorrect: false }
          ],
          marks: 1
        },
        {
          category: 'html',
          questionText: 'Line break ke liye kaun sa tag use hota hai?',
          options: [
            { text: '<br>', isCorrect: true },
            { text: '<lb>', isCorrect: false },
            { text: '<break>', isCorrect: false },
            { text: '<newline>', isCorrect: false }
          ],
          marks: 1
        },
        {
          category: 'html',
          questionText: 'HTML file ka extension kya hota hai?',
          options: [
            { text: '.html', isCorrect: true },
            { text: '.htm', isCorrect: false },
            { text: '.hml', isCorrect: false },
            { text: '.htl', isCorrect: false }
          ],
          marks: 1
        },
        {
          category: 'html',
          questionText: 'Link create karne ke liye kaun sa tag use hota hai?',
          options: [
            { text: '<a>', isCorrect: true },
            { text: '<link>', isCorrect: false },
            { text: '<href>', isCorrect: false },
            { text: '<url>', isCorrect: false }
          ],
          marks: 1
        },
        {
          category: 'html',
          questionText: 'Table banane ke liye kaun sa tag use hota hai?',
          options: [
            { text: '<table>', isCorrect: true },
            { text: '<tab>', isCorrect: false },
            { text: '<tr>', isCorrect: false },
            { text: '<grid>', isCorrect: false }
          ],
          marks: 1
        },
        {
          category: 'html',
          questionText: 'Sabse badi heading ke liye kaun sa tag use hota hai?',
          options: [
            { text: '<h1>', isCorrect: true },
            { text: '<h6>', isCorrect: false },
            { text: '<heading>', isCorrect: false },
            { text: '<head>', isCorrect: false }
          ],
          marks: 1
        },
        {
          category: 'html',
          questionText: 'Ordered list ke liye kaun sa tag use hota hai?',
          options: [
            { text: '<ol>', isCorrect: true },
            { text: '<ul>', isCorrect: false },
            { text: '<list>', isCorrect: false },
            { text: '<li>', isCorrect: false }
          ],
          marks: 1
        },
        {
          category: 'html',
          questionText: 'Paragraph ke liye kaun sa tag use hota hai?',
          options: [
            { text: '<p>', isCorrect: true },
            { text: '<para>', isCorrect: false },
            { text: '<pg>', isCorrect: false },
            { text: '<paragraph>', isCorrect: false }
          ],
          marks: 1
        },
        {
          category: 'html',
          questionText: 'HTML mein background color set karne ke liye kaun sa attribute use hota hai?',
          options: [
            { text: 'bgcolor', isCorrect: true },
            { text: 'background', isCorrect: false },
            { text: 'color', isCorrect: false },
            { text: 'bg', isCorrect: false }
          ],
          marks: 1
        }
      ]);
      console.log('✅ 10 sample HTML questions added');
    }
    
    console.log('📊 Database initialization complete');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
}

// ==================== DATABASE SCHEMAS ====================
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNumber: { type: String, required: true },
  category: { type: String, required: true },
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const registrationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNumber: { type: String, required: true },
  category: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now }
}, { timestamps: true });

const questionSchema = new mongoose.Schema({
  category: { type: String, required: true },
  questionText: { type: String, required: true },
  options: [{
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false }
  }],
  marks: { type: Number, default: 1 },
  difficulty: { type: String, default: 'medium' }
}, { timestamps: true });

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' }
}, { timestamps: true });

// Create models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Registration = mongoose.models.Registration || mongoose.model('Registration', registrationSchema);
const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

// ==================== MIDDLEWARE ====================
const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
    
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// ==================== ROUTES ====================

// Root Route
app.get('/', async (req, res) => {
  await connectDB();
  
  res.json({
    success: true,
    message: '🎓 Shamsi Institute Quiz System API',
    version: '3.0.0',
    database: isDBConnected ? 'Connected ✅' : 'Disconnected ❌',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /api/health',
      dbTest: 'GET /api/db-test',
      adminLogin: 'POST /admin/login',
      register: 'POST /api/register',
      getQuestions: 'GET /api/questions/:category',
      submitQuiz: 'POST /api/submit',
      adminDashboard: 'GET /api/admin/dashboard (requires token)',
      adminQuestions: 'GET/POST /api/admin/questions (requires token)',
      adminResults: 'GET /api/admin/results (requires token)',
      config: 'GET /api/config'
    }
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    database: isDBConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Database Test
app.get('/api/db-test', async (req, res) => {
  try {
    await connectDB();
    
    if (isDBConnected) {
      const adminCount = await Admin.countDocuments();
      const questionCount = await Question.countDocuments();
      const userCount = await User.countDocuments();
      const registrationCount = await Registration.countDocuments();
      
      res.json({
        success: true,
        message: '🎉 Database is working!',
        stats: {
          admins: adminCount,
          questions: questionCount,
          users: userCount,
          registrations: registrationCount
        },
        database: mongoose.connection.db?.databaseName,
        host: mongoose.connection.host
      });
    } else {
      res.json({
        success: false,
        message: 'Database not connected'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Admin Login
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log(`🔐 Login attempt for: ${username}`);
    
    // Always work - hardcoded admin
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { username: 'admin', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: { username: 'admin', role: 'admin' }
      });
    }
    
    // Try database if connected
    await connectDB();
    if (isDBConnected) {
      const admin = await Admin.findOne({ username });
      
      if (admin && await bcrypt.compare(password, admin.password)) {
        const token = jwt.sign(
          { username: admin.username, role: admin.role },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        return res.json({
          success: true,
          message: 'Login successful',
          token,
          user: { username: admin.username, role: admin.role }
        });
      }
    }
    
    res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Reset Admin
app.post('/admin/reset', async (req, res) => {
  try {
    await connectDB();
    
    // Delete existing admin
    await Admin.deleteMany({ username: 'admin' });
    
    // Create new admin with default credentials
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await Admin.create({
      username: 'admin',
      password: hashedPassword,
      role: 'superadmin'
    });
    
    res.json({
      success: true,
      message: '✅ Admin reset successfully! Default credentials: admin/admin123'
    });
    
  } catch (error) {
    console.error('Reset admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset admin'
    });
  }
});

// Student Registration
app.post('/api/register', async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, roll number, and category'
      });
    }
    
    await connectDB();
    
    const formattedRollNumber = `SI-${rollNumber}`;
    
    // Check if already registered
    const existingRegistration = await Registration.findOne({ rollNumber: formattedRollNumber });
    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'This roll number is already registered'
      });
    }
    
    // Check if category has questions
    const questionCount = await Question.countDocuments({ category });
    if (questionCount === 0) {
      return res.status(400).json({
        success: false,
        message: `No questions available for ${category} category. Please contact administrator.`
      });
    }
    
    // Register student
    const registration = await Registration.create({
      name,
      rollNumber: formattedRollNumber,
      category: category.toLowerCase()
    });
    
    res.json({
      success: true,
      message: 'Registration successful!',
      data: {
        name: registration.name,
        rollNumber: registration.rollNumber,
        category: registration.category,
        registeredAt: registration.registeredAt
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Get Questions for Quiz
app.get('/api/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    await connectDB();
    
    // Get questions
    const questions = await Question.find({ 
      category: category.toLowerCase() 
    }).limit(50);
    
    if (questions.length === 0) {
      return res.json({
        success: true,
        questions: [],
        message: `No questions available for ${category} category`,
        count: 0
      });
    }
    
    // Hide correct answers
    const safeQuestions = questions.map(q => ({
      id: q._id,
      question: q.questionText,
      options: q.options.map(opt => ({ text: opt.text })),
      marks: q.marks || 1,
      difficulty: q.difficulty || 'medium'
    }));
    
    res.json({
      success: true,
      questions: safeQuestions,
      count: safeQuestions.length,
      config: {
        time: 30,
        passingPercentage: 40,
        totalQuestions: 50
      }
    });
    
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading questions'
    });
  }
});

// Submit Quiz
app.post('/api/submit', async (req, res) => {
  try {
    const { name, rollNumber, category, score, percentage } = req.body;
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'Required information missing'
      });
    }
    
    await connectDB();
    
    // Save result
    const result = await User.create({
      name,
      rollNumber: rollNumber.startsWith('SI-') ? rollNumber : `SI-${rollNumber}`,
      category: category.toLowerCase(),
      score: score || 0,
      percentage: percentage || 0,
      passed: (percentage || 0) >= 40
    });
    
    res.json({
      success: true,
      message: 'Quiz submitted successfully!',
      result: {
        name: result.name,
        rollNumber: result.rollNumber,
        score: result.score,
        percentage: result.percentage,
        passed: result.passed,
        submittedAt: result.submittedAt
      }
    });
    
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit quiz'
    });
  }
});

// ==================== ADMIN ROUTES ====================

// Admin Dashboard
app.get('/api/admin/dashboard', verifyToken, async (req, res) => {
  try {
    await connectDB();
    
    if (!isDBConnected) {
      return res.json({
        success: false,
        message: 'Database not connected',
        stats: {}
      });
    }
    
    const [totalUsers, totalQuestions, totalRegistrations, recentResults] = await Promise.all([
      User.countDocuments(),
      Question.countDocuments(),
      Registration.countDocuments(),
      User.find().sort({ submittedAt: -1 }).limit(10)
    ]);
    
    // Calculate pass rate
    const passedUsers = await User.countDocuments({ passed: true });
    const passRate = totalUsers > 0 ? (passedUsers / totalUsers * 100).toFixed(2) : 0;
    
    // Get category-wise question count
    const categories = await Question.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalMarks: { $sum: '$marks' }
        }
      }
    ]);
    
    res.json({
      success: true,
      stats: {
        totalStudents: totalUsers,
        totalQuestions: totalQuestions,
        totalRegistrations: totalRegistrations,
        passRate: parseFloat(passRate),
        passedStudents: passedUsers,
        categories: categories,
        recentResults: recentResults
      }
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading dashboard'
    });
  }
});

// Get All Questions (Admin)
app.get('/api/admin/questions', verifyToken, async (req, res) => {
  try {
    await connectDB();
    
    const { category, search, page = 1, limit = 100 } = req.query;
    
    let query = {};
    
    if (category && category !== 'all') {
      query.category = category.toLowerCase();
    }
    
    if (search) {
      query.$or = [
        { questionText: { $regex: search, $options: 'i' } },
        { 'options.text': { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [questions, total] = await Promise.all([
      Question.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Question.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      questions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
    
  } catch (error) {
    console.error('Get all questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions'
    });
  }
});

// Add Question (Admin)
app.post('/api/admin/questions', verifyToken, async (req, res) => {
  try {
    await connectDB();
    
    const { category, questionText, options, marks, difficulty } = req.body;
    
    if (!category || !questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide complete question data'
      });
    }
    
    // Validate that exactly one option is correct
    const correctOptions = options.filter(opt => opt.isCorrect);
    if (correctOptions.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Please select exactly one correct option'
      });
    }
    
    const question = await Question.create({
      category: category.toLowerCase(),
      questionText,
      options: options.map(opt => ({
        text: opt.text,
        isCorrect: Boolean(opt.isCorrect)
      })),
      marks: marks || 1,
      difficulty: difficulty || 'medium'
    });
    
    res.json({
      success: true,
      message: '✅ Question added successfully!',
      question
    });
    
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding question'
    });
  }
});

// Delete Question (Admin)
app.delete('/api/admin/questions/:id', verifyToken, async (req, res) => {
  try {
    await connectDB();
    
    const { id } = req.params;
    
    const question = await Question.findByIdAndDelete(id);
    
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    
    res.json({
      success: true,
      message: '✅ Question deleted successfully!'
    });
    
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting question'
    });
  }
});

// Get All Results (Admin)
app.get('/api/admin/results', verifyToken, async (req, res) => {
  try {
    await connectDB();
    
    const { search, category, page = 1, limit = 50 } = req.query;
    
    let query = {};
    
    if (category && category !== 'all') {
      query.category = category.toLowerCase();
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [results, total] = await Promise.all([
      User.find(query)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      results,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
    
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching results'
    });
  }
});

// Delete Result (Admin)
app.delete('/api/admin/results/:id', verifyToken, async (req, res) => {
  try {
    await connectDB();
    
    const { id } = req.params;
    
    const result = await User.findByIdAndDelete(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }
    
    res.json({
      success: true,
      message: '✅ Result deleted successfully!'
    });
    
  } catch (error) {
    console.error('Delete result error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting result'
    });
  }
});

// Delete All Results (Admin)
app.delete('/api/admin/results', verifyToken, async (req, res) => {
  try {
    await connectDB();
    
    const count = await User.countDocuments();
    await User.deleteMany({});
    
    res.json({
      success: true,
      message: `✅ All ${count} results deleted successfully!`
    });
    
  } catch (error) {
    console.error('Delete all results error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting all results'
    });
  }
});

// Get Config
app.get('/api/config', async (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      },
      message: 'Default configuration'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error loading config'
    });
  }
});

// Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    await connectDB();
    
    if (!isDBConnected) {
      // Return default categories if DB not connected
      return res.json({
        success: true,
        categories: [
          { value: 'html', label: 'HTML', questionCount: 10 },
          { value: 'css', label: 'CSS', questionCount: 0 },
          { value: 'javascript', label: 'JavaScript', questionCount: 0 },
          { value: 'react', label: 'React.js', questionCount: 0 },
          { value: 'node', label: 'Node.js', questionCount: 0 }
        ]
      });
    }
    
    // Get unique categories from questions
    const categories = await Question.aggregate([
      {
        $group: {
          _id: '$category',
          questionCount: { $sum: 1 }
        }
      },
      {
        $project: {
          value: '$_id',
          label: { $toUpper: '$_id' },
          questionCount: 1,
          _id: 0
        }
      }
    ]);
    
    res.json({
      success: true,
      categories
    });
    
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories'
    });
  }
});

// Get Result Details
app.get('/api/admin/results/:id', verifyToken, async (req, res) => {
  try {
    await connectDB();
    
    const { id } = req.params;
    
    const result = await User.findById(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }
    
    res.json({
      success: true,
      result
    });
    
  } catch (error) {
    console.error('Get result details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching result details'
    });
  }
});

// Update Config
app.post('/api/config', verifyToken, async (req, res) => {
  try {
    const { quizTime, passingPercentage, totalQuestions } = req.body;
    
    res.json({
      success: true,
      message: 'Configuration updated',
      config: {
        quizTime: quizTime || 30,
        passingPercentage: passingPercentage || 40,
        totalQuestions: totalQuestions || 50
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating config'
    });
  }
});

// Test Route
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// ==================== ERROR HANDLERS ====================

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== VERCEL EXPORT ====================
module.exports = app;

// Local development
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 MongoDB: ${isDBConnected ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`🔗 API: http://localhost:${PORT}`);
  });
}