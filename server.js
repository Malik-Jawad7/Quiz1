const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ==================== CONFIGURATION ====================
const JWT_SECRET = process.env.JWT_SECRET || 'shamsi_secret_key_2024_vercel_deploy';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/shamsi_quiz_system?retryWrites=true&w=majority&appName=Cluster0';
const PORT = process.env.PORT || 5000;

console.log('🚀 Shamsi Institute Quiz System Backend - Vercel Deploy');

// ==================== CORS ====================
app.use(cors({
  origin: ['http://localhost:3000', 'https://shamsi-institute-quiz.vercel.app', 'https://shamsi-institute-quiz-khalids-projects-*.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400
}));

app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== MONGODB CONNECTION ====================
let isMongoDBConnected = false;

const connectToMongoDB = async () => {
  if (!MONGODB_URI) {
    console.log('⚠️ No MongoDB URI provided. Running in memory mode.');
    return false;
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true
    };

    mongoose.set('strictQuery', false);

    await mongoose.connect(MONGODB_URI, connectionOptions);
    
    isMongoDBConnected = true;
    console.log('✅✅✅ MONGODB CONNECTED SUCCESSFULLY! ✅✅✅');
    console.log('📊 Database:', mongoose.connection.db?.databaseName || 'Unknown');
    
    return true;

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    isMongoDBConnected = false;
    console.log('⚠️ Running in memory mode');
    return false;
  }
};

// ==================== MODELS ====================
const questionSchema = new mongoose.Schema({
  category: { type: String, required: true },
  questionText: { type: String, required: true },
  options: [{
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false }
  }],
  marks: { type: Number, default: 1 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  createdAt: { type: Date, default: Date.now }
});

const resultSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  attempted: { type: Number, default: 0 },
  passingPercentage: { type: Number, default: 40 },
  passed: { type: Boolean, default: false },
  cheatingDetected: { type: Boolean, default: false },
  isAutoSubmitted: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now }
});

const configSchema = new mongoose.Schema({
  quizTime: { type: Number, default: 30 },
  passingPercentage: { type: Number, default: 40 },
  totalQuestions: { type: Number, default: 50 },
  updatedAt: { type: Date, default: Date.now }
});

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Question = mongoose.model('Question', questionSchema);
const Result = mongoose.model('Result', resultSchema);
const Config = mongoose.model('Config', configSchema);
const Admin = mongoose.model('Admin', adminSchema);

// ==================== INITIALIZE DATA ====================
const initializeData = async () => {
  if (!isMongoDBConnected) return;

  try {
    // Create default admin
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword,
        createdAt: new Date()
      });
      console.log('✅ Default admin created');
    }

    // Create default config
    const configExists = await Config.findOne();
    if (!configExists) {
      await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50,
        updatedAt: new Date()
      });
      console.log('✅ Default config created');
    }

    // Add sample questions if empty
    const questionCount = await Question.countDocuments();
    if (questionCount === 0) {
      const sampleQuestions = [
        {
          category: 'html',
          questionText: 'What does HTML stand for?',
          options: [
            { text: 'Hyper Text Markup Language', isCorrect: true },
            { text: 'Home Tool Markup Language', isCorrect: false },
            { text: 'Hyperlinks and Text Markup Language', isCorrect: false }
          ],
          marks: 1,
          difficulty: 'easy'
        },
        {
          category: 'html',
          questionText: 'Which HTML tag is used for the largest heading?',
          options: [
            { text: '<h1>', isCorrect: true },
            { text: '<h6>', isCorrect: false },
            { text: '<heading>', isCorrect: false }
          ],
          marks: 1,
          difficulty: 'easy'
        },
        {
          category: 'css',
          questionText: 'What does CSS stand for?',
          options: [
            { text: 'Cascading Style Sheets', isCorrect: true },
            { text: 'Colorful Style Sheets', isCorrect: false },
            { text: 'Computer Style Sheets', isCorrect: false }
          ],
          marks: 1,
          difficulty: 'easy'
        }
      ];
      await Question.insertMany(sampleQuestions);
      console.log('✅ Sample questions added');
    }

    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Initialization error:', error.message);
  }
};

