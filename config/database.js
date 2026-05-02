const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Check if MONGODB_URI is defined
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    // Connection options with retry logic
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
        console.log('🔄 Network error detected, attempting to reconnect...');
      }
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    mongoose.connection.on('reconnectFailed', () => {
      console.error('❌ Failed to reconnect to MongoDB after multiple attempts');
    });

    return conn;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    
    // Provide helpful troubleshooting information
    if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv ECONNREFUSED')) {
      console.error('\n🔧 Troubleshooting Steps:');
      console.error('1. Check your internet connection');
      console.error('2. Verify MongoDB Atlas cluster is running');
      console.error('3. Check if IP address is whitelisted in MongoDB Atlas');
      console.error('4. Verify database credentials are correct');
      console.error('5. Try using a different network or VPN');
    }
    
    if (error.message.includes('ENOTFOUND')) {
      console.error('\n🔧 DNS Resolution Issue:');
      console.error('1. Check your DNS settings');
      console.error('2. Try using a different DNS server (8.8.8.8 or 1.1.1.1)');
      console.error('3. Check if MongoDB Atlas cluster domain is correct');
    }
    
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = () => {
  mongoose.connection.close(() => {
    console.log('🔌 MongoDB connection closed through app termination');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = { connectDB, gracefulShutdown };
