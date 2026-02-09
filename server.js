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
let mongooseConnection = null;

const connectToMongoDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('🔗 URI:', MONGODB_URI.substring(0, 50) + '...');
    
    // Connection options
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 30000, // 30 seconds
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,
      minPoolSize: 1,
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true
      }
    };

    // Remove strict query warning
    mongoose.set('strictQuery', false);

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, connectionOptions);
    
    isMongoDBConnected = true;
    mongooseConnection = mongoose.connection;
    
    console.log('✅✅✅ MONGODB CONNECTED SUCCESSFULLY! ✅✅✅');
    console.log('📊 Database:', mongoose.connection.db?.databaseName || 'Unknown');
    console.log('🏠 Host:', mongoose.connection.host);
    console.log('📈 Ready State:', mongoose.connection.readyState);
    console.log('📅 Connection time:', new Date().toISOString());
    
    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      isMongoDBConnected = false;
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      isMongoDBConnected = false;
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
      isMongoDBConnected = true;
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('🔍 Error details:', {
      name: error.name,
      code: error.code,
      codeName: error.codeName
    });
    
    isMongoDBConnected = false;
    console.log('⚠️ Running in memory mode (questions and results will not persist)');
    return false;
  }
};

// ==================== DATABASE MODELS ====================
// Question Schema
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
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Result Schema
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
    default: 0,
    min: 0
  },
  percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  totalQuestions: {
    type: Number,
    default: 0,
    min: 0
  },
  correctAnswers: {
    type: Number,
    default: 0,
    min: 0
  },
  attempted: {
    type: Number,
    default: 0,
    min: 0
  },
  passingPercentage: {
    type: Number,
    default: 40,
    min: 0,
    max: 100
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
}, {
  timestamps: true
});

// Config Schema
const configSchema = new mongoose.Schema({
  quizTime: {
    type: Number,
    default: 30,
    min: 1,
    max: 180
  },
  passingPercentage: {
    type: Number,
    default: 40,
    min: 0,
    max: 100
  },
  totalQuestions: {
    type: Number,
    default: 50,
    min: 1,
    max: 100
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Admin Schema
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
  },
  lastLogin: {
    type: Date
  }
});

// Create Models
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
    } else {
      console.log('✅ Admin already exists');
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
    } else {
      console.log('✅ Config already exists');
    }
    
    // Create indexes
    await Question.createIndexes();
    await Result.createIndexes();
    await Admin.createIndexes();
    
    console.log('✅ Database initialization complete');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
};

// ==================== HELPER FUNCTIONS ====================
const getDatabaseStatus = () => {
  return {
    connected: isMongoDBConnected,
    mode: isMongoDBConnected ? 'mongodb' : 'in-memory',
    timestamp: new Date().toISOString()
  };
};

// ==================== ROUTES ====================

// 1. Root Route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎓 Shamsi Institute Quiz System API',
    version: '3.0.0',
    status: 'operational',
    database: getDatabaseStatus(),
    endpoints: {
      health: 'GET /api/health',
      admin_login: 'POST /admin/login',
      config: 'GET /api/config',
      categories: 'GET /api/categories',
      register: 'POST /api/register',
      quiz_questions: 'GET /api/quiz/questions/:category',
      submit_quiz: 'POST /api/quiz/submit',
      admin_dashboard: 'GET /api/admin/dashboard',
      admin_questions: 'GET /api/admin/questions',
      admin_results: 'GET /api/admin/results'
    }
  });
});

