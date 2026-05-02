// API Testing Script for Hooria Portfolio Backend
// Run with: node test-apis.js

const http = require('http');

const BASE_URL = 'http://localhost:5000';

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check...');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });

    console.log(`Status: ${response.statusCode}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));
    return response.statusCode === 200;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testContactForm() {
  console.log('\n📧 Testing Contact Form...');
  try {
    const testData = {
      name: 'Test User',
      email: 'test@example.com',
      whatsapp: '+1234567890',
      projectDetails: 'This is a test project submission for API testing.'
    };

    const response = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/submit-form',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, testData);

    console.log(`Status: ${response.statusCode}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));
    return response.statusCode === 201;
  } catch (error) {
    console.error('❌ Contact form test failed:', error.message);
    return false;
  }
}

async function testReviewsAPI() {
  console.log('\n⭐ Testing Reviews API...');
  
  // Test GET reviews
  try {
    const getResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/reviews',
      method: 'GET'
    });

    console.log(`GET Status: ${getResponse.statusCode}`);
    console.log('GET Response:', JSON.stringify(getResponse.body, null, 2));

    // Test POST review (create)
    const reviewData = {
      name: 'Test Reviewer',
      image: 'https://example.com/avatar.jpg',
      rating: 5,
      message: 'This is a test review for API testing.'
    };

    const postResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/reviews',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, reviewData);

    console.log(`POST Status: ${postResponse.statusCode}`);
    console.log('POST Response:', JSON.stringify(postResponse.body, null, 2));

    return getResponse.statusCode === 200 && postResponse.statusCode === 201;
  } catch (error) {
    console.error('❌ Reviews API test failed:', error.message);
    return false;
  }
}

async function testVisitorTracking() {
  console.log('\n👥 Testing Visitor Tracking...');
  try {
    const visitorData = {
      page: '/test-page',
      section: 'test-section',
      action: 'view',
      referrer: 'direct',
      timestamp: new Date().toISOString()
    };

    const response = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/track-visit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, visitorData);

    console.log(`Status: ${response.statusCode}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));

    // Test GET stats
    const statsResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/track-visit/stats',
      method: 'GET'
    });

    console.log(`Stats Status: ${statsResponse.statusCode}`);
    console.log('Stats Response:', JSON.stringify(statsResponse.body, null, 2));

    return response.statusCode === 201 && statsResponse.statusCode === 200;
  } catch (error) {
    console.error('❌ Visitor tracking test failed:', error.message);
    return false;
  }
}

async function testAdminAPI() {
  console.log('\n🔐 Testing Admin API...');
  
  // Test login
  try {
    const loginData = {
      email: 'admin@hooria.com',
      password: 'admin123456'
    };

    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, loginData);

    console.log(`Login Status: ${loginResponse.statusCode}`);
    console.log('Login Response:', JSON.stringify(loginResponse.body, null, 2));

    if (loginResponse.statusCode === 200 && loginResponse.body.token) {
      const token = loginResponse.body.token;

      // Test dashboard with token
      const dashboardResponse = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/admin/dashboard',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log(`Dashboard Status: ${dashboardResponse.statusCode}`);
      console.log('Dashboard Response:', JSON.stringify(dashboardResponse.body, null, 2));

      return loginResponse.statusCode === 200 && dashboardResponse.statusCode === 200;
    }

    return loginResponse.statusCode === 200;
  } catch (error) {
    console.error('❌ Admin API test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting API Integration Tests...');
  console.log('=====================================');

  const results = {
    healthCheck: await testHealthCheck(),
    contactForm: await testContactForm(),
    reviewsAPI: await testReviewsAPI(),
    visitorTracking: await testVisitorTracking(),
    adminAPI: await testAdminAPI()
  };

  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`Health Check: ${results.healthCheck ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Contact Form: ${results.contactForm ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Reviews API: ${results.reviewsAPI ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Visitor Tracking: ${results.visitorTracking ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Admin API: ${results.adminAPI ? '✅ PASS' : '❌ FAIL'}`);

  const passedTests = Object.values(results).filter(result => result).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('🎉 All API integration tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please check the logs above.');
  }
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Run tests
async function main() {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('❌ Server is not running on localhost:5000');
    console.log('Please start the server with: npm start or node server.js');
    process.exit(1);
  }

  await runAllTests();
}

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the tests
main().catch(console.error);
