require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectSupabase, testConnection } = require('./config/supabase');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION! 💥 App is shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED REJECTION! 💥 App is shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

const startServer = async () => {
  let dbConnected = false;
  
  // Try to connect to database
  try {
    connectSupabase();
    const connectionTest = await testConnection();
    dbConnected = connectionTest;
  } catch (error) {
    console.error('\n⚠️ Starting server in DEGRADED MODE (database unavailable)');
    console.error('⚠️ Some features may not work properly\n');
  }
  
  // Find available port
  const PORT = process.env.PORT || 5000;
  const server = http.createServer(app);

  const startServerOnPort = (port) => {
    return new Promise((resolve, reject) => {
      server.listen(port, () => {
        console.log(`🚀 Server running on port ${port}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📊 Health check: http://localhost:${port}/api/health`);
        if (dbConnected) {
          console.log('✅ Database: Connected');
        } else {
          console.log('⚠️ Database: Disconnected (DEGRADED MODE)');
        }
        resolve(port);
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`⚠️ Port ${port} is already in use, trying next port...`);
          startServerOnPort(port + 1).then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });
    });
  };

  try {
    await startServerOnPort(PORT);

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n📡 ${signal} received. Shutting down gracefully...`);
      
      server.close(() => {
        console.log('🔌 HTTP server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('💥 Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();
