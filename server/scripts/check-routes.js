import express from 'express';
import usersRoutes from '../routes/users.js';

const app = express();
app.use(express.json());

// 注册路由
app.use('/api/users', usersRoutes);

// 打印所有路由
console.log('\n📋 Registered routes:');
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log(`  ${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    console.log(`  Router: ${middleware.regexp}`);
    if (middleware.handle && middleware.handle.stack) {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          console.log(`    ${Object.keys(handler.route.methods).join(', ').toUpperCase()} ${handler.route.path}`);
        }
      });
    }
  }
});

// 测试服务器
app.listen(3999, () => {
  console.log('\n✅ Test server running on port 3999');
  console.log('Test: curl http://localhost:3999/api/users/developers\n');
});

