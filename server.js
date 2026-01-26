// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const app = express();

// ================= CONFIG =================
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/quiz-app";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here";

// ================= MIDDLEWARE =================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= MONGODB CONNECTION =================
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected Successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

// ================= MODELS =================
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNumber: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  marksObtained: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const QuestionSchema = new mongoose.Schema({
  category: { type: String, required: true },
  questionText: { type: String, required: true },
  options: [{ 
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false }
  }],
  marks: { type: Number, default: 1 },
  difficulty: { type: String, default: "medium" },
  createdAt: { type: Date, default: Date.now }
});

const ConfigSchema = new mongoose.Schema({
  quizTime: { type: Number, default: 30 },
  passingPercentage: { type: Number, default: 40 },
  totalQuestions: { type: Number, default: 10 },
  maxMarks: { type: Number, default: 100 },
  categoryStatus: {
    mern: { type: Boolean, default: true },
    react: { type: Boolean, default: true },
    node: { type: Boolean, default: true },
    mongodb: { type: Boolean, default: true },
    express: { type: Boolean, default: true }
  },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);
const Question = mongoose.model("Question", QuestionSchema);
const Config = mongoose.model("Config", ConfigSchema);

// ================= ROUTES =================

// ✅ Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 Quiz API Server Running",
    version: "1.0.0",
    endpoints: {
      register: "POST /api/auth/register",
      questions: "GET /api/user/questions/:category",
      submit: "POST /api/user/submit",
      config: "GET /api/config",
      adminLogin: "POST /api/admin/login",
      allRoutes: "GET /api/routes"
    }
  });
});

// ✅ Get all available routes
app.get("/api/routes", (req, res) => {
  const routes = [
    { method: "GET", path: "/", description: "API Home" },
    { method: "GET", path: "/api/health", description: "Health Check" },
    { method: "POST", path: "/api/auth/register", description: "User Registration (USE THIS)" },
    { method: "GET", path: "/api/auth/register", description: "Registration Instructions" },
    { method: "GET", path: "/api/user/questions/:category", description: "Get Questions by Category" },
    { method: "POST", path: "/api/user/submit", description: "Submit Quiz Answers" },
    { method: "GET", path: "/api/config", description: "Get Configuration" },
    { method: "POST", path: "/api/admin/login", description: "Admin Login" },
    { method: "GET", path: "/api/init", description: "Initialize Database" }
  ];
  
  res.json({
    success: true,
    message: "Available API Routes",
    routes: routes,
    note: "For registration, use POST method to /api/auth/register"
  });
});

// ✅ Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    db: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    timestamp: new Date().toISOString(),
    endpoints: {
      register: "POST /api/auth/register",
      getQuestions: "GET /api/user/questions/:category",
      submitQuiz: "POST /api/user/submit"
    }
  });
});

// ================= AUTH ROUTES =================

// ✅ GET endpoint for registration page (for instructions)
app.get("/api/auth/register", (req, res) => {
  res.json({
    success: true,
    message: "Registration Endpoint",
    instructions: "Use POST method to register a new user",
    important: "This is just an instruction page. Use POST method for actual registration.",
    example: {
      method: "POST",
      url: "/api/auth/register",
      body: {
        name: "John Doe",
        rollNumber: "12345",
        category: "mern"
      }
    },
    curl_example: `curl -X POST http://localhost:${PORT}/api/auth/register -H "Content-Type: application/json" -d '{"name":"John Doe","rollNumber":"12345","category":"mern"}'`
  });
});

