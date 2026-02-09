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

console.log('🚀 Shamsi Institute Quiz System Backend');
console.log('📊 MongoDB URI:', MONGODB_URI ? 'Present' : 'Not found');
console.log('🔐 JWT Secret:', JWT_SECRET ? 'Present' : 'Not found');
console.log('🌍 NODE_ENV:', process.env.NODE_ENV);

// ==================== CORS ====================
app.use(cors({
  origin: '*',
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
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Use the exact MongoDB URI from your .env
    const mongoURI = 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority';
    console.log('🔗 Using MongoDB URI:', mongoURI.substring(0, 50) + '...');
    
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      w: 'majority'
    };

    mongoose.set('strictQuery', false);

    await mongoose.connect(mongoURI, connectionOptions);
    
    isMongoDBConnected = true;
    
    console.log('✅✅✅ MONGODB CONNECTED SUCCESSFULLY! ✅✅✅');
    console.log('📊 Database:', mongoose.connection.db?.databaseName || 'quiz_system');
    console.log('🏠 Host:', mongoose.connection.host);
    console.log('📈 Ready State:', mongoose.connection.readyState);
    
    return true;
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('🔍 Error details:', error);
    
    isMongoDBConnected = false;
    console.log('⚠️ Running in memory mode (questions and results will not persist)');
    return false;
  }
};

// ==================== DATABASE MODELS ====================
const questionSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  options: [{
    text: {
      type: String,
      required: true,
      trim: true
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  marks: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const resultSchema = new mongoose.Schema({
  rollNumber: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  score: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  attempted: {
    type: Number,
    default: 0
  },
  passingPercentage: {
    type: Number,
    default: 40
  },
  passed: {
    type: Boolean,
    default: false
  },
  cheatingDetected: {
    type: Boolean,
    default: false
  },
  isAutoSubmitted: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

const configSchema = new mongoose.Schema({
  quizTime: {
    type: Number,
    default: 30
  },
  passingPercentage: {
    type: Number,
    default: 40
  },
  totalQuestions: {
    type: Number,
    default: 50
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Question = mongoose.model('Question', questionSchema);
const Result = mongoose.model('Result', resultSchema);
const Config = mongoose.model('Config', configSchema);
const Admin = mongoose.model('Admin', adminSchema);

// ==================== INITIALIZE DATABASE ====================
const initializeDatabase = async () => {
  if (!isMongoDBConnected) {
    console.log('⚠️ Skipping database initialization (MongoDB not connected)');
    return;
  }

  try {
    console.log('📦 Initializing database...');
    
    // Create default admin
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword
      });
      console.log('✅ Default admin created (admin/admin123)');
    }
    
    // Create default config
    const configExists = await Config.findOne();
    if (!configExists) {
      await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      });
      console.log('✅ Default config created');
    }
    
    console.log('✅ Database initialization complete');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
};

// ==================== ROUTES ====================

// 1. Root Route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎓 Shamsi Institute Quiz System API',
    version: '1.0.0',
    status: 'operational',
    database: {
      connected: isMongoDBConnected,
      mode: isMongoDBConnected ? 'mongodb' : 'in-memory'
    },
    timestamp: new Date().toISOString()
  });
});

// 2. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    database: isMongoDBConnected,
    timestamp: new Date().toISOString()
  });
});

