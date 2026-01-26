import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();
const app = express();

// ================= CONFIG =================
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority";
const JWT_SECRET = process.env.JWT_SECRET || "shamsi-institute-quiz-secret-key-2024";

// ================= MIDDLEWARE =================
// Enhanced CORS configuration
const corsOptions = {
  origin: [
    'https://quiz2-iota-one.vercel.app',
    'https://quiz2-bsil5hk4z-khalids-projects-3de9ee65.vercel.app',
    'https://shamsi-quiz.vercel.app',
    'https://shamsi-institute.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle preflight requests
app.options('*', cors(corsOptions));

// ================= MONGODB CONNECTION =================
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("✅ MongoDB Connected Successfully");
      console.log(`📊 Database: ${mongoose.connection.name}`);
    }
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    throw err;
  }
};

// Test connection immediately
connectDB().then(() => {
  console.log("🚀 Database ready for connections");
}).catch(console.error);

// ================= ENHANCED MODELS =================
const userSchema = new mongoose.Schema({
  name: String,
  rollNumber: { type: String, unique: true },
  category: String,
  score: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  attempted: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  incorrect: { type: Number, default: 0 },
  unattempted: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  timeSpent: { type: Number, default: 0 },
  answers: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
});

const questionSchema = new mongoose.Schema({
  category: String,
  questionText: String,
  difficulty: { type: String, default: 'medium' },
  options: [{
    text: String,
    isCorrect: Boolean,
    optionIndex: Number
  }],
  marks: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }
});

const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  name: String,
  role: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now }
});

const configSchema = new mongoose.Schema({
  quizTime: { type: Number, default: 30 },
  passingPercentage: { type: Number, default: 40 },
  totalQuestions: { type: Number, default: 50 },
  maxMarks: { type: Number, default: 100 },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Question = mongoose.model('Question', questionSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Config = mongoose.model('Config', configSchema);

// ================= ADMIN AUTH MIDDLEWARE =================
const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "No authorization header" });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    
    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// ================= INITIALIZE DEFAULT DATA =================
const initializeAdmin = async () => {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await Admin.create({
        username: "admin",
        password: hashedPassword,
        name: "System Administrator",
        role: "superadmin"
      });
      console.log("✅ Default admin created: admin / admin123");
    }
  } catch (error) {
    console.error("❌ Error creating admin:", error);
  }
};

const initializeConfig = async () => {
  try {
    const configCount = await Config.countDocuments();
    if (configCount === 0) {
      await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50,
        maxMarks: 100
      });
      console.log("✅ Default configuration created");
    }
  } catch (error) {
    console.error("❌ Error creating config:", error);
  }
};

const initializeSampleQuestions = async () => {
  try {
    const questionCount = await Question.countDocuments();
    if (questionCount === 0) {
      const sampleQuestions = [
        {
          category: "mern",
          questionText: "What does MERN stand for?",
          difficulty: "easy",
          options: [
            { text: "MongoDB, Express, React, Node.js", isCorrect: true, optionIndex: 1 },
            { text: "MySQL, Express, Ruby, .NET", isCorrect: false, optionIndex: 2 },
            { text: "MongoDB, Angular, React, Node.js", isCorrect: false, optionIndex: 3 },
            { text: "MySQL, Express, React, Node.js", isCorrect: false, optionIndex: 4 }
          ],
          marks: 2
        },
        {
          category: "react",
          questionText: "What is React?",
          difficulty: "easy",
          options: [
            { text: "A JavaScript library for building user interfaces", isCorrect: true, optionIndex: 1 },
            { text: "A programming language", isCorrect: false, optionIndex: 2 },
            { text: "A database management system", isCorrect: false, optionIndex: 3 },
            { text: "A CSS framework", isCorrect: false, optionIndex: 4 }
          ],
          marks: 1
        },
        {
          category: "node",
          questionText: "Node.js is built on which engine?",
          difficulty: "medium",
          options: [
            { text: "V8 JavaScript Engine", isCorrect: true, optionIndex: 1 },
            { text: "SpiderMonkey", isCorrect: false, optionIndex: 2 },
            { text: "Chakra", isCorrect: false, optionIndex: 3 },
            { text: "JavaScriptCore", isCorrect: false, optionIndex: 4 }
          ],
          marks: 1
        },
        {
          category: "mongodb",
          questionText: "MongoDB is a ____ database?",
          difficulty: "medium",
          options: [
            { text: "NoSQL", isCorrect: true, optionIndex: 1 },
            { text: "SQL", isCorrect: false, optionIndex: 2 },
            { text: "Graph", isCorrect: false, optionIndex: 3 },
            { text: "Key-Value", isCorrect: false, optionIndex: 4 }
          ],
          marks: 1
        },
        {
          category: "express",
          questionText: "Express.js is a framework for?",
          difficulty: "easy",
          options: [
            { text: "Node.js", isCorrect: true, optionIndex: 1 },
            { text: "React", isCorrect: false, optionIndex: 2 },
            { text: "Python", isCorrect: false, optionIndex: 3 },
            { text: "Java", isCorrect: false, optionIndex: 4 }
          ],
          marks: 1
        }
      ];
      
      await Question.insertMany(sampleQuestions);
      console.log(`✅ ${sampleQuestions.length} sample questions created`);
    }
  } catch (error) {
    console.error("❌ Error creating sample questions:", error);
  }
};

