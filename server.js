// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();

// ================= CONFIG =================
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://your-username:your-password@cluster0.mongodb.net/quiz-app?retryWrites=true&w=majority";

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
    if (!MONGO_URI || MONGO_URI.includes("your-username")) {
      console.log("⚠️  MongoDB URI not configured. Using in-memory data.");
      return false;
    }
    
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("✅ MongoDB Connected Successfully");
      return true;
    }
    return true;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    return false;
  }
};

// Initialize database connection
connectDB();

// ================= IN-MEMORY DATA STORAGE (Fallback) =================
let users = [];
let questions = [
  {
    _id: "1",
    category: "mern",
    questionText: "What does MERN stand for?",
    options: [
      { text: "MongoDB, Express, React, Node.js", isCorrect: true },
      { text: "MySQL, Express, React, Node.js", isCorrect: false },
      { text: "MongoDB, Angular, React, Node.js", isCorrect: false },
      { text: "MongoDB, Express, Redux, Node.js", isCorrect: false }
    ],
    marks: 2
  },
  {
    _id: "2",
    category: "react",
    questionText: "What is React?",
    options: [
      { text: "A JavaScript library for building user interfaces", isCorrect: true },
      { text: "A programming language", isCorrect: false },
      { text: "A database management system", isCorrect: false },
      { text: "An operating system", isCorrect: false }
    ],
    marks: 1
  }
];

let config = {
  quizTime: 30,
  passingPercentage: 40,
  totalQuestions: 10
};

// ================= ROUTES =================

// ✅ Root endpoint - ALWAYS WORKING
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 Quiz API Server Running on Vercel",
    status: "OK",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: [
      "GET /api/health",
      "GET /api/auth/register",
      "POST /api/auth/register",
      "GET /api/user/questions/:category",
      "POST /api/user/submit",
      "GET /api/config"
    ],
    note: "Server is working! Use the endpoints above."
  });
});

// ✅ Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy and running",
    server: "Vercel Deployment",
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "Connected" : "Using in-memory storage"
  });
});

// ✅ GET Registration instructions
app.get("/api/auth/register", (req, res) => {
  res.json({
    success: true,
    message: "Registration Endpoint",
    instruction: "Send a POST request to this endpoint with user data",
    example: {
      method: "POST",
      url: "/api/auth/register",
      headers: {
        "Content-Type": "application/json"
      },
      body: {
        name: "John Doe",
        rollNumber: "12345",
        category: "mern"
      }
    }
  });
});

// ✅ POST Registration
app.post("/api/auth/register", async (req, res) => {
  try {
    console.log("📝 Registration request:", req.body);
    
    const { name, rollNumber, category } = req.body;
    
    // Validation
    if (!name || !rollNumber || !category) {
      return res.status(400).json({ 
        success: false, 
        message: "All fields are required: name, rollNumber, category" 
      });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.rollNumber === rollNumber);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "Roll number already exists" 
      });
    }

    // Create new user
    const newUser = {
      _id: Date.now().toString(),
      name,
      rollNumber,
      category: category.toLowerCase(),
      score: 0,
      percentage: 0,
      createdAt: new Date()
    };
    
    users.push(newUser);
    
    console.log("✅ User registered:", newUser.rollNumber);

    res.status(201).json({ 
      success: true, 
      message: "User registered successfully",
      user: {
        _id: newUser._id,
        name: newUser.name,
        rollNumber: newUser.rollNumber,
        category: newUser.category
      }
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during registration" 
    });
  }
});

// ✅ Get Questions
app.get("/api/user/questions/:category", (req, res) => {
  try {
    const category = req.params.category.toLowerCase();
    console.log("📝 Questions request for category:", category);
    
    // Filter questions by category
    const categoryQuestions = questions.filter(q => q.category === category);
    
    if (categoryQuestions.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `No questions found for category: ${category}` 
      });
    }

    // Shuffle and limit questions
    const shuffledQuestions = [...categoryQuestions]
      .sort(() => Math.random() - 0.5)
      .slice(0, config.totalQuestions);

    // Don't send correct answers to client
    const questionsForClient = shuffledQuestions.map(q => ({
      _id: q._id,
      questionText: q.questionText,
      options: q.options.map(opt => ({ text: opt.text })),
      marks: q.marks
    }));

    res.json({
      success: true,
      questions: questionsForClient,
      timeLimit: config.quizTime,
      totalQuestions: questionsForClient.length,
      category: category
    });
  } catch (error) {
    console.error("❌ Questions error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error loading questions" 
    });
  }
});

