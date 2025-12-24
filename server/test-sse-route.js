/**
 * SSE 路由测试脚本
 * 用于验证 SSE 路由是否正确注册
 */

import http from 'http';

const testRoutes = [
  'http://localhost:3001/api/sse/test',
  'http://localhost:3001/api/routes/status',
  'http://localhost:3001/api/sse/homepage'
];

console.log('🧪 开始测试 SSE 路由...\n');

testRoutes.forEach((url, index) => {
  setTimeout(() => {
    console.log(`\n测试 ${index + 1}: ${url}`);
    const req = http.get(url, (res) => {
      console.log(`  状态码: ${res.statusCode}`);
      console.log(`  响应头:`, res.headers);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          try {
            const json = JSON.parse(data);
            console.log(`  响应:`, JSON.stringify(json, null, 2));
          } catch {
            console.log(`  响应:`, data.substring(0, 100));
          }
        }
        
        if (res.statusCode === 200) {
          console.log(`  ✅ ${url} 可访问`);
        } else if (res.statusCode === 404) {
          console.log(`  ❌ ${url} 返回 404`);
        } else {
          console.log(`  ⚠️  ${url} 返回 ${res.statusCode}`);
        }
      });
    });
    
    req.on('error', (err) => {
      console.error(`  ❌ 请求失败: ${err.message}`);
    });
    
    req.setTimeout(3000, () => {
      req.destroy();
      console.error(`  ❌ 请求超时`);
    });
  }, index * 500);
});

setTimeout(() => {
  console.log('\n✅ 测试完成');
  process.exit(0);
}, 5000);

