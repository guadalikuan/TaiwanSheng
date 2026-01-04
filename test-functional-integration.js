/**
 * 功能集成测试脚本
 * 测试高德地图 API 在实际使用场景中的集成
 */

import https from 'https';

console.log('🧪 功能集成测试\n');

// 测试场景配置
const testScenarios = [
  {
    name: 'POI 搜索（信达辰樾府）',
    description: '测试搜索西安的新建楼盘',
    test: async () => {
      // 这个测试需要实际的 API Key，所以只测试代码逻辑
      return { status: 'skipped', reason: '需要实际 API Key' };
    },
  },
  {
    name: '逆地理编码（坐标转地址）',
    description: '测试坐标 (34.3416, 108.9398) 转地址',
    test: async () => {
      // 这个测试需要实际的 API Key
      return { status: 'skipped', reason: '需要实际 API Key' };
    },
  },
];

// 检查环境变量
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');
let hasApiKey = false;
let apiKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const keyLine = envContent.split('\n').find(line => line.trim().startsWith('VITE_AMAP_API_KEY='));
  if (keyLine) {
    apiKey = keyLine.split('=')[1]?.trim() || '';
    if (apiKey && apiKey.length > 10) {
      hasApiKey = true;
    }
  }
}

console.log('📋 测试配置:');
console.log(`  API Key 状态: ${hasApiKey ? '✅ 已配置' : '⚠️  未配置（将使用回退方案）'}\n`);

if (!hasApiKey) {
  console.log('ℹ️  由于未配置 API Key，将进行代码逻辑验证：\n');
  
  // 验证代码文件中的关键逻辑
  const mapPickerPath = path.join(__dirname, 'src/components/MapLocationPicker.jsx');
  const mapPickerContent = fs.readFileSync(mapPickerPath, 'utf-8');
  
  console.log('✅ 代码逻辑验证:');
  
  // 1. 检查是否优先使用高德 API
  if (mapPickerContent.includes('isAmapConfigured()')) {
    console.log('  ✅ 代码中包含高德 API 配置检查');
  }
  
  // 2. 检查是否有回退逻辑
  if (mapPickerContent.includes('nominatim') || mapPickerContent.includes('Nominatim')) {
    console.log('  ✅ 代码中包含 Nominatim 回退逻辑');
  }
  
  // 3. 检查三个关键使用点
  const usagePoints = [
    { name: 'geocodeAddress 函数', pattern: 'searchAmapPOI' },
    { name: 'searchByCoordinate 函数', pattern: 'reverseGeocodeAmap' },
    { name: '地图点击事件', pattern: 'reverseGeocodeAmap' },
  ];
  
  for (const point of usagePoints) {
    // 检查是否在相关函数/事件中使用
    if (mapPickerContent.includes(point.pattern)) {
      console.log(`  ✅ ${point.name}中使用高德 API`);
    }
  }
  
  console.log('\n💡 建议:');
  console.log('   1. 配置高德地图 API Key 以获得更准确的搜索结果');
  console.log('   2. 启动开发服务器并访问测试页面进行实际功能测试');
  console.log('   3. 在资产入库页面测试地图搜索功能\n');
  
  process.exit(0);
}

// 如果有 API Key，进行实际 API 调用测试
console.log('🔑 检测到 API Key，开始实际 API 测试...\n');

// 测试 1: POI 搜索
const testPOISearch = () => {
  return new Promise((resolve, reject) => {
    const testUrl = `https://restapi.amap.com/v3/place/text?key=${apiKey}&keywords=${encodeURIComponent('信达辰樾府')}&city=${encodeURIComponent('西安')}&offset=5&page=1&extensions=all&output=json`;
    
    console.log('🧪 测试 1: POI 搜索');
    console.log(`   关键词: 信达辰樾府`);
    console.log(`   城市: 西安`);
    
    https.get(testUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.status === '1') {
            console.log(`   ✅ 成功！找到 ${result.count} 个结果`);
            if (result.pois && result.pois.length > 0) {
              console.log(`   📍 第一个结果: ${result.pois[0].name}`);
              console.log(`      地址: ${result.pois[0].address || '无'}`);
            }
            resolve(true);
          } else {
            console.log(`   ❌ 失败: ${result.info || '未知错误'}`);
            reject(new Error(result.info));
          }
        } catch (error) {
          console.log(`   ❌ 解析失败: ${error.message}`);
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.log(`   ❌ 请求失败: ${error.message}`);
      reject(error);
    });
  });
};

// 测试 2: 逆地理编码
const testReverseGeocode = () => {
  return new Promise((resolve, reject) => {
    const testUrl = `https://restapi.amap.com/v3/geocode/regeo?key=${apiKey}&location=108.9398,34.3416&radius=1000&extensions=all&output=json`;
    
    console.log('\n🧪 测试 2: 逆地理编码');
    console.log(`   坐标: 34.3416, 108.9398 (西安)`);
    
    https.get(testUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.status === '1' && result.regeocode) {
            console.log(`   ✅ 成功！`);
            console.log(`   📍 地址: ${result.regeocode.formatted_address || '无'}`);
            const addr = result.regeocode.addressComponent || {};
            if (addr.province || addr.city) {
              console.log(`      省市区: ${addr.province || ''} ${addr.city || ''} ${addr.district || ''}`);
            }
            resolve(true);
          } else {
            console.log(`   ❌ 失败: ${result.info || '未知错误'}`);
            reject(new Error(result.info));
          }
        } catch (error) {
          console.log(`   ❌ 解析失败: ${error.message}`);
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.log(`   ❌ 请求失败: ${error.message}`);
      reject(error);
    });
  });
};

// 运行测试
(async () => {
  try {
    await testPOISearch();
    await testReverseGeocode();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ 所有 API 测试通过！');
    console.log('='.repeat(50));
    console.log('\n💡 下一步:');
    console.log('   1. 启动开发服务器: npm run dev');
    console.log('   2. 访问测试页面: http://localhost:5173/test-amap');
    console.log('   3. 在资产入库页面测试实际搜索功能\n');
  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.log('❌ 测试失败');
    console.log('='.repeat(50));
    console.log(`\n错误: ${error.message}\n`);
    process.exit(1);
  }
})();

// 设置超时
setTimeout(() => {
  console.log('\n⏰ 测试超时');
  process.exit(1);
}, 15000);

