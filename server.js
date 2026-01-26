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
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/quiz-app";
const JWT_SECRET = process.env.JWT_SECRET || "shamsi-institute-quiz-secret-key-2024";

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= MONGODB CONNECTION =================
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
      console.log("✅ MongoDB Connected Successfully");
    }
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
  }
};

// Test the connection immediately
connectDB().catch(console.error);

// ================= ENHANCED MODELS =================
const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  rollNumber: { type: String, unique: true },
  category: String,
  score: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  attempted: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  incorrect: { type: Number, default: 0 },
  unattempted: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  timeSpent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}));

const Question = mongoose.model('Question', new mongoose.Schema({
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
}));

const Admin = mongoose.model('Admin', new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  name: String,
  role: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now }
}));

const Config = mongoose.model('Config', new mongoose.Schema({
  quizTime: { type: Number, default: 30 },
  passingPercentage: { type: Number, default: 40 },
  totalQuestions: { type: Number, default: 50 },
  maxMarks: { type: Number, default: 100 },
  updatedAt: { type: Date, default: Date.now }
}));

// ================= ADMIN AUTH MIDDLEWARE =================
const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
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
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// ================= INITIALIZE DEFAULT ADMIN =================
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

// ================= INITIALIZE DEFAULT CONFIG =================
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

// ================= ROUTES =================

// ✅ Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 Shamsi Institute Quiz API is running!",
    status: "OK",
    timestamp: new Date().toISOString()
  });
});

// ✅ Health check
app.get("/api/health", async (req, res) => {
  try {
    await connectDB();
    res.json({
      success: true,
      message: "Server is healthy",
      database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
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
    
    res.json({
      success: true,
      message: "Database test successful",
      counts: {
        users: users,
        questions: questions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database test failed",
      error: error.message
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
      message: "Server error" 
    });
  }
});

// ✅ GET Result Configuration
app.get("/api/result-config", async (req, res) => {
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
        passingPercentage: config.passingPercentage,
        quizTime: config.quizTime,
        totalQuestions: config.totalQuestions
      }
    });
  } catch (error) {
    console.error("Result config error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// ✅ Initialize Database with Sample Data
app.get("/api/init", async (req, res) => {
  try {
    await connectDB();
    
    // Clear existing data
    await User.deleteMany({});
    await Question.deleteMany({});
    
    // Add sample questions
    const sampleQuestions = [
      {
        category: "html",
        questionText: "What does HTML stand for?",
        difficulty: "easy",
        options: [
          { text: "Hyper Text Markup Language", isCorrect: true, optionIndex: 1 },
          { text: "High Tech Modern Language", isCorrect: false, optionIndex: 2 },
          { text: "Hyper Transfer Markup Language", isCorrect: false, optionIndex: 3 },
          { text: "Home Tool Markup Language", isCorrect: false, optionIndex: 4 }
        ],
        marks: 2
      },
      {
        category: "html",
        questionText: "Which tag is used for the largest heading?",
        difficulty: "easy",
        options: [
          { text: "<h1>", isCorrect: true, optionIndex: 1 },
          { text: "<h6>", isCorrect: false, optionIndex: 2 },
          { text: "<head>", isCorrect: false, optionIndex: 3 },
          { text: "<header>", isCorrect: false, optionIndex: 4 }
        ],
        marks: 1
      },
      {
        category: "css",
        questionText: "What does CSS stand for?",
        difficulty: "easy",
        options: [
          { text: "Cascading Style Sheets", isCorrect: true, optionIndex: 1 },
          { text: "Creative Style System", isCorrect: false, optionIndex: 2 },
          { text: "Computer Style Sheets", isCorrect: false, optionIndex: 3 },
          { text: "Colorful Style Sheets", isCorrect: false, optionIndex: 4 }
        ],
        marks: 2
      },
      {
        category: "css",
        questionText: "Which property is used to change the background color?",
        difficulty: "medium",
        options: [
          { text: "background-color", isCorrect: true, optionIndex: 1 },
          { text: "bgcolor", isCorrect: false, optionIndex: 2 },
          { text: "color-background", isCorrect: false, optionIndex: 3 },
          { text: "bg-color", isCorrect: false, optionIndex: 4 }
        ],
        marks: 1
      }
    ];
    
    await Question.insertMany(sampleQuestions);
    await initializeAdmin();
    await initializeConfig();
    
    res.json({
      success: true,
      message: "Database initialized with sample data",
      questions: await Question.countDocuments(),
      config: await Config.findOne()
    });
  } catch (error) {
    console.error("Init error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Initialization failed" 
    });
  }
});

// ✅ GET Registration endpoint info
app.get("/api/auth/register", (req, res) => {
  res.json({
    success: true,
    message: "Registration endpoint",
    instruction: "Send POST request with JSON body",
    example: {
      name: "Student Name",
      rollNumber: "Unique ID",
      category: "html"
    }
  });
});

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
      message: "Server error" 
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
      message: "Server error" 
    });
  }
});

