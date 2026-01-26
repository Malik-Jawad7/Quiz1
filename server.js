// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();

// ================= CONFIG =================
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/quiz-app";

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
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
      console.log("✅ MongoDB Connected Successfully");
    }
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
  }
};

// ================= SIMPLIFIED MODELS =================
const UserSchema = new mongoose.Schema({
  name: String,
  rollNumber: { type: String, unique: true },
  category: String,
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const QuestionSchema = new mongoose.Schema({
  category: String,
  questionText: String,
  options: [{ 
    text: String,
    isCorrect: { type: Boolean, default: false }
  }],
  marks: { type: Number, default: 1 }
});

const ConfigSchema = new mongoose.Schema({
  quizTime: { type: Number, default: 30 },
  passingPercentage: { type: Number, default: 40 },
  totalQuestions: { type: Number, default: 10 }
});

const User = mongoose.model("User", UserSchema) || mongoose.model("User");
const Question = mongoose.model("Question", QuestionSchema) || mongoose.model("Question");
const Config = mongoose.model("Config", ConfigSchema) || mongoose.model("Config");

// ================= BASIC ROUTES =================

// ✅ Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 Quiz API Server Running",
    status: "OK",
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    endpoints: [
      "POST /api/auth/register",
      "GET /api/user/questions/:category",
      "POST /api/user/submit",
      "GET /api/config"
    ]
  });
});

// ✅ Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  });
});

// ================= AUTH ROUTES =================

// ✅ Registration (both GET and POST)
app.get("/api/auth/register", (req, res) => {
  res.json({
    success: true,
    message: "Registration endpoint",
    instruction: "Send POST request with JSON body",
    example: {
      method: "POST",
      url: "/api/auth/register",
      body: {
        name: "Student Name",
        rollNumber: "Unique ID",
        category: "mern/react/node"
      }
    }
  });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    await connectDB();
    
    const { name, rollNumber, category } = req.body;
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields" 
      });
    }

    const existingUser = await User.findOne({ rollNumber });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "Roll number already exists" 
      });
    }

    const user = await User.create({ 
      name, 
      rollNumber, 
      category: category.toLowerCase()
    });

    res.json({ 
      success: true, 
      message: "Registered successfully",
      userId: user._id,
      user: {
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

// ================= QUESTION ROUTES =================

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

    // Get config for number of questions
    const config = await Config.findOne() || { totalQuestions: 10 };
    const limitedQuestions = questions.slice(0, config.totalQuestions);

    res.json({
      success: true,
      questions: limitedQuestions.map(q => ({
        id: q._id,
        question: q.questionText,
        options: q.options.map(opt => opt.text),
        marks: q.marks
      })),
      count: limitedQuestions.length
    });
  } catch (error) {
    console.error("Questions error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error loading questions" 
    });
  }
});

// ================= QUIZ SUBMISSION =================

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

    // Get user's category questions
    const questions = await Question.find({ category: user.category });
    const config = await Config.findOne() || { passingPercentage: 40 };

    let score = 0;
    let totalMarks = 0;

    questions.forEach((question) => {
      const userAnswer = answers[question._id];
      const correctOption = question.options.find(opt => opt.isCorrect);
      
      if (userAnswer && correctOption && userAnswer === correctOption.text) {
        score += question.marks || 1;
      }
      totalMarks += question.marks || 1;
    });

    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    const passed = percentage >= config.passingPercentage;

    // Update user
    user.score = score;
    user.percentage = percentage;
    await user.save();

    res.json({
      success: true,
      score,
      totalMarks,
      percentage: percentage.toFixed(2),
      passed,
      message: passed ? "Congratulations! You passed." : "Try again."
    });
  } catch (error) {
    console.error("Submit error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error submitting quiz" 
    });
  }
});

// ================= CONFIG =================

app.get("/api/config", async (req, res) => {
  try {
    await connectDB();
    
    let config = await Config.findOne();
    if (!config) {
      config = await Config.create({});
    }
    
    res.json({ 
      success: true, 
      config: {
        quizTime: config.quizTime,
        passingPercentage: config.passingPercentage,
        totalQuestions: config.totalQuestions
      }
    });
  } catch (error) {
    console.error("Config error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching config" 
    });
  }
});

// ================= INITIALIZE =================

app.get("/api/init", async (req, res) => {
  try {
    await connectDB();
    
    // Create sample questions if none exist
    const count = await Question.countDocuments();
    if (count === 0) {
      await Question.create([
        {
          category: "mern",
          questionText: "What is MERN Stack?",
          options: [
            { text: "MongoDB Express React Node", isCorrect: true },
            { text: "MySQL Express React Node", isCorrect: false },
            { text: "MongoDB Angular React Node", isCorrect: false }
          ],
          marks: 2
        },
        {
          category: "react",
          questionText: "What is React?",
          options: [
            { text: "A JavaScript library", isCorrect: true },
            { text: "A programming language", isCorrect: false },
            { text: "A database", isCorrect: false }
          ],
          marks: 1
        }
      ]);
    }
    
    res.json({
      success: true,
      message: "Database initialized",
      questions: await Question.countDocuments(),
      users: await User.countDocuments()
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
      "GET /api/auth/register",
      "POST /api/auth/register",
      "GET /api/user/questions/:category",
      "POST /api/user/submit",
      "GET /api/config",
      "GET /api/init"
    ]
  });
});

// Start server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, async () => {
    await connectDB();
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel
export default app;