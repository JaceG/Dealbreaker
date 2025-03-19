const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')

// Import routes
const flagHistoryRoutes = require('./routes/flagHistory')

// Load environment variables
dotenv.config()

// Create Express app
const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Could not connect to MongoDB:', err))

// Routes
app.use('/api/flagHistory', flagHistoryRoutes)

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Dealbreaker API' })
})

// Start server
const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
