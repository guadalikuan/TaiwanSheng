// ============================================
// 文件: server/utils/leaderboardSnapshots.js
// 排行榜快照任务
// ============================================

import { saveSnapshot, getCurrentSnapshotData } from './leaderboard.js';
import { LEADERBOARD_PERIODS } from './leaderboard.js';

/**
 * 获取日期字符串（YYYY-MM-DD）
 */
function getDateString() {
  const now = new Date();
  const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return `${utcNow.getUTCFullYear()}-${String(utcNow.getUTCMonth() + 1).padStart(2, '0')}-${String(utcNow.getUTCDate()).padStart(2, '0')}`;
}

/**
 * 获取周字符串（本周一的日期 YYYY-MM-DD）
 */
function getWeekString() {
  const now = new Date();
  const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayOfWeek = utcNow.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(utcNow);
  monday.setUTCDate(utcNow.getUTCDate() - daysToMonday);
  return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}`;
}

/**
 * 获取月字符串（YYYY-MM）
 */
function getMonthString() {
  const now = new Date();
  const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()));
  return `${utcNow.getUTCFullYear()}-${String(utcNow.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * 执行日快照
 */
async function takeDailySnapshot() {
  try {
    const dateStr = getDateString();
    const data = await getCurrentSnapshotData();
    await saveSnapshot(LEADERBOARD_PERIODS.DAY, dateStr, data);
    console.log(`✅ 日快照已保存: ${dateStr}`);
  } catch (error) {
    console.error('❌ 日快照保存失败:', error);
  }
}

/**
 * 执行周快照
 */
async function takeWeeklySnapshot() {
  try {
    const dateStr = getWeekString();
    const data = await getCurrentSnapshotData();
    await saveSnapshot(LEADERBOARD_PERIODS.WEEK, dateStr, data);
    console.log(`✅ 周快照已保存: ${dateStr}`);
  } catch (error) {
    console.error('❌ 周快照保存失败:', error);
  }
}

/**
 * 执行月快照
 */
async function takeMonthlySnapshot() {
  try {
    const dateStr = getMonthString();
    const data = await getCurrentSnapshotData();
    await saveSnapshot(LEADERBOARD_PERIODS.MONTH, dateStr, data);
    console.log(`✅ 月快照已保存: ${dateStr}`);
  } catch (error) {
    console.error('❌ 月快照保存失败:', error);
  }
}

/**
 * 执行快照任务
 * 每天0点、每周一0点、每月1号0点记录快照
 */
export async function executeSnapshotTask() {
  const now = new Date();
  const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 
                                    now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes()));
  
  // 检查是否需要执行日快照（每天0点）
  if (utcNow.getUTCHours() === 0 && utcNow.getUTCMinutes() < 5) {
    await takeDailySnapshot();
  }
  
  // 检查是否需要执行周快照（每周一0点）
  if (utcNow.getUTCDay() === 1 && utcNow.getUTCHours() === 0 && utcNow.getUTCMinutes() < 5) {
    await takeWeeklySnapshot();
  }
  
  // 检查是否需要执行月快照（每月1号0点）
  if (utcNow.getUTCDate() === 1 && utcNow.getUTCHours() === 0 && utcNow.getUTCMinutes() < 5) {
    await takeMonthlySnapshot();
  }
}