// 2. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: getDatabaseStatus(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
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
    
    // Always allow default admin (even if MongoDB is not connected)
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { username: 'admin', role: 'admin', source: 'default' },
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
        },
        database: getDatabaseStatus()
      });
    }
    
    // Try MongoDB authentication if connected
    if (isMongoDBConnected) {
      try {
        const admin = await Admin.findOne({ username: username.trim().toLowerCase() });
        
        if (admin) {
          const isPasswordValid = await bcrypt.compare(password, admin.password);
          
          if (isPasswordValid) {
            // Update last login
            admin.lastLogin = new Date();
            await admin.save();
            
            const token = jwt.sign(
              { username: admin.username, role: 'admin', source: 'mongodb' },
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
              },
              database: getDatabaseStatus()
            });
          }
        }
      } catch (dbError) {
        console.error('MongoDB auth error:', dbError.message);
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
      if (!config) {
        config = await Config.create({
          quizTime: 30,
          passingPercentage: 40,
          totalQuestions: 50
        });
      }
      
      return res.json({
        success: true,
        config: {
          quizTime: config.quizTime,
          passingPercentage: config.passingPercentage,
          totalQuestions: config.totalQuestions,
          updatedAt: config.updatedAt
        },
        source: 'mongodb',
        database: getDatabaseStatus()
      });
    }
    
    // Fallback config
    res.json({
      success: true,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50,
        updatedAt: new Date()
      },
      source: 'memory',
      database: getDatabaseStatus()
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
      source: 'fallback',
      database: getDatabaseStatus()
    });
  }
});

