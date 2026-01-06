import { homepageService } from './_legacy_backup/server/src/services/homepageService.js';
import { homepageController } from './_legacy_backup/server/src/controllers/homepageController.js';
import { authService } from './_legacy_backup/server/src/services/authService.js';
import { authController } from './_legacy_backup/server/src/controllers/authController.js';

console.log('Checking HomepageService methods...');
const homepageMethods = [
  'getOmegaData', 'getCountdown', 'addOmegaEvent', 'getMarketData', 
  'addMarketTrade', 'getMapData', 'addTaiwanLog', 'addAssetLog', 
  'getFormattedAssets', 'getAllData', 'getStats', 'getNodeDetail'
];

homepageMethods.forEach(method => {
  if (typeof homepageService[method] === 'function') {
    console.log(`✅ homepageService.${method} exists`);
  } else {
    console.error(`❌ homepageService.${method} MISSING`);
  }
});

console.log('\nChecking HomepageController methods...');
const controllerMethods = [
  'getOmega', 'getCountdown', 'addOmegaEvent', 'getMarket', 
  'addMarketTrade', 'getMap', 'addTaiwanNode', 'addMapAsset', 
  'getAssets', 'getAll', 'getStats', 'getNodeDetail'
];

controllerMethods.forEach(method => {
  if (typeof homepageController[method] === 'function') {
    console.log(`✅ homepageController.${method} exists`);
  } else {
    console.error(`❌ homepageController.${method} MISSING`);
  }
});

console.log('\nChecking AuthService methods...');
const authServiceMethods = [
  'register', 'login', 'loginWallet', 'getUser', 'updateProfile', 'changePassword'
];
authServiceMethods.forEach(method => {
  if (typeof authService[method] === 'function') {
    console.log(`✅ authService.${method} exists`);
  } else {
    console.error(`❌ authService.${method} MISSING`);
  }
});

console.log('\nChecking AuthController methods...');
const authControllerMethods = [
  'register', 'login', 'loginWallet', 'getMe', 'updateProfile', 'changePassword'
];
authControllerMethods.forEach(method => {
  if (typeof authController[method] === 'function') {
    console.log(`✅ authController.${method} exists`);
  } else {
    console.error(`❌ authController.${method} MISSING`);
  }
});
