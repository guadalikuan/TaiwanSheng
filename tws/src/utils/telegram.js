/**
 * Telegram Mini App工具
 * 集成 @twa-dev/sdk
 */

let telegramWebApp = null;
let isTelegram = false;

// 初始化Telegram WebApp
export const initTelegram = () => {
  try {
    // 检查是否在Telegram环境中
    if (window.Telegram && window.Telegram.WebApp) {
      telegramWebApp = window.Telegram.WebApp;
      isTelegram = true;
      
      // 初始化WebApp
      telegramWebApp.ready();
      
      // 展开WebApp到全屏
      telegramWebApp.expand();
      
      console.log('✅ Telegram WebApp 已初始化');
      return true;
    } else {
      console.log('ℹ️ 不在Telegram环境中');
      return false;
    }
  } catch (error) {
    console.error('初始化Telegram失败:', error);
    return false;
  }
};

/**
 * 获取Telegram用户信息
 * @returns {Object|null} 用户信息
 */
export const getTelegramUser = () => {
  if (!telegramWebApp || !isTelegram) {
    return null;
  }
  
  const user = telegramWebApp.initDataUnsafe?.user;
  if (!user) {
    return null;
  }
  
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    languageCode: user.language_code,
    isPremium: user.is_premium || false,
    photoUrl: user.photo_url
  };
};

/**
 * 获取Telegram用户ID
 * @returns {string|null} 用户ID
 */
export const getTelegramUserId = () => {
  const user = getTelegramUser();
  return user ? `tg_${user.id}` : null;
};

/**
 * 检查是否在Telegram环境中
 * @returns {boolean}
 */
export const isInTelegram = () => {
  return isTelegram && telegramWebApp !== null;
};

/**
 * 获取启动参数（用于邀请链接）
 * @returns {string|null} 启动参数
 */
export const getStartParam = () => {
  if (!telegramWebApp) return null;
  return telegramWebApp.initDataUnsafe?.start_param || null;
};

/**
 * 显示主按钮
 * @param {string} text - 按钮文本
 * @param {Function} onClick - 点击回调
 */
export const showMainButton = (text, onClick) => {
  if (!telegramWebApp) return;
  
  telegramWebApp.MainButton.setText(text);
  telegramWebApp.MainButton.onClick(onClick);
  telegramWebApp.MainButton.show();
};

/**
 * 隐藏主按钮
 */
export const hideMainButton = () => {
  if (!telegramWebApp) return;
  telegramWebApp.MainButton.hide();
};

/**
 * 设置主按钮加载状态
 * @param {boolean} isLoading - 是否加载中
 */
export const setMainButtonLoading = (isLoading) => {
  if (!telegramWebApp) return;
  
  if (isLoading) {
    telegramWebApp.MainButton.showProgress();
  } else {
    telegramWebApp.MainButton.hideProgress();
  }
};

/**
 * 显示返回按钮
 * @param {Function} onClick - 点击回调
 */
export const showBackButton = (onClick) => {
  if (!telegramWebApp) return;
  
  telegramWebApp.BackButton.onClick(onClick);
  telegramWebApp.BackButton.show();
};

/**
 * 隐藏返回按钮
 */
export const hideBackButton = () => {
  if (!telegramWebApp) return;
  telegramWebApp.BackButton.hide();
};

/**
 * 关闭WebApp
 */
export const closeWebApp = () => {
  if (!telegramWebApp) return;
  telegramWebApp.close();
};

/**
 * 发送数据到Bot
 * @param {string} data - 要发送的数据
 */
export const sendDataToBot = (data) => {
  if (!telegramWebApp) return;
  telegramWebApp.sendData(data);
};

/**
 * 打开Telegram链接
 * @param {string} url - 链接地址
 */
export const openTelegramLink = (url) => {
  if (!telegramWebApp) return;
  telegramWebApp.openTelegramLink(url);
};

/**
 * 打开外部链接
 * @param {string} url - 链接地址
 */
export const openExternalLink = (url) => {
  if (!telegramWebApp) return;
  telegramWebApp.openLink(url);
};

/**
 * 显示提示
 * @param {string} message - 提示消息
 */
export const showAlert = (message) => {
  if (!telegramWebApp) {
    alert(message);
    return;
  }
  telegramWebApp.showAlert(message);
};

/**
 * 显示确认对话框
 * @param {string} message - 确认消息
 * @param {Function} callback - 回调函数
 */
export const showConfirm = (message, callback) => {
  if (!telegramWebApp) {
    const result = confirm(message);
    if (callback) callback(result);
    return;
  }
  telegramWebApp.showConfirm(message, callback);
};

/**
 * 设置头部颜色
 * @param {string} color - 颜色值（hex）
 */
export const setHeaderColor = (color) => {
  if (!telegramWebApp) return;
  telegramWebApp.setHeaderColor(color);
};

/**
 * 设置背景颜色
 * @param {string} color - 颜色值（hex）
 */
export const setBackgroundColor = (color) => {
  if (!telegramWebApp) return;
  telegramWebApp.setBackgroundColor(color);
};

/**
 * 启用关闭确认
 */
export const enableClosingConfirmation = () => {
  if (!telegramWebApp) return;
  telegramWebApp.enableClosingConfirmation();
};

/**
 * 禁用关闭确认
 */
export const disableClosingConfirmation = () => {
  if (!telegramWebApp) return;
  telegramWebApp.disableClosingConfirmation();
};

// 自动初始化（如果可用）
if (typeof window !== 'undefined') {
  // 延迟初始化，确保Telegram SDK已加载
  setTimeout(() => {
    initTelegram();
  }, 100);
}