// 5. Update Config
app.put('/api/config', async (req, res) => {
  try {
    // Check authorization
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
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
    jwt.verify(token, JWT_SECRET);
    
    const { quizTime, passingPercentage, totalQuestions } = req.body;
    
    if (!quizTime || !passingPercentage || !totalQuestions) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
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
      
      return res.json({
        success: true,
        message: '✅ Configuration updated successfully',
        config: {
          quizTime: config.quizTime,
          passingPercentage: config.passingPercentage,
          totalQuestions: config.totalQuestions,
          updatedAt: config.updatedAt
        },
        source: 'mongodb',
        database: getDatabaseStatus()
      });
    }
    
    res.json({
      success: true,
      message: '✅ Configuration updated (memory mode)',
      config: {
        quizTime,
        passingPercentage,
        totalQuestions,
        updatedAt: new Date()
      },
      source: 'memory',
      database: getDatabaseStatus()
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

// 6. Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    let categories = [];
    let source = 'memory';
    
    if (isMongoDBConnected) {
      try {
        const distinctCategories = await Question.distinct('category');
        if (distinctCategories && distinctCategories.length > 0) {
          categories = distinctCategories;
          source = 'mongodb';
        }
      } catch (dbError) {
        console.error('MongoDB categories error:', dbError.message);
      }
    }
    
    // If no categories from MongoDB, use default
    if (categories.length === 0) {
      categories = ['html', 'css', 'javascript', 'react', 'node', 'python', 'java', 'mongodb'];
      source = 'default';
    }
    
    const categoryData = categories.map(cat => ({
      value: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      description: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Technology`,
      available: true,
      type: getCategoryType(cat)
    }));
    
    res.json({
      success: true,
      categories: categoryData,
      count: categories.length,
      source,
      database: getDatabaseStatus()
    });
    
  } catch (error) {
    console.error('Get categories error:', error);
    
    res.json({
      success: true,
      categories: [
        { value: 'html', label: 'HTML', description: 'HTML Web Development', available: true, type: 'frontend' },
        { value: 'css', label: 'CSS', description: 'CSS Styling', available: true, type: 'frontend' },
        { value: 'javascript', label: 'JavaScript', description: 'JavaScript Programming', available: true, type: 'frontend' },
        { value: 'react', label: 'React.js', description: 'React Framework', available: true, type: 'frontend' },
        { value: 'node', label: 'Node.js', description: 'Node.js Backend', available: true, type: 'backend' },
        { value: 'python', label: 'Python', description: 'Python Programming', available: true, type: 'backend' },
        { value: 'java', label: 'Java', description: 'Java Programming', available: true, type: 'backend' }
      ],
      source: 'fallback',
      database: getDatabaseStatus()
    });
  }
});

// Helper function for category type
function getCategoryType(category) {
  const types = {
    'html': 'frontend',
    'css': 'frontend',
    'javascript': 'frontend',
    'react': 'frontend',
    'vue': 'frontend',
    'angular': 'frontend',
    'node': 'backend',
    'express': 'backend',
    'python': 'backend',
    'java': 'backend',
    'php': 'backend',
    'mongodb': 'database',
    'mysql': 'database',
    'postgresql': 'database'
  };
  
  return types[category] || 'general';
}

// 7. Register Student
app.post('/api/register', async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
    // Validation
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, rollNumber, category'
      });
    }
    
    if (name.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 3 characters long'
      });
    }
    
    if (!/^\d+$/.test(rollNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Roll number must contain only numbers'
      });
    }
    
    if (rollNumber.length < 3 || rollNumber.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Roll number should be between 3 and 10 digits'
      });
    }
    
    const formattedRollNumber = `SI-${rollNumber}`;
    
    res.json({
      success: true,
      message: '✅ Registration successful! You can now start the quiz.',
      user: {
        name: name.trim(),
        rollNumber: formattedRollNumber,
        category: category.toLowerCase(),
        registeredAt: new Date().toISOString()
      },
      database: getDatabaseStatus()
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed due to server error'
    });
  }
});

// 8. Get Quiz Questions
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const formattedCategory = category.toLowerCase();
    
    console.log(`📚 Fetching questions for category: ${formattedCategory}`);
    
    let questions = [];
    let source = 'memory';
    let config = {
      quizTime: 30,
      passingPercentage: 40,
      totalQuestions: 50
    };
    
    if (isMongoDBConnected) {
      try {
        // Get config
        const dbConfig = await Config.findOne();
        if (dbConfig) {
          config = dbConfig;
        }
        
        // Get questions
        const dbQuestions = await Question.find({ 
          category: formattedCategory 
        }).limit(config.totalQuestions || 50);
        
        if (dbQuestions.length > 0) {
          questions = dbQuestions;
          source = 'mongodb';
          console.log(`✅ Found ${questions.length} questions in MongoDB`);
        }
      } catch (dbError) {
        console.error('MongoDB questions error:', dbError.message);
      }
    }
    
    // If no questions found, provide sample
    if (questions.length === 0) {
      questions = getSampleQuestions(formattedCategory);
      source = 'sample';
      console.log(`✅ Using ${questions.length} sample questions`);
    }
    
    // Shuffle questions
    const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);
    
    // Limit questions
    const limit = Math.min(config.totalQuestions || 50, shuffledQuestions.length);
    const finalQuestions = shuffledQuestions.slice(0, limit);
    
    // Validate questions have correct options
    finalQuestions.forEach((q, index) => {
      const hasCorrect = q.options?.some(opt => opt.isCorrect === true);
      if (!hasCorrect) {
        console.warn(`⚠️ Question ${index + 1} has no correct option marked`);
      }
    });
    
    res.json({
      success: true,
      questions: finalQuestions,
      config: {
        quizTime: config.quizTime || 30,
        passingPercentage: config.passingPercentage || 40,
        totalQuestions: limit
      },
      count: finalQuestions.length,
      source,
      database: getDatabaseStatus()
    });
    
  } catch (error) {
    console.error('Get quiz questions error:', error);
    
    res.json({
      success: true,
      questions: getSampleQuestions('general'),
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 10
      },
      source: 'error_fallback',
      database: getDatabaseStatus()
    });
  }
});

// Helper function for sample questions
function getSampleQuestions(category) {
  const samples = {
    html: [
      {
        _id: 'html_sample_1',
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
        _id: 'html_sample_2',
        category: 'html',
        questionText: 'Which HTML tag is used for the largest heading?',
        options: [
          { text: '<h1>', isCorrect: true },
          { text: '<h6>', isCorrect: false },
          { text: '<heading>', isCorrect: false }
        ],
        marks: 1,
        difficulty: 'easy'
      }
    ],
    css: [
      {
        _id: 'css_sample_1',
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
    ],
    javascript: [
      {
        _id: 'js_sample_1',
        category: 'javascript',
        questionText: 'Inside which HTML element do we put JavaScript?',
        options: [
          { text: '<script>', isCorrect: true },
          { text: '<javascript>', isCorrect: false },
          { text: '<js>', isCorrect: false }
        ],
        marks: 1,
        difficulty: 'easy'
      }
    ],
    general: [
      {
        _id: 'general_sample_1',
        category: 'general',
        questionText: 'Welcome to the quiz! Select the correct option.',
        options: [
          { text: 'This is the correct answer', isCorrect: true },
          { text: 'Wrong answer 1', isCorrect: false },
          { text: 'Wrong answer 2', isCorrect: false },
          { text: 'Wrong answer 3', isCorrect: false }
        ],
        marks: 1,
        difficulty: 'easy'
      }
    ]
  };
  
  return samples[category] || samples.general;
}

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
      passingPercentage = 40,
      cheatingDetected = false,
      isAutoSubmitted = false
    } = req.body;
    
    console.log('📤 Quiz submission received:', { name, rollNumber, correctAnswers });
    
    // Calculate results
    const finalScore = correctAnswers || score || 0;
    const percentage = totalQuestions > 0 ? (finalScore / totalQuestions) * 100 : 0;
    const passed = percentage >= passingPercentage;
    
    // Create result object
    const resultData = {
      rollNumber: rollNumber.startsWith('SI-') ? rollNumber : `SI-${rollNumber}`,
      name: name.trim(),
      category: category.toLowerCase(),
      score: finalScore,
      percentage: parseFloat(percentage.toFixed(2)),
      totalQuestions,
      correctAnswers: finalScore,
      attempted: attempted || finalScore,
      passingPercentage,
      passed,
      cheatingDetected,
      isAutoSubmitted
    };
    
    let savedToDB = false;
    let savedResult = null;
    
    // Save to MongoDB if connected
    if (isMongoDBConnected) {
      try {
        savedResult = await Result.create(resultData);
        savedToDB = true;
        console.log('✅ Result saved to MongoDB with ID:', savedResult._id);
      } catch (dbError) {
        console.error('MongoDB save error:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      message: '✅ Quiz submitted successfully!',
      result: {
        ...resultData,
        _id: savedResult?._id || 'memory_' + Date.now(),
        submittedAt: new Date(),
        savedToDB,
        database: getDatabaseStatus()
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
        savedToDB: false,
        database: getDatabaseStatus()
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
        message: 'Access token required. Please login first.' 
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
    
    console.log(`🔐 Authenticated admin: ${decoded.username}`);
    
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has expired. Please login again.' 
      });
    }
    
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token. Please login again.' 
    });
  }
};

// 10. Admin Dashboard
app.get('/api/admin/dashboard', authenticateAdmin, async (req, res) => {
  try {
    console.log(`📊 Dashboard request from: ${req.user.username}`);
    
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
          totalAttempts: results.length,
          averageScore: parseFloat(averageScore.toFixed(2)),
          passRate: parseFloat(passRate.toFixed(2)),
          todayAttempts
        };
      } catch (dbError) {
        console.error('Dashboard DB error:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      stats,
      database: getDatabaseStatus(),
      user: req.user
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
    const { category = 'all', search = '', page = 1, limit = 100 } = req.query;
    
    let questions = [];
    let total = 0;
    let source = 'memory';
    
    if (isMongoDBConnected) {
      try {
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
        source = 'mongodb';
        
      } catch (dbError) {
        console.error('Questions fetch error:', dbError.message);
      }
    }
    
    // If no questions from DB, use sample
    if (questions.length === 0) {
      questions = getSampleQuestions('html');
      total = questions.length;
      source = 'sample';
    }
    
    res.json({
      success: true,
      questions,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
      source,
      database: getDatabaseStatus()
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
    
    // Validation
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
      category: category.toLowerCase().trim(),
      questionText: questionText.trim(),
      options: options.map(opt => ({
        text: opt.text.trim(),
        isCorrect: Boolean(opt.isCorrect)
      })),
      marks: parseInt(marks) || 1,
      difficulty: difficulty || 'medium'
    };
    
    let savedQuestion = null;
    let source = 'memory';
    
    // Save to MongoDB if connected
    if (isMongoDBConnected) {
      try {
        savedQuestion = await Question.create(questionData);
        source = 'mongodb';
        console.log('✅ Question saved to MongoDB:', savedQuestion._id);
      } catch (dbError) {
        console.error('Question save error:', dbError.message);
      }
    }
    
    // Create memory ID if not saved to DB
    if (!savedQuestion) {
      savedQuestion = {
        ...questionData,
        _id: 'memory_' + Date.now(),
        createdAt: new Date()
      };
      source = 'memory';
    }
    
    res.json({
      success: true,
      message: `✅ Question added successfully! (${source})`,
      question: savedQuestion,
      source,
      database: getDatabaseStatus()
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
    let source = 'memory';
    
    if (isMongoDBConnected) {
      try {
        results = await Result.find()
          .sort({ submittedAt: -1 })
          .limit(1000);
        source = 'mongodb';
      } catch (dbError) {
        console.error('Results fetch error:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      results: results,
      count: results.length,
      source,
      database: getDatabaseStatus()
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
    
    let deleted = false;
    
    if (isMongoDBConnected) {
      try {
        const result = await Question.findByIdAndDelete(id);
        if (result) {
          deleted = true;
          console.log('✅ Question deleted from MongoDB:', id);
        }
      } catch (dbError) {
        console.error('Delete question error:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      message: 'Question deleted successfully',
      deleted_from_db: deleted,
      database: getDatabaseStatus()
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
    
    let deleted = false;
    
    if (isMongoDBConnected) {
      try {
        const result = await Result.findByIdAndDelete(id);
        if (result) {
          deleted = true;
          console.log('✅ Result deleted from MongoDB:', id);
        }
      } catch (dbError) {
        console.error('Delete result error:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      message: 'Result deleted successfully',
      deleted_from_db: deleted,
      database: getDatabaseStatus()
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
    let deleted = false;
    
    if (isMongoDBConnected) {
      try {
        await Result.deleteMany({});
        deleted = true;
        console.log('✅ All results deleted from MongoDB');
      } catch (dbError) {
        console.error('Delete all results error:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      message: 'All results deleted successfully',
      deleted_from_db: deleted,
      database: getDatabaseStatus()
    });
    
  } catch (error) {
    console.error('Delete all results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// 17. Reset Admin (for testing)
app.post('/admin/reset', async (req, res) => {
  try {
    if (isMongoDBConnected) {
      // Delete existing admin
      await Admin.deleteMany({});
      
      // Create new admin
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword
      });
      
      console.log('✅ Admin reset successfully');
    }
    
    res.json({
      success: true,
      message: 'Admin reset successfully. Use admin/admin123 to login.',
      database: getDatabaseStatus()
    });
    
  } catch (error) {
    console.error('Reset admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting admin'
    });
  }
});

// 18. Database Status
app.get('/api/db-status', (req, res) => {
  const status = getDatabaseStatus();
  
  res.json({
    success: true,
    status,
    mongoose: {
      readyState: mongoose.connection?.readyState || 0,
      states: ['disconnected', 'connected', 'connecting', 'disconnecting']
    }
  });
});

// 19. Test Endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: '✅ API is working!',
    timestamp: new Date().toISOString(),
    database: getDatabaseStatus(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedUrl: req.originalUrl,
    method: req.method
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('🚨 Server error:', err);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ==================== START SERVER ====================
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Initialize database
    await initializeDatabase();
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`🌐 http://localhost:${PORT}`);
      console.log(`🔐 Admin login: admin / admin123`);
      console.log(`✅ MongoDB: ${isMongoDBConnected ? 'CONNECTED 🎉' : 'DISCONNECTED'}`);
      console.log(`📅 Server started: ${new Date().toISOString()}`);
      console.log(`\n📋 Available endpoints:`);
      console.log(`   GET  /              - API Information`);
      console.log(`   GET  /api/health    - Health Check`);
      console.log(`   POST /admin/login   - Admin Login`);
      console.log(`   GET  /api/config    - Get Configuration`);
      console.log(`   PUT  /api/config    - Update Configuration`);
      console.log(`   GET  /api/categories- Get Categories`);
      console.log(`   POST /api/register  - Register Student`);
      console.log(`   GET  /api/quiz/questions/:category - Get Quiz Questions`);
      console.log(`   POST /api/quiz/submit - Submit Quiz`);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down server...');
      
      if (isMongoDBConnected) {
        await mongoose.disconnect();
        console.log('✅ MongoDB disconnected');
      }
      
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;