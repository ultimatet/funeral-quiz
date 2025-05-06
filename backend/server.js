// server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwksRsa = require("jwks-rsa");
const { expressjwt: jwt } = require("express-jwt");
const { sequelize } = require("./models");
const quizRouter = require("./routes/quiz");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Auth0 JWT Middleware
const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ["RS256"]
});

// Error handler for unauthorized errors
app.use((err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    console.error("Invalid JWT:", err);
    console.error("Error Code:", err.code);
    console.error("Error Message:", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
  next(err);
});

// Public route
app.get("/", (req, res) => {
  res.send("Public API - No Authentication Required");
});

// Protected profile route
app.get("/profile", checkJwt, (req, res) => {
  res.json({ message: "This is a protected route!", user: req.user });
});

// Quiz routes (no authentication required)
app.use("/quiz", quizRouter);

// Initialize database and start server
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established");

    await sequelize.sync({
      alter: process.env.NODE_ENV === "development"  // only alter in dev
    });
    console.log("Database models synchronized");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (err) {
    console.error("Server startup failed:", err);
    process.exit(1);
  }
}

startServer();
