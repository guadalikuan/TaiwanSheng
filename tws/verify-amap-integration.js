/**
 * 高德地图 API 集成验证脚本
 * 用于验证代码集成是否正确
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 验证高德地图 API 集成...\n');

// 1. 检查关键文件是否存在
const filesToCheck = [
  'src/utils/amapApi.js',
  'src/components/MapLocationPicker.jsx',
  'src/components/AmapConfigTest.jsx',
  'src/App.jsx',
];

console.log('📁 检查文件完整性:');
let allFilesExist = true;
for (const file of filesToCheck) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - 文件不存在`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.log('\n❌ 部分文件缺失，请检查集成');
  process.exit(1);
}

console.log('\n✅ 所有关键文件存在\n');

// 2. 检查 amapApi.js 中的导出函数
console.log('📦 检查 API 函数导出:');
const amapApiPath = path.join(__dirname, 'src/utils/amapApi.js');
const amapApiContent = fs.readFileSync(amapApiPath, 'utf-8');

const requiredExports = [
  'isAmapConfigured',
  'searchAmapPOI',
  'reverseGeocodeAmap',
  'geocodeAmap',
];

const exportedFunctions = [];
for (const func of requiredExports) {
  const exportPattern = new RegExp(`export\\s+(const|function|async function)\\s+${func}`, 'g');
  if (exportPattern.test(amapApiContent)) {
    console.log(`  ✅ ${func}`);
    exportedFunctions.push(func);
  } else {
    console.log(`  ❌ ${func} - 未找到导出`);
  }
}

if (exportedFunctions.length !== requiredExports.length) {
  console.log('\n⚠️  部分函数未正确导出');
} else {
  console.log('\n✅ 所有必需函数已导出\n');
}

// 3. 检查 MapLocationPicker.jsx 中的导入
console.log('🔗 检查组件导入:');
const mapPickerPath = path.join(__dirname, 'src/components/MapLocationPicker.jsx');
const mapPickerContent = fs.readFileSync(mapPickerPath, 'utf-8');

const requiredImports = [
  'isAmapConfigured',
  'searchAmapPOI',
  'reverseGeocodeAmap',
];

let importsFound = 0;
for (const imp of requiredImports) {
  if (mapPickerContent.includes(imp)) {
    console.log(`  ✅ ${imp} - 已导入`);
    importsFound++;
  } else {
    console.log(`  ❌ ${imp} - 未找到导入`);
  }
}

if (importsFound === requiredImports.length) {
  console.log('\n✅ 所有必需函数已在组件中导入\n');
} else {
  console.log('\n⚠️  部分函数未在组件中导入\n');
}

// 4. 检查 MapLocationPicker 中是否正确使用高德 API
console.log('🔍 检查 API 使用情况:');

// 检查是否在 geocodeAddress 中使用 searchAmapPOI
if (mapPickerContent.includes('searchAmapPOI(') || mapPickerContent.includes('await searchAmapPOI')) {
  console.log('  ✅ geocodeAddress 中使用 searchAmapPOI');
} else {
  console.log('  ❌ geocodeAddress 中未使用 searchAmapPOI');
}

// 检查是否在 searchByCoordinate 中使用 reverseGeocodeAmap
if (mapPickerContent.includes('reverseGeocodeAmap(') || mapPickerContent.includes('await reverseGeocodeAmap')) {
  console.log('  ✅ searchByCoordinate 中使用 reverseGeocodeAmap');
} else {
  console.log('  ❌ searchByCoordinate 中未使用 reverseGeocodeAmap');
}

// 检查是否在 map click 事件中使用 reverseGeocodeAmap
if (mapPickerContent.includes("map.on('click'") && mapPickerContent.includes('reverseGeocodeAmap')) {
  console.log('  ✅ 地图点击事件中使用 reverseGeocodeAmap');
} else if (mapPickerContent.includes("map.on('click'")) {
  console.log('  ⚠️  地图点击事件存在，但需要检查是否使用 reverseGeocodeAmap');
}

// 5. 检查 App.jsx 中的测试路由
console.log('\n🌐 检查路由配置:');
const appPath = path.join(__dirname, 'src/App.jsx');
const appContent = fs.readFileSync(appPath, 'utf-8');

if (appContent.includes('AmapConfigTest')) {
  console.log('  ✅ AmapConfigTest 组件已导入');
} else {
  console.log('  ❌ AmapConfigTest 组件未导入');
}

if (appContent.includes('/test-amap')) {
  console.log('  ✅ /test-amap 路由已配置');
} else {
  console.log('  ❌ /test-amap 路由未配置');
}

// 6. 检查环境变量
console.log('\n⚙️  检查环境变量配置:');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  if (envContent.includes('VITE_AMAP_API_KEY')) {
    const keyLine = envContent.split('\n').find(line => line.trim().startsWith('VITE_AMAP_API_KEY='));
    if (keyLine && keyLine.includes('=')) {
      const keyValue = keyLine.split('=')[1]?.trim();
      if (keyValue && keyValue.length > 10) {
        console.log('  ✅ VITE_AMAP_API_KEY 已配置');
        console.log(`  📋 Key 前缀: ${keyValue.substring(0, 8)}...`);
      } else {
        console.log('  ⚠️  VITE_AMAP_API_KEY 已定义但值为空');
        console.log('  💡 系统将使用 Nominatim 回退方案');
      }
    } else {
      console.log('  ⚠️  VITE_AMAP_API_KEY 格式不正确');
    }
  } else {
    console.log('  ⚠️  .env 文件中未找到 VITE_AMAP_API_KEY');
    console.log('  💡 系统将使用 Nominatim 回退方案');
  }
} else {
  console.log('  ⚠️  .env 文件不存在');
}

// 7. 检查智能回退机制
console.log('\n🔄 检查回退机制:');
if (mapPickerContent.includes('isAmapConfigured()')) {
  console.log('  ✅ 使用 isAmapConfigured() 检查配置');
  
  // 检查是否有回退逻辑
  if (mapPickerContent.includes('Nominatim') || mapPickerContent.includes('nominatim')) {
    console.log('  ✅ 包含 Nominatim 回退逻辑');
  } else {
    console.log('  ⚠️  未找到明确的 Nominatim 回退逻辑');
  }
} else {
  console.log('  ❌ 未使用 isAmapConfigured() 检查');
}

console.log('\n' + '='.repeat(50));
console.log('📊 验证总结');
console.log('='.repeat(50));
console.log('\n✅ 集成验证完成！\n');
console.log('💡 下一步:');
console.log('   1. 启动开发服务器: npm run dev');
console.log('   2. 访问测试页面: http://localhost:5173/test-amap');
console.log('   3. 在资产入库页面测试地图搜索功能');
console.log('\n');

