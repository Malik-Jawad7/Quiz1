// server.js - WORKING VERSION
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

// ================= SIMPLE MODELS =================
const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  rollNumber: { type: String, unique: true },
  category: String,
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}));

const Question = mongoose.model('Question', new mongoose.Schema({
  category: String,
  questionText: String,
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  marks: { type: Number, default: 1 }
}));

// ================= ROUTES =================

// ✅ Root endpoint - SIMPLE TEST
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

// ✅ GET Registration
app.get("/api/auth/register", (req, res) => {
  res.json({
    success: true,
    message: "Registration endpoint",
    instruction: "Send POST request with JSON body",
    example: {
      name: "Student Name",
      rollNumber: "Unique ID",
      category: "mern"
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
        message: "All fields required" 
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
      category: category.toLowerCase()
    });

    await user.save();

    res.json({ 
      success: true, 
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        rollNumber: user.rollNumber,
        category: user.category
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

// ✅ Get Questions
app.get("/api/user/questions/:category", async (req, res) => {
  try {
    await connectDB();
    
    const category = req.params.category.toLowerCase();
    const questions = await Question.find({ category });
    
    if (questions.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "No questions found" 
      });
    }

    // Return questions without correct answers
    const safeQuestions = questions.map(q => ({
      id: q._id,
      questionText: q.questionText,
      options: q.options.map(opt => ({ text: opt.text })),
      marks: q.marks
    }));

    res.json({
      success: true,
      questions: safeQuestions,
      count: safeQuestions.length,
      category: category
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
    
    const { userId, answers } = req.body;
    
    if (!userId || !answers) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing data" 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const questions = await Question.find({ category: user.category });
    
    let score = 0;
    let totalMarks = 0;

    for (const question of questions) {
      const userAnswer = answers[question._id];
      const correctOption = question.options.find(opt => opt.isCorrect);
      
      if (userAnswer && correctOption && userAnswer === correctOption.text) {
        score += question.marks || 1;
      }
      totalMarks += question.marks || 1;
    }

    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    const passed = percentage >= 40; // 40% passing

    user.score = score;
    user.percentage = percentage;
    await user.save();

    res.json({
      success: true,
      score: score,
      totalMarks: totalMarks,
      percentage: percentage.toFixed(2),
      passed: passed,
      message: passed ? "Congratulations! You passed." : "Try again."
    });
  } catch (error) {
    console.error("Submit error:", error);
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
        category: "mern",
        questionText: "Which database is used in MERN stack?",
        options: [
          { text: "MongoDB", isCorrect: true },
          { text: "MySQL", isCorrect: false },
          { text: "PostgreSQL", isCorrect: false }
        ],
        marks: 1
      }
    ];
    
    await Question.insertMany(sampleQuestions);
    
    res.json({
      success: true,
      message: "Database initialized with sample data",
      questions: await Question.countDocuments()
    });
  } catch (error) {
    console.error("Init error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Initialization failed" 
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
      "GET /api/init",
      "GET /api/auth/register",
      "POST /api/auth/register",
      "GET /api/user/questions/:category",
      "POST /api/user/submit"
    ]
  });
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 MongoDB URI: ${MONGO_URI ? "Configured" : "Not configured"}`);
});

export default app;