// Initialize all data on startup
const initializeAll = async () => {
  try {
    await initializeAdmin();
    await initializeConfig();
    await initializeSampleQuestions();
    console.log("✅ All initialization completed");
  } catch (error) {
    console.error("❌ Initialization failed:", error);
  }
};

// ================= ROUTES =================

// ✅ Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 Shamsi Institute Quiz API is running!",
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    endpoints: {
      public: [
        "/api/health",
        "/api/config",
        "/api/test-db",
        "/api/auth/register",
        "/api/user/questions/:category",
        "/api/user/submit"
      ],
      admin: [
        "/api/admin/login",
        "/api/admin/dashboard",
        "/api/admin/users",
        "/api/admin/questions"
      ]
    }
  });
});

// ✅ Health check
app.get("/api/health", async (req, res) => {
  try {
    await connectDB();
    const dbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";
    
    res.json({
      success: true,
      message: "Server is healthy and running",
      database: dbStatus,
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      url: req.protocol + '://' + req.get('host')
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server health check failed",
      error: error.message
    });
  }
});

// ✅ Test MongoDB connection
app.get("/api/test-db", async (req, res) => {
  try {
    await connectDB();
    const users = await User.countDocuments();
    const questions = await Question.countDocuments();
    const admins = await Admin.countDocuments();
    
    res.json({
      success: true,
      message: "Database test successful",
      counts: {
        users: users,
        questions: questions,
        admins: admins
      },
      connection: {
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
        readyState: mongoose.connection.readyState
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database test failed",
      error: error.message,
      mongoURI: MONGO_URI ? "Configured" : "Not configured"
    });
  }
});

// ✅ GET Configuration
app.get("/api/config", async (req, res) => {
  try {
    await connectDB();
    let config = await Config.findOne();
    
    if (!config) {
      config = await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50,
        maxMarks: 100
      });
    }
    
    res.json({
      success: true,
      config: {
        quizTime: config.quizTime,
        passingPercentage: config.passingPercentage,
        totalQuestions: config.totalQuestions,
        maxMarks: config.maxMarks
      }
    });
  } catch (error) {
    console.error("Config error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message
    });
  }
});

// ✅ Initialize Database with Sample Data
app.get("/api/init", async (req, res) => {
  try {
    await connectDB();
    
    // Clear existing data (optional)
    // await User.deleteMany({});
    // await Question.deleteMany({});
    
    await initializeAll();
    
    res.json({
      success: true,
      message: "Database initialized successfully",
      data: {
        users: await User.countDocuments(),
        questions: await Question.countDocuments(),
        admins: await Admin.countDocuments(),
        config: await Config.findOne()
      }
    });
  } catch (error) {
    console.error("Init error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Initialization failed",
      error: error.message
    });
  }
});

// ================= USER ROUTES =================

// ✅ POST Registration
app.post("/api/auth/register", async (req, res) => {
  try {
    await connectDB();
    
    const { name, rollNumber, category } = req.body;
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({ 
        success: false, 
        message: "All fields required: name, rollNumber, category" 
      });
    }

    // Check if user exists
    const existing = await User.findOne({ rollNumber });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: "Roll number already exists" 
      });
    }

    const user = new User({
      name,
      rollNumber,
      category: category.toLowerCase(),
      score: 0,
      percentage: 0,
      passed: false,
      createdAt: new Date()
    });

    await user.save();

    res.json({ 
      success: true, 
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        rollNumber: user.rollNumber,
        category: user.category,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message
    });
  }
});

