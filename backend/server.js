const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Load environment variables
const connectDB = require("./src/config/connectDB");

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection

// Routes (to be implemented)
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/projects', require('./src/routes/projects'));
app.use('/api/milestones', require('./src/routes/milestones'));
app.use('/api/payments', require('./src/routes/payments'));
app.use('/api/disputes', require('./src/routes/disputes'));


// Error handling middleware


// Start server
const PORT = process.env.PORT || 5000;
const main = async () => {
  try {
    await connectDB(process.env.MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`Server is running on PORT: ${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
};
main();