// 3. Admin Login
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
      const token = jwt.sign(
        { username: 'admin', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
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
    
    // Try MongoDB authentication
    if (isMongoDBConnected) {
      try {
        const admin = await Admin.findOne({ username: username.toLowerCase() });
        
        if (admin) {
          const isPasswordValid = await bcrypt.compare(password, admin.password);
          
          if (isPasswordValid) {
            const token = jwt.sign(
              { username: admin.username, role: 'admin' },
              JWT_SECRET,
              { expiresIn: '24h' }
            );
            
            return res.json({
              success: true,
              message: '✅ Login successful (MongoDB)',
              token,
              user: {
                username: admin.username,
                role: 'admin'
              }
            });
          }
        }
      } catch (error) {
        console.error('MongoDB auth error:', error.message);
      }
    }
    
    res.status(401).json({
      success: false,
      message: 'Invalid credentials. Use: admin / admin123'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// 4. Get Config
app.get('/api/config', async (req, res) => {
  try {
    let config;
    
    if (isMongoDBConnected) {
      config = await Config.findOne();
    }
    
    if (!config) {
      config = {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50,
        updatedAt: new Date()
      };
    }
    
    res.json({
      success: true,
      config,
      database: isMongoDBConnected
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
      database: false
    });
  }
});

// 5. Update Config
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
          totalQuestions
        });
      } else {
        config.quizTime = quizTime;
        config.passingPercentage = passingPercentage;
        config.totalQuestions = totalQuestions;
        config.updatedAt = new Date();
        await config.save();
      }
    }
    
    res.json({
      success: true,
      message: '✅ Configuration updated',
      database: isMongoDBConnected
    });
    
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration'
    });
  }
});

// 6. Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    let categories = [];
    
    if (isMongoDBConnected) {
      try {
        categories = await Question.distinct('category');
      } catch (error) {
        console.error('Categories error:', error.message);
      }
    }
    
    if (categories.length === 0) {
      categories = ['html', 'css', 'javascript', 'react', 'node', 'python', 'java'];
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
      database: isMongoDBConnected
    });
    
  } catch (error) {
    console.error('Get categories error:', error);
    res.json({
      success: true,
      categories: [
        { value: 'html', label: 'HTML', description: 'HTML Web Development', available: true },
        { value: 'css', label: 'CSS', description: 'CSS Styling', available: true },
        { value: 'javascript', label: 'JavaScript', description: 'JavaScript Programming', available: true }
      ],
      database: false
    });
  }
});

// 7. Register Student
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

// 8. Get Quiz Questions
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    let questions = [];
    let config = {
      quizTime: 30,
      passingPercentage: 40,
      totalQuestions: 50
    };
    
    if (isMongoDBConnected) {
      try {
        const dbConfig = await Config.findOne();
        if (dbConfig) {
          config = dbConfig;
        }
        
        questions = await Question.find({ 
          category: category.toLowerCase() 
        }).limit(config.totalQuestions || 50);
      } catch (error) {
        console.error('Questions error:', error.message);
      }
    }
    
    // If no questions, provide samples
    if (questions.length === 0) {
      questions = [
        {
          _id: 'sample_1',
          category: category.toLowerCase(),
          questionText: `What is ${category.toUpperCase()} used for?`,
          options: [
            { text: 'Web Development', isCorrect: true },
            { text: 'Cooking', isCorrect: false },
            { text: 'Medicine', isCorrect: false },
            { text: 'Agriculture', isCorrect: false }
          ],
          marks: 1,
          difficulty: 'easy'
        }
      ];
    }
    
    // Shuffle and limit
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
      database: isMongoDBConnected
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
      },
      database: false
    });
  }
});

// 9. Submit Quiz
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
      passingPercentage = 40
    } = req.body;
    
    const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const passed = percentage >= passingPercentage;
    
    const resultData = {
      rollNumber: rollNumber.startsWith('SI-') ? rollNumber : `SI-${rollNumber}`,
      name: name.trim(),
      category: category.toLowerCase(),
      score: score || 0,
      percentage: parseFloat(percentage.toFixed(2)),
      totalQuestions,
      correctAnswers: correctAnswers || score || 0,
      attempted,
      passingPercentage,
      passed
    };
    
    let savedToDB = false;
    
    if (isMongoDBConnected) {
      try {
        await Result.create(resultData);
        savedToDB = true;
      } catch (error) {
        console.error('Save result error:', error.message);
      }
    }
    
    res.json({
      success: true,
      message: '✅ Quiz submitted successfully!',
      result: resultData,
      savedToDB,
      database: isMongoDBConnected
    });
    
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.json({
      success: true,
      message: 'Quiz submitted',
      database: false
    });
  }
});

// ==================== ADMIN ROUTES ====================

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
    
    jwt.verify(token, JWT_SECRET);
    next();
    
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