// ✅ Get Questions by Category
app.get("/api/user/questions/:category", async (req, res) => {
  try {
    await connectDB();
    
    const category = req.params.category.toLowerCase();
    const config = await Config.findOne() || { totalQuestions: 50 };
    
    let questions = await Question.find({ category });
    
    if (questions.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `No questions found for ${category} category` 
      });
    }

    // Shuffle questions
    questions = questions.sort(() => Math.random() - 0.5);
    
    // Limit questions based on config
    if (questions.length > config.totalQuestions) {
      questions = questions.slice(0, config.totalQuestions);
    }

    // Return questions without correct answers
    const safeQuestions = questions.map(q => ({
      _id: q._id,
      questionText: q.questionText,
      difficulty: q.difficulty || 'medium',
      options: q.options.map(opt => ({ 
        text: opt.text,
        optionIndex: opt.optionIndex 
      })),
      marks: q.marks || 1,
      category: q.category
    }));

    res.json({
      success: true,
      questions: safeQuestions,
      count: safeQuestions.length,
      category: category,
      totalQuestions: config.totalQuestions
    });
  } catch (error) {
    console.error("Questions error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message
    });
  }
});

// ✅ Submit Quiz
app.post("/api/user/submit", async (req, res) => {
  try {
    await connectDB();
    
    const { userId, userName, rollNumber, category, answers, score, totalQuestions, timeSpent } = req.body;
    
    if (!userName || !rollNumber || !category) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required data" 
      });
    }

    // Find or create user
    let user = await User.findOne({ rollNumber });
    if (!user) {
      user = new User({
        name: userName,
        rollNumber: rollNumber,
        category: category.toLowerCase()
      });
    }

    const config = await Config.findOne() || { passingPercentage: 40 };
    
    // Calculate results
    const calculatedScore = score || 0;
    const calculatedTotalQuestions = totalQuestions || answers?.length || 0;
    const calculatedPercentage = calculatedTotalQuestions > 0 ? (calculatedScore / calculatedTotalQuestions) * 100 : 0;
    const isPassed = calculatedPercentage >= config.passingPercentage;
    const correctAnswers = answers?.filter(a => a.isCorrect)?.length || 0;
    const incorrectAnswers = answers?.filter(a => !a.isCorrect)?.length || 0;
    const attempted = answers?.length || 0;
    const unattempted = calculatedTotalQuestions - attempted;
    
    // Update user
    user.name = userName;
    user.category = category.toLowerCase();
    user.score = calculatedScore;
    user.totalQuestions = calculatedTotalQuestions;
    user.percentage = calculatedPercentage;
    user.passed = isPassed;
    user.attempted = attempted;
    user.correct = correctAnswers;
    user.incorrect = incorrectAnswers;
    user.unattempted = unattempted;
    user.timeSpent = timeSpent || 0;
    user.answers = answers || [];
    
    await user.save();

    res.json({
      success: true,
      message: isPassed ? "Congratulations! You passed." : "Try again to improve your score.",
      result: {
        userId: user._id,
        userName: user.name,
        rollNumber: user.rollNumber,
        category: user.category,
        score: user.score,
        totalQuestions: user.totalQuestions,
        percentage: user.percentage.toFixed(2),
        passed: user.passed,
        passingPercentage: config.passingPercentage,
        attempted: user.attempted,
        correct: user.correct,
        incorrect: user.incorrect,
        unattempted: user.unattempted,
        timeSpent: user.timeSpent,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("Submit error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message
    });
  }
});

// ================= ADMIN ROUTES =================

// ✅ Admin Login
app.post("/api/admin/login", async (req, res) => {
  try {
    await connectDB();
    
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Username and password required" 
      });
    }

    // Find admin
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    // Create token
    const token = jwt.sign(
      { 
        id: admin._id, 
        username: admin.username,
        role: admin.role 
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: "Login successful",
      token: token,
      user: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message
    });
  }
});