// ✅ POST endpoint for user registration (MAIN REGISTRATION ENDPOINT)
app.post("/api/auth/register", async (req, res) => {
  console.log("📝 Register POST request received:", req.body);
  
  try {
    const { name, rollNumber, category } = req.body;
    
    // Validation
    if (!name || !rollNumber || !category) {
      return res.status(400).json({ 
        success: false, 
        message: "All fields are required: name, rollNumber, category" 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ rollNumber });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "Roll number already exists. Please use a different roll number." 
      });
    }

    // Check if category is valid
    const validCategories = ['mern', 'react', 'node', 'mongodb', 'express'];
    if (!validCategories.includes(category.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Please choose from: ${validCategories.join(', ')}`
      });
    }

    // Get config to check category status
    let config = await Config.findOne();
    if (!config) {
      config = await Config.create({});
    }

    // Check category status
    const categoryStatus = config.categoryStatus[category.toLowerCase()];
    if (!categoryStatus) {
      return res.status(400).json({
        success: false,
        message: `Category '${category}' is not yet available for quizzes.`
      });
    }

    // Create new user
    const user = await User.create({ 
      name: name.trim(),
      rollNumber: rollNumber.trim(),
      category: category.toLowerCase().trim(),
      createdAt: new Date()
    });

    console.log("✅ User created successfully:", user.rollNumber);

    res.status(201).json({ 
      success: true, 
      message: "User registered successfully",
      user: {
        _id: user._id,
        name: user.name,
        rollNumber: user.rollNumber,
        category: user.category,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("❌ Register error:", error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: "Roll number already exists. Please use a different roll number." 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Server error during registration",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ================= QUESTION ROUTES =================

// ✅ Get questions by category
app.get("/api/user/questions/:category", async (req, res) => {
  console.log("📝 Questions request for category:", req.params.category);
  
  try {
    const category = req.params.category.toLowerCase();
    
    // Check if category is valid
    const validCategories = ['mern', 'react', 'node', 'mongodb', 'express'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Please choose from: ${validCategories.join(', ')}`
      });
    }
    
    // Get config
    let config = await Config.findOne();
    if (!config) {
      config = await Config.create({});
    }
    
    // Check category status
    const categoryStatus = config.categoryStatus[category];
    if (!categoryStatus) {
      return res.status(400).json({
        success: false,
        message: `Category '${category}' is not yet available. Please contact admin.`
      });
    }
    
    // Get questions
    const questions = await Question.find({ category });
    
    if (questions.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `No questions found for category: ${category}`,
        suggestion: "Please add questions in admin panel first"
      });
    }

    // Shuffle questions and select limited number
    const shuffledQuestions = questions
      .sort(() => Math.random() - 0.5)
      .slice(0, config.totalQuestions || 10);

    // Send questions without correct answers
    res.json({
      success: true,
      questions: shuffledQuestions.map(q => ({
        _id: q._id,
        category: q.category,
        questionText: q.questionText,
        options: q.options.map(opt => ({
          text: opt.text,
          // Don't send isCorrect to client
        })),
        marks: q.marks,
        difficulty: q.difficulty
      })),
      timeLimit: config.quizTime || 30,
      totalQuestions: shuffledQuestions.length,
      category: category,
      totalAvailable: questions.length,
      config: {
        passingPercentage: config.passingPercentage,
        maxMarks: config.maxMarks
      }
    });
  } catch (error) {
    console.error("❌ Questions error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error loading questions",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ================= QUIZ SUBMISSION =================

// ✅ Submit quiz
app.post("/api/user/submit", async (req, res) => {
  console.log("📝 Quiz submission received");
  
  try {
    const { userId, answers, category } = req.body;
    
    // Validation
    if (!userId || !answers || !category) {
      return res.status(400).json({ 
        success: false, 
        message: "userId, answers, and category are required" 
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found. Please register first." 
      });
    }

    // Get config
    const config = await Config.findOne();
    if (!config) {
      return res.status(500).json({
        success: false,
        message: "Configuration not found"
      });
    }

    // Get questions for the category
    const questions = await Question.find({ category: category.toLowerCase() });
    if (questions.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "No questions found for this category" 
      });
    }

    // Calculate score
    let marksObtained = 0;
    let totalMarks = 0;
    let correctAnswers = 0;
    const results = [];

    // Take only the required number of questions
    const questionsToCheck = questions.slice(0, config.totalQuestions || 10);
    
    questionsToCheck.forEach((question) => {
      const userAnswer = answers[question._id]; // This should be the selected option text
      const correctOption = question.options.find((opt) => opt.isCorrect);
      const isCorrect = userAnswer && correctOption && userAnswer === correctOption.text;
      
      if (isCorrect) {
        marksObtained += question.marks || 1;
        correctAnswers++;
      }
      totalMarks += question.marks || 1;
      
      results.push({
        questionId: question._id,
        questionText: question.questionText,
        userAnswer: userAnswer || "Not answered",
        correctAnswer: correctOption?.text || "No correct answer",
        isCorrect: isCorrect,
        marks: question.marks || 1,
        obtainedMarks: isCorrect ? question.marks || 1 : 0
      });
    });

    // Calculate percentage and passing status
    const percentage = totalMarks > 0 ? (marksObtained / totalMarks) * 100 : 0;
    const passingPercentage = config.passingPercentage || 40;
    const passed = percentage >= passingPercentage;

    // Update user
    user.score = correctAnswers;
    user.percentage = percentage;
    user.marksObtained = marksObtained;
    user.totalMarks = totalMarks;
    user.passed = passed;
    await user.save();

    console.log("✅ Quiz submitted successfully for user:", user.name);

    res.json({
      success: true,
      score: correctAnswers,
      totalQuestions: questionsToCheck.length,
      marksObtained: marksObtained,
      totalMarks: totalMarks,
      percentage: percentage.toFixed(2),
      passingPercentage: passingPercentage,
      passed: passed,
      grade: passed ? 'PASS' : 'FAIL',
      message: passed 
        ? '🎉 Congratulations! You passed the quiz.' 
        : `😞 Sorry, you did not pass. You need ${passingPercentage}% to pass.`,
      results: results,
      user: {
        _id: user._id,
        name: user.name,
        rollNumber: user.rollNumber,
        category: user.category
      }
    });
  } catch (error) {
    console.error("❌ Submit error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error submitting quiz",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ================= CONFIG ROUTES =================

// ✅ Get config
app.get("/api/config", async (req, res) => {
  try {
    let config = await Config.findOne();
    if (!config) {
      config = await Config.create({});
    }
    
    res.json({ 
      success: true, 
      config: {
        quizTime: config.quizTime,
        passingPercentage: config.passingPercentage,
        totalQuestions: config.totalQuestions,
        maxMarks: config.maxMarks,
        categoryStatus: config.categoryStatus,
        updatedAt: config.updatedAt
      }
    });
  } catch (error) {
    console.error("❌ Config error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching config" 
    });
  }
});

// ================= INITIAL SETUP =================

// ✅ Initialize database with default data
app.get("/api/init", async (req, res) => {
  try {
    // Create default config if not exists
    let config = await Config.findOne();
    if (!config) {
      config = await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 10,
        maxMarks: 100,
        categoryStatus: {
          mern: true,
          react: true,
          node: true,
          mongodb: true,
          express: true
        }
      });
      console.log("✅ Default config created");
    }
    
    // Add some sample questions if none exist
    const questionCount = await Question.countDocuments();
    if (questionCount === 0) {
      const sampleQuestions = [
        {
          category: "mern",
          questionText: "What does MERN stand for?",
          options: [
            { text: "MongoDB, Express, React, Node.js", isCorrect: true },
            { text: "MySQL, Express, React, Node.js", isCorrect: false },
            { text: "MongoDB, Angular, React, Node.js", isCorrect: false },
            { text: "MongoDB, Express, Redux, Node.js", isCorrect: false }
          ],
          marks: 2,
          difficulty: "easy"
        },
        {
          category: "react",
          questionText: "What is React?",
          options: [
            { text: "A JavaScript library for building user interfaces", isCorrect: true },
            { text: "A programming language", isCorrect: false },
            { text: "A database management system", isCorrect: false },
            { text: "An operating system", isCorrect: false }
          ],
          marks: 1,
          difficulty: "easy"
        },
        {
          category: "node",
          questionText: "What is Node.js?",
          options: [
            { text: "A JavaScript runtime environment", isCorrect: true },
            { text: "A web browser", isCorrect: false },
            { text: "A database", isCorrect: false },
            { text: "A programming language", isCorrect: false }
          ],
          marks: 1,
          difficulty: "easy"
        }
      ];
      
      await Question.insertMany(sampleQuestions);
      console.log("✅ Sample questions added");
    }
    
    res.json({
      success: true,
      message: "Database initialized successfully",
      config: config,
      questionsCount: await Question.countDocuments(),
      usersCount: await User.countDocuments()
    });
  } catch (error) {
    console.error("❌ Init error:", error);
    res.status(500).json({
      success: false,
      message: "Error initializing database"
    });
  }
});

// ================= ERROR HANDLING =================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      { method: "POST", path: "/api/auth/register", description: "User Registration" },
      { method: "GET", path: "/api/user/questions/:category", description: "Get Questions" },
      { method: "POST", path: "/api/user/submit", description: "Submit Quiz" },
      { method: "GET", path: "/api/config", description: "Get Configuration" },
      { method: "GET", path: "/api/routes", description: "All Available Routes" }
    ],
    suggestion: "Check /api/routes for all available endpoints"
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("🔥 Server error:", err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ================= START SERVER =================
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`\n📋 Main Endpoints:`);
      console.log(`   POST /api/auth/register      - Register user`);
      console.log(`   GET  /api/user/questions/:category - Get questions`);
      console.log(`   POST /api/user/submit        - Submit quiz`);
      console.log(`\n📚 Other Endpoints:`);
      console.log(`   GET  /api/routes             - All available routes`);
      console.log(`   GET  /api/health             - Health check`);
      console.log(`   GET  /api/init              - Initialize database`);
      console.log(`\n✅ Server is ready! Use POST method for registration.\n`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;