// 10. Admin Dashboard
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
      try {
        const totalStudents = await Result.countDocuments();
        const totalQuestions = await Question.countDocuments();
        const results = await Result.find();
        
        if (results.length > 0) {
          const totalPercentage = results.reduce((sum, r) => sum + (r.percentage || 0), 0);
          stats.averageScore = totalPercentage / results.length;
          
          const passedCount = results.filter(r => r.passed).length;
          stats.passRate = (passedCount / results.length) * 100;
        }
        
        stats.totalStudents = totalStudents;
        stats.totalQuestions = totalQuestions;
        stats.totalAttempts = results.length;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        stats.todayAttempts = await Result.countDocuments({
          submittedAt: { $gte: today }
        });
      } catch (error) {
        console.error('Dashboard error:', error.message);
      }
    }
    
    res.json({
      success: true,
      stats,
      database: isMongoDBConnected
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data'
    });
  }
});

// 11. Get All Questions (Admin)
app.get('/api/admin/questions', authenticateAdmin, async (req, res) => {
  try {
    let questions = [];
    
    if (isMongoDBConnected) {
      questions = await Question.find().sort({ createdAt: -1 });
    }
    
    res.json({
      success: true,
      questions,
      database: isMongoDBConnected
    });
    
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// 12. Add Question (Admin)
app.post('/api/admin/questions', authenticateAdmin, async (req, res) => {
  try {
    const { category, questionText, options, marks = 1, difficulty = 'medium' } = req.body;
    
    if (!category || !questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Category, question text, and at least 2 options required'
      });
    }
    
    const correctOptions = options.filter(opt => opt.isCorrect);
    if (correctOptions.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Exactly one correct option must be specified'
      });
    }
    
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
    
    if (isMongoDBConnected) {
      savedQuestion = await Question.create(questionData);
    }
    
    res.json({
      success: true,
      message: '✅ Question added successfully!',
      question: savedQuestion || questionData,
      database: isMongoDBConnected
    });
    
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// 13. Get Results (Admin)
app.get('/api/admin/results', authenticateAdmin, async (req, res) => {
  try {
    let results = [];
    
    if (isMongoDBConnected) {
      results = await Result.find().sort({ submittedAt: -1 });
    }
    
    res.json({
      success: true,
      results,
      database: isMongoDBConnected
    });
    
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// 14. Delete Question
app.delete('/api/admin/questions/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isMongoDBConnected) {
      await Question.findByIdAndDelete(id);
    }
    
    res.json({
      success: true,
      message: 'Question deleted successfully',
      database: isMongoDBConnected
    });
    
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// 15. Delete Result
app.delete('/api/admin/results/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isMongoDBConnected) {
      await Result.findByIdAndDelete(id);
    }
    
    res.json({
      success: true,
      message: 'Result deleted successfully',
      database: isMongoDBConnected
    });
    
  } catch (error) {
    console.error('Delete result error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// 16. Delete All Results
app.delete('/api/admin/results', authenticateAdmin, async (req, res) => {
  try {
    if (isMongoDBConnected) {
      await Result.deleteMany({});
    }
    
    res.json({
      success: true,
      message: 'All results deleted successfully',
      database: isMongoDBConnected
    });
    
  } catch (error) {
    console.error('Delete all results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// 17. Reset Admin
app.post('/admin/reset', async (req, res) => {
  try {
    if (isMongoDBConnected) {
      await Admin.deleteMany({});
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword
      });
    }
    
    res.json({
      success: true,
      message: 'Admin reset successfully',
      database: isMongoDBConnected
    });
    
  } catch (error) {
    console.error('Reset admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting admin'
    });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// ==================== START SERVER ====================
const startServer = async () => {
  try {
    await connectToMongoDB();
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`🌐 http://localhost:${PORT}`);
      console.log(`🔐 Admin login: admin / admin123`);
      console.log(`✅ MongoDB: ${isMongoDBConnected ? 'CONNECTED 🎉' : 'DISCONNECTED'}`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;