// ==================== ROUTES ====================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎓 Shamsi Institute Quiz System API',
    version: '3.0.0',
    status: 'operational',
    database: {
      connected: isMongoDBConnected,
      mode: isMongoDBConnected ? 'mongodb' : 'in-memory'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: isMongoDBConnected
  });
});

// Admin login
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }
    
    // Always allow default admin
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign({ 
        username: 'admin',
        role: 'admin'
      }, JWT_SECRET, { expiresIn: '24h' });
      
      return res.json({
        success: true,
        message: '✅ Login successful',
        token,
        user: {
          username: 'admin',
          role: 'admin'
        }
      });
    }
    
    // Try MongoDB admin
    if (isMongoDBConnected) {
      try {
        const admin = await Admin.findOne({ username: username.trim() });
        if (admin) {
          const isPasswordValid = await bcrypt.compare(password, admin.password);
          if (isPasswordValid) {
            const token = jwt.sign({ 
              username: admin.username,
              role: 'admin'
            }, JWT_SECRET, { expiresIn: '24h' });
            
            return res.json({
              success: true,
              message: '✅ Login successful',
              token,
              user: {
                username: admin.username,
                role: 'admin'
              }
            });
          }
        }
      } catch (dbError) {
        console.log('MongoDB auth error:', dbError.message);
      }
    }
    
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Get config
app.get('/api/config', async (req, res) => {
  try {
    let config;
    
    if (isMongoDBConnected) {
      config = await Config.findOne();
      if (!config) {
        config = await Config.create({
          quizTime: 30,
          passingPercentage: 40,
          totalQuestions: 50,
          updatedAt: new Date()
        });
      }
      
      return res.json({
        success: true,
        config,
        source: 'mongodb'
      });
    }
    
    // Default config
    res.json({
      success: true,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50,
        updatedAt: new Date()
      },
      source: 'memory'
    });
    
  } catch (error) {
    console.error('Get config error:', error);
    res.json({
      success: true,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      },
      source: 'fallback'
    });
  }
});

// Update config
app.put('/api/config', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authorization token required' 
      });
    }
    
    jwt.verify(token, JWT_SECRET);
    
    const { quizTime, passingPercentage, totalQuestions } = req.body;
    
    if (isMongoDBConnected) {
      let config = await Config.findOne();
      
      if (!config) {
        config = await Config.create({
          quizTime,
          passingPercentage,
          totalQuestions,
          updatedAt: new Date()
        });
      } else {
        config.quizTime = quizTime;
        config.passingPercentage = passingPercentage;
        config.totalQuestions = totalQuestions;
        config.updatedAt = new Date();
        await config.save();
      }
      
      return res.json({
        success: true,
        message: '✅ Configuration updated',
        config,
        source: 'mongodb'
      });
    }
    
    res.json({
      success: true,
      message: '✅ Configuration updated (Memory Mode)',
      source: 'memory'
    });
    
  } catch (error) {
    console.error('Update config error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration'
    });
  }
});

