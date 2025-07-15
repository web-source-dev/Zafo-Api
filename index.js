const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();


// Set up middleware for other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(morgan('dev'));

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zafo-app';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const ticketRoutes = require('./routes/tickets');
const organizerRoutes = require('./routes/organizer');

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/organizer', organizerRoutes);
// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Zafo API' });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Start scheduler service
const schedulerService = require('./services/scheduler-service');
schedulerService.start();

module.exports = app;
