/**
 * 生成唯一 ID
 * 使用时间戳 + 随机数 + 计数器确保唯一性
 * @returns {string} 唯一 ID
 */
let counter = 0;

export const generateUniqueId = () => {
  counter += 1;
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${counter}`;
};

/**
 * 生成简单的唯一 ID（仅用于快速场景）
 * @returns {number} 唯一 ID（时间戳 + 随机数）
 */
export const generateSimpleUniqueId = () => {
  return Date.now() + Math.random();
};

