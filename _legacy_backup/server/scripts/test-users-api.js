import express from 'express';
import usersRoutes from '../routes/users.js';

const testApp = express();
testApp.use('/api/users', usersRoutes);

console.log('Testing users routes...');
console.log('Routes registered:', testApp._router ? 'Yes' : 'No');

// Test if we can access the routes
testApp.listen(3002, () => {
  console.log('Test server running on port 3002');
  console.log('Try: curl http://localhost:3002/api/users/developers');
  
  // Auto close after 2 seconds
  setTimeout(() => {
    process.exit(0);
  }, 2000);
});