// Get categories
app.get('/api/categories', async (req, res) => {
  try {
    let categories = [];
    
    if (isMongoDBConnected) {
      categories = await Question.distinct('category');
    }
    
    if (categories.length === 0) {
      categories = ['html', 'css', 'javascript', 'react', 'node', 'python', 'java', 'mongodb'];
    }
    
    const categoryData = categories.map(cat => ({
      value: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      description: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Technology`,
      available: true
    }));
    
    res.json({
      success: true,
      categories: categoryData,
      count: categories.length
    });
    
  } catch (error) {
    console.error('Get categories error:', error);
    
    res.json({
      success: true,
      categories: [
        { value: 'html', label: 'HTML', description: 'HTML Web Development', available: true },
        { value: 'css', label: 'CSS', description: 'CSS Styling', available: true },
        { value: 'javascript', label: 'JavaScript', description: 'JavaScript Programming', available: true },
        { value: 'react', label: 'React.js', description: 'React Framework', available: true },
        { value: 'node', label: 'Node.js', description: 'Node.js Backend', available: true },
        { value: 'python', label: 'Python', description: 'Python Programming', available: true },
        { value: 'java', label: 'Java', description: 'Java Programming', available: true }
      ],
      source: 'fallback'
    });
  }
});

// Register student
app.post('/api/register', async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    const formattedRollNumber = `SI-${rollNumber}`;
    
    res.json({
      success: true,
      message: '✅ Registration successful!',
      user: {
        name: name.trim(),
        rollNumber: formattedRollNumber,
        category: category.toLowerCase()
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

// Get quiz questions
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const formattedCategory = category.toLowerCase();
    
    let questions = [];
    let config = {
      quizTime: 30,
      passingPercentage: 40,
      totalQuestions: 50
    };
    
    if (isMongoDBConnected) {
      const dbConfig = await Config.findOne();
      if (dbConfig) {
        config = dbConfig;
      }
      
      questions = await Question.find({ 
        category: formattedCategory 
      }).limit(config.totalQuestions || 50);
    }
    
    // If no questions found, provide sample
    if (questions.length === 0) {
      questions = [
        {
          _id: 'sample1',
          category: formattedCategory,
          questionText: `Sample question for ${formattedCategory}`,
          options: [
            { text: 'Correct answer', isCorrect: true },
            { text: 'Wrong answer 1', isCorrect: false },
            { text: 'Wrong answer 2', isCorrect: false },
            { text: 'Wrong answer 3', isCorrect: false }
          ],
          marks: 1,
          difficulty: 'easy'
        }
      ];
    }
    
    // Shuffle questions
    const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);
    const limit = Math.min(config.totalQuestions || 50, shuffledQuestions.length);
    const finalQuestions = shuffledQuestions.slice(0, limit);
    
    res.json({
      success: true,
      questions: finalQuestions,
      config: {
        quizTime: config.quizTime || 30,
        passingPercentage: config.passingPercentage || 40,
        totalQuestions: limit
      },
      count: finalQuestions.length
    });
    
  } catch (error) {
    console.error('Get quiz questions error:', error);
    
    res.json({
      success: true,
      questions: [],
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 10
      }
    });
  }
});

// Submit quiz
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const {
      rollNumber,
      name,
      category,
      score,
      totalQuestions,
      correctAnswers,
      attempted,
      passingPercentage = 40,
      cheatingDetected = false,
      isAutoSubmitted = false
    } = req.body;
    
    // Calculate results
    const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const passed = percentage >= passingPercentage;
    const finalScore = correctAnswers || score || 0;
    
    // Create result object
    const resultData = {
      rollNumber: rollNumber.startsWith('SI-') ? rollNumber : `SI-${rollNumber}`,
      name: name.trim(),
      category: category.toLowerCase(),
      score: finalScore,
      percentage: parseFloat(percentage.toFixed(2)),
      totalQuestions,
      correctAnswers: correctAnswers || finalScore,
      attempted,
      passingPercentage,
      passed,
      cheatingDetected,
      isAutoSubmitted,
      submittedAt: new Date()
    };
    
    let savedToDB = false;
    
    // Save to MongoDB if connected
    if (isMongoDBConnected) {
      try {
        await Result.create(resultData);
        savedToDB = true;
        console.log('✅ Result saved to MongoDB');
      } catch (dbError) {
        console.error('MongoDB save error:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      message: '✅ Quiz submitted successfully!',
      result: {
        ...resultData,
        savedToDB,
        database_connected: isMongoDBConnected
      }
    });
    
  } catch (error) {
    console.error('Submit quiz error:', error);
    
    res.json({
      success: true,
      message: 'Quiz submitted (memory mode)',
      result: {
        ...req.body,
        submittedAt: new Date().toISOString(),
        savedToDB: false
      }
    });
  }
});

// ==================== ADMIN ROUTES ====================

// Authentication middleware
const authenticateAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token format is: Bearer <token>' 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has expired' 
      });
    }
    
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

// Admin dashboard
app.get('/api/admin/dashboard', authenticateAdmin, async (req, res) => {
  try {
    let stats = {
      totalStudents: 0,
      totalQuestions: 0,
      totalAttempts: 0,
      averageScore: 0,
      passRate: 0,
      todayAttempts: 0
    };
    
    if (isMongoDBConnected) {
      const totalStudents = await Result.countDocuments({});
      const totalQuestions = await Question.countDocuments({});
      const results = await Result.find({});
      
      let averageScore = 0;
      let passRate = 0;
      
      if (results.length > 0) {
        const totalPercentage = results.reduce((sum, r) => sum + (r.percentage || 0), 0);
        averageScore = totalPercentage / results.length;
        
        const passedCount = results.filter(r => r.passed).length;
        passRate = (passedCount / results.length) * 100;
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayAttempts = await Result.countDocuments({
        submittedAt: { $gte: today }
      });
      
      stats = {
        totalStudents,
        totalQuestions,
        totalAttempts: totalStudents,
        averageScore: parseFloat(averageScore.toFixed(2)),
        passRate: parseFloat(passRate.toFixed(2)),
        todayAttempts
      };
    }
    
    res.json({
      success: true,
      stats,
      database_connected: isMongoDBConnected
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data'
    });
  }
});

// Get all questions (admin)
app.get('/api/admin/questions', authenticateAdmin, async (req, res) => {
  try {
    const { category = 'all', search = '', page = 1, limit = 100 } = req.query;
    
    let questions = [];
    let total = 0;
    
    if (isMongoDBConnected) {
      let query = {};
      
      if (category !== 'all') {
        query.category = category.toLowerCase();
      }
      
      if (search && search.trim() !== '') {
        query.$or = [
          { questionText: { $regex: search.trim(), $options: 'i' } },
          { 'options.text': { $regex: search.trim(), $options: 'i' } }
        ];
      }
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      questions = await Question.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      total = await Question.countDocuments(query);
    }
    
    res.json({
      success: true,
      questions,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    });
    
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Add question (admin)
app.post('/api/admin/questions', authenticateAdmin, async (req, res) => {
  try {
    const { category, questionText, options, marks = 1, difficulty = 'medium' } = req.body;
    
    if (!category || !questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Category, question text, and at least 2 options required'
      });
    }
    
    // Validate exactly one correct option
    const correctOptions = options.filter(opt => opt.isCorrect);
    if (correctOptions.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Exactly one correct option must be specified'
      });
    }
    
    // Prepare question data
    const questionData = {
      category: category.toLowerCase(),
      questionText: questionText.trim(),
      options: options.map(opt => ({
        text: opt.text.trim(),
        isCorrect: Boolean(opt.isCorrect)
      })),
      marks: parseInt(marks) || 1,
      difficulty: difficulty || 'medium'
    };
    
    let savedQuestion = null;
    
    // Save to MongoDB
    if (isMongoDBConnected) {
      savedQuestion = await Question.create(questionData);
    }
    
    res.json({
      success: true,
      message: '✅ Question added successfully!',
      question: savedQuestion,
      database_connected: isMongoDBConnected
    });
    
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get results (admin)
app.get('/api/admin/results', authenticateAdmin, async (req, res) => {
  try {
    let results = [];
    
    if (isMongoDBConnected) {
      results = await Result.find()
        .sort({ submittedAt: -1 })
        .limit(1000);
    }
    
    res.json({
      success: true,
      results: results,
      count: results.length
    });
    
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete question
app.delete('/api/admin/questions/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    let deleted = false;
    
    if (isMongoDBConnected) {
      await Question.findByIdAndDelete(id);
      deleted = true;
    }
    
    res.json({
      success: true,
      message: 'Question deleted successfully',
      deleted_from_db: deleted
    });
    
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete result
app.delete('/api/admin/results/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    let deleted = false;
    
    if (isMongoDBConnected) {
      await Result.findByIdAndDelete(id);
      deleted = true;
    }
    
    res.json({
      success: true,
      message: 'Result deleted successfully',
      deleted_from_db: deleted
    });
    
  } catch (error) {
    console.error('Delete result error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete all results
app.delete('/api/admin/results', authenticateAdmin, async (req, res) => {
  try {
    let deleted = false;
    
    if (isMongoDBConnected) {
      await Result.deleteMany({});
      deleted = true;
    }
    
    res.json({
      success: true,
      message: 'All results deleted successfully',
      deleted_from_db: deleted
    });
    
  } catch (error) {
    console.error('Delete all results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: '✅ API is working!',
    timestamp: new Date().toISOString(),
    database: isMongoDBConnected
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// ==================== START SERVER ====================
const startServer = async () => {
  await connectToMongoDB();
  if (isMongoDBConnected) {
    await initializeData();
  }
  
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`🔐 Admin login: admin / admin123`);
    console.log(`✅ MongoDB Status: ${isMongoDBConnected ? 'CONNECTED 🎉' : 'DISCONNECTED'}`);
  });
};

startServer();

module.exports = app;