// ✅ Get Dashboard Stats
app.get("/api/admin/dashboard", adminAuth, async (req, res) => {
  try {
    await connectDB();
    
    const totalStudents = await User.countDocuments();
    const totalQuestions = await Question.countDocuments();
    const totalAttempts = await User.countDocuments({ attempted: { $gt: 0 } });
    
    // Calculate average score and pass rate
    const users = await User.find({ attempted: { $gt: 0 } });
    const totalScore = users.reduce((sum, user) => sum + (user.percentage || 0), 0);
    const passedStudents = users.filter(user => user.passed).length;
    
    const averageScore = users.length > 0 ? totalScore / users.length : 0;
    const passRate = users.length > 0 ? (passedStudents / users.length) * 100 : 0;
    
    // Today's attempts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttempts = await User.countDocuments({ 
      createdAt: { $gte: today },
      attempted: { $gt: 0 }
    });
    
    // Get unique categories
    const categories = await Question.distinct('category');
    
    // Category statistics
    const categoryStats = {};
    for (const category of categories) {
      const questions = await Question.countDocuments({ category });
      const results = await User.countDocuments({ category, attempted: { $gt: 0 } });
      const passed = await User.countDocuments({ category, passed: true });
      categoryStats[category] = { questions, results, passed };
    }
    
    // Recent activity
    const recentResults = await User.find({ attempted: { $gt: 0 } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name rollNumber category score percentage passed createdAt');
    
    res.json({
      success: true,
      stats: {
        totalStudents,
        totalQuestions,
        totalAttempts,
        averageScore: averageScore.toFixed(2),
        passRate: passRate.toFixed(2),
        todayAttempts,
        totalCategories: categories.length,
        categoryStats,
        recentResults
      }
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message
    });
  }
});

// ✅ Get All Results
app.get("/api/admin/users", adminAuth, async (req, res) => {
  try {
    await connectDB();
    
    const users = await User.find().sort({ createdAt: -1 });
    
    const results = users.map(user => ({
      _id: user._id,
      name: user.name,
      rollNumber: user.rollNumber,
      category: user.category,
      score: user.score,
      totalQuestions: user.totalQuestions,
      percentage: user.percentage,
      attempted: user.attempted,
      correct: user.correct,
      incorrect: user.incorrect,
      unattempted: user.unattempted,
      passed: user.passed,
      timeSpent: user.timeSpent,
      createdAt: user.createdAt
    }));
    
    res.json({
      success: true,
      results: results,
      count: results.length
    });
  } catch (error) {
    console.error("Results error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message
    });
  }
});

// ✅ Get All Questions (Admin)
app.get("/api/admin/questions", adminAuth, async (req, res) => {
  try {
    await connectDB();
    
    const questions = await Question.find().sort({ category: 1, createdAt: -1 });
    
    res.json({
      success: true,
      questions: questions,
      count: questions.length
    });
  } catch (error) {
    console.error("Questions error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message
    });
  }
});

// ✅ Add Question
app.post("/api/admin/questions", adminAuth, async (req, res) => {
  try {
    await connectDB();
    
    const { category, questionText, difficulty, marks, options } = req.body;
    
    if (!category || !questionText || !options || !Array.isArray(options)) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields" 
      });
    }

    // Validate that at least one option is correct
    const hasCorrectAnswer = options.some(opt => opt.isCorrect);
    if (!hasCorrectAnswer) {
      return res.status(400).json({ 
        success: false, 
        message: "At least one option must be correct" 
      });
    }

    // Check if marks exceed maximum
    const config = await Config.findOne();
    const maxMarks = config?.maxMarks || 100;
    if (marks > maxMarks) {
      return res.status(400).json({ 
        success: false, 
        message: `Marks cannot exceed ${maxMarks}` 
      });
    }

    const question = new Question({
      category: category.toLowerCase(),
      questionText,
      difficulty: difficulty || 'medium',
      marks: marks || 1,
      options: options.map((opt, index) => ({
        ...opt,
        optionIndex: index + 1
      }))
    });

    await question.save();

    res.json({
      success: true,
      message: "Question added successfully",
      question: question
    });
  } catch (error) {
    console.error("Add question error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message
    });
  }
});