// ✅ Submit Quiz
app.post("/api/user/submit", (req, res) => {
  try {
    console.log("📝 Quiz submission:", req.body);
    
    const { userId, answers } = req.body;
    
    if (!userId || !answers) {
      return res.status(400).json({ 
        success: false, 
        message: "userId and answers are required" 
      });
    }

    // Find user
    const user = users.find(u => u._id === userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Calculate score
    let score = 0;
    let totalMarks = 0;
    const results = [];

    // Get user's category questions
    const userQuestions = questions.filter(q => q.category === user.category);
    
    userQuestions.forEach(question => {
      const userAnswer = answers[question._id];
      const correctOption = question.options.find(opt => opt.isCorrect);
      const isCorrect = userAnswer && correctOption && userAnswer === correctOption.text;
      
      if (isCorrect) {
        score += question.marks || 1;
      }
      totalMarks += question.marks || 1;
      
      results.push({
        questionId: question._id,
        questionText: question.questionText,
        userAnswer: userAnswer || "Not answered",
        correctAnswer: correctOption?.text || "No correct answer",
        isCorrect,
        marks: question.marks || 1
      });
    });

    // Calculate percentage
    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    const passed = percentage >= config.passingPercentage;

    // Update user
    user.score = score;
    user.percentage = percentage;

    res.json({
      success: true,
      score: score,
      totalMarks: totalMarks,
      percentage: percentage.toFixed(2),
      passed: passed,
      grade: passed ? 'PASS' : 'FAIL',
      message: passed ? '🎉 Congratulations! You passed.' : '😞 Try again next time.',
      results: results,
      user: {
        _id: user._id,
        name: user.name,
        rollNumber: user.rollNumber
      }
    });
  } catch (error) {
    console.error("❌ Submit error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error submitting quiz" 
    });
  }
});

// ✅ Get Config
app.get("/api/config", (req, res) => {
  res.json({
    success: true,
    config: config
  });
});

// ✅ Initialize endpoint
app.get("/api/init", (req, res) => {
  // Reset users and add sample data
  users = [];
  questions = [
    {
      _id: "1",
      category: "mern",
      questionText: "What does MERN stand for?",
      options: [
        { text: "MongoDB, Express, React, Node.js", isCorrect: true },
        { text: "MySQL, Express, React, Node.js", isCorrect: false },
        { text: "MongoDB, Angular, React, Node.js", isCorrect: false }
      ],
      marks: 2
    },
    {
      _id: "2",
      category: "react",
      questionText: "What is React?",
      options: [
        { text: "A JavaScript library", isCorrect: true },
        { text: "A programming language", isCorrect: false },
        { text: "A database", isCorrect: false }
      ],
      marks: 1
    }
  ];
  
  res.json({
    success: true,
    message: "Database initialized with sample data",
    usersCount: users.length,
    questionsCount: questions.length
  });
});

// ✅ Test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Test endpoint is working!",
    data: {
      serverTime: new Date().toISOString(),
      server: "Vercel",
      status: "Active"
    }
  });
});

// ✅ 404 Handler - MUST BE LAST
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      "GET /",
      "GET /api/health",
      "GET /api/test",
      "GET /api/auth/register",
      "POST /api/auth/register",
      "GET /api/user/questions/:category",
      "POST /api/user/submit",
      "GET /api/config",
      "GET /api/init"
    ]
  });
});

// ================= SERVER START =================

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 Endpoints:`);
    console.log(`   GET  /`);
    console.log(`   GET  /api/health`);
    console.log(`   POST /api/auth/register`);
    console.log(`   GET  /api/user/questions/:category`);
  });
}

// Export for Vercel
export default app;