// ✅ Submit Quiz
app.post("/api/user/submit", async (req, res) => {
  try {
    await connectDB();
    
    const { userId, userName, rollNumber, category, answers, score, totalMarks, percentage, passed, totalQuestions, attempted, timeSpent } = req.body;
    
    if (!userId || !userName || !rollNumber || !category) {
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
    
    // Calculate results if not provided
    let calculatedScore = score || 0;
    let calculatedTotalMarks = totalMarks || 100;
    let calculatedPercentage = percentage || 0;
    let isPassed = passed || false;
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    
    if (answers && Array.isArray(answers)) {
      // Calculate from answers data
      correctAnswers = answers.filter(a => a.isCorrect).length;
      incorrectAnswers = answers.filter(a => !a.isCorrect).length;
      calculatedScore = answers.reduce((sum, a) => sum + (a.marksObtained || 0), 0);
      calculatedTotalMarks = answers.reduce((sum, a) => sum + (a.marks || 0), 0);
      calculatedPercentage = calculatedTotalMarks > 0 ? (calculatedScore / calculatedTotalMarks) * 100 : 0;
      isPassed = calculatedPercentage >= config.passingPercentage;
    }
    
    // Update user
    user.score = calculatedScore;
    user.totalMarks = calculatedTotalMarks;
    user.percentage = calculatedPercentage;
    user.passed = isPassed;
    user.attempted = attempted || 0;
    user.correct = correctAnswers;
    user.incorrect = incorrectAnswers;
    user.unattempted = (totalQuestions || 0) - (attempted || 0);
    user.timeSpent = timeSpent || 0;
    user.category = category.toLowerCase();
    
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
        totalMarks: user.totalMarks,
        percentage: user.percentage.toFixed(2),
        passed: user.passed,
        passingPercentage: config.passingPercentage,
        attempted: user.attempted,
        correct: user.correct,
        incorrect: user.incorrect,
        unattempted: user.unattempted,
        totalQuestions: totalQuestions || 0,
        timeSpent: user.timeSpent,
        answersData: answers || [],
        submittedAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("Submit error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
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
      message: "Server error" 
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
    
    // Active students (attempted in last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const activeStudents = await User.countDocuments({ 
      createdAt: { $gte: weekAgo },
      attempted: { $gt: 0 }
    });
    
    // Get unique categories
    const categories = await Question.distinct('category');
    
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
        activeStudents
      }
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
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
      totalMarks: user.totalMarks,
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
      message: "Server error" 
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
      message: "Server error" 
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
      message: "Server error" 
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
      message: "Server error" 
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
      message: "Server error" 
    });
  }
});

// ✅ Add Result (Admin)
app.post("/api/admin/results", adminAuth, async (req, res) => {
  try {
    await connectDB();
    
    const { name, rollNumber, category, score, totalMarks, percentage, passed, date } = req.body;
    
    if (!name || !rollNumber || !category || score === undefined || totalMarks === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields" 
      });
    }

    const config = await Config.findOne() || { passingPercentage: 40 };
    const calculatedPercentage = percentage || (totalMarks > 0 ? (score / totalMarks) * 100 : 0);
    const isPassed = passed !== undefined ? passed : calculatedPercentage >= config.passingPercentage;

    // Check if user exists
    let user = await User.findOne({ rollNumber });
    if (user) {
      // Update existing user
      user.name = name;
      user.category = category;
      user.score = score;
      user.totalMarks = totalMarks;
      user.percentage = calculatedPercentage;
      user.passed = isPassed;
      user.attempted = 1; // Assuming they attempted since we're adding a result
      user.correct = score; // Assuming score equals correct answers for now
      user.incorrect = totalMarks - score;
      user.unattempted = 0;
    } else {
      // Create new user
      user = new User({
        name,
        rollNumber,
        category,
        score,
        totalMarks,
        percentage: calculatedPercentage,
        passed: isPassed,
        attempted: 1,
        correct: score,
        incorrect: totalMarks - score,
        unattempted: 0,
        timeSpent: 0,
        createdAt: date ? new Date(date) : new Date()
      });
    }

    await user.save();

    res.json({
      success: true,
      message: "Result added successfully",
      result: {
        id: user._id,
        name: user.name,
        rollNumber: user.rollNumber,
        category: user.category,
        score: user.score,
        totalMarks: user.totalMarks,
        percentage: user.percentage,
        passed: user.passed,
        passingPercentage: config.passingPercentage,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("Add result error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
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
      message: "Server error" 
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
      message: "Server error" 
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
      message: "Server error" 
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
      "GET /api/result-config",
      "GET /api/init",
      "GET /api/auth/register",
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
      "POST /api/admin/results",
      "DELETE /api/admin/results/:id",
      "DELETE /api/admin/results",
      "PUT /api/admin/config"
    ]
  });
});

// ================= START SERVER =================
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 MongoDB URI: ${MONGO_URI ? "Configured" : "Not configured"}`);
  
  // Initialize database
  try {
    await connectDB();
    await initializeAdmin();
    await initializeConfig();
    console.log("✅ Database initialized successfully");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
  }
});

export default app;