// ✅ Update Question
app.put("/api/admin/questions/:id", adminAuth, async (req, res) => {
  try {
    await connectDB();
    
    const { id } = req.params;
    const { category, questionText, difficulty, marks, options } = req.body;
    
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ 
        success: false, 
        message: "Question not found" 
      });
    }

    // Validate that at least one option is correct
    if (options && Array.isArray(options)) {
      const hasCorrectAnswer = options.some(opt => opt.isCorrect);
      if (!hasCorrectAnswer) {
        return res.status(400).json({ 
          success: false, 
          message: "At least one option must be correct" 
        });
      }
    }

    // Update fields
    if (category) question.category = category.toLowerCase();
    if (questionText) question.questionText = questionText;
    if (difficulty) question.difficulty = difficulty;
    if (marks) question.marks = marks;
    if (options) {
      question.options = options.map((opt, index) => ({
        ...opt,
        optionIndex: index + 1
      }));
    }

    await question.save();

    res.json({
      success: true,
      message: "Question updated successfully",
      question: question
    });
  } catch (error) {
    console.error("Update question error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message
    });
  }
});

// ✅ Delete Question
app.delete("/api/admin/questions/:id", adminAuth, async (req, res) => {
  try {
    await connectDB();
    
    const { id } = req.params;
    
    const question = await Question.findByIdAndDelete(id);
    if (!question) {
      return res.status(404).json({ 
        success: false, 
        message: "Question not found" 
      });
    }

    res.json({
      success: true,
      message: "Question deleted successfully"
    });
  } catch (error) {
    console.error("Delete question error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message
    });
  }
});

// ✅ Update Configuration
app.put("/api/admin/config", adminAuth, async (req, res) => {
  try {
    await connectDB();
    
    const { quizTime, passingPercentage, totalQuestions, maxMarks } = req.body;
    
    let config = await Config.findOne();
    if (!config) {
      config = new Config({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50,
        maxMarks: 100
      });
    }
    
    if (quizTime !== undefined) config.quizTime = quizTime;
    if (passingPercentage !== undefined) config.passingPercentage = passingPercentage;
    if (totalQuestions !== undefined) config.totalQuestions = totalQuestions;
    if (maxMarks !== undefined) config.maxMarks = maxMarks;
    
    config.updatedAt = new Date();
    await config.save();
    
    res.json({
      success: true,
      message: "Configuration updated successfully",
      config: {
        quizTime: config.quizTime,
        passingPercentage: config.passingPercentage,
        totalQuestions: config.totalQuestions,
        maxMarks: config.maxMarks
      }
    });
  } catch (error) {
    console.error("Update config error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message
    });
  }
});

// ✅ Delete Result
app.delete("/api/admin/results/:id", adminAuth, async (req, res) => {
  try {
    await connectDB();
    
    const { id } = req.params;
    
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Result not found" 
      });
    }

    res.json({
      success: true,
      message: "Result deleted successfully"
    });
  } catch (error) {
    console.error("Delete result error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message
    });
  }
});

// ✅ Delete All Results
app.delete("/api/admin/results", adminAuth, async (req, res) => {
  try {
    await connectDB();
    
    const result = await User.deleteMany({});
    
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} results successfully`
    });
  } catch (error) {
    console.error("Delete all results error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message
    });
  }
});

// ================= ERROR HANDLING =================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    available: [
      "GET /",
      "GET /api/health",
      "GET /api/test-db",
      "GET /api/config",
      "GET /api/init",
      "POST /api/auth/register",
      "GET /api/user/questions/:category",
      "POST /api/user/submit",
      "POST /api/admin/login",
      "GET /api/admin/dashboard",
      "GET /api/admin/users",
      "GET /api/admin/questions",
      "POST /api/admin/questions",
      "PUT /api/admin/questions/:id",
      "DELETE /api/admin/questions/:id",
      "PUT /api/admin/config",
      "DELETE /api/admin/results/:id",
      "DELETE /api/admin/results"
    ]
  });
});

// ================= START SERVER =================
// For Vercel serverless deployment
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 MongoDB URI: ${MONGO_URI ? "Configured" : "Using default"}`);
    console.log(`🔑 JWT Secret: ${JWT_SECRET ? "Configured" : "Using default"}`);
    
    // Initialize database
    try {
      await connectDB();
      await initializeAll();
      console.log("✅ Database initialized successfully");
      console.log("📊 Available endpoints:");
      console.log(`   http://localhost:${PORT}/api/health`);
      console.log(`   http://localhost:${PORT}/api/test-db`);
      console.log(`   http://localhost:${PORT}/api/admin/login`);
    } catch (error) {
      console.error("❌ Database initialization failed:", error);
    }
  });
}