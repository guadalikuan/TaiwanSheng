import express from 'express';
import { getTargetTime } from '../utils/timeManager.js';

const router = express.Router();

/**
 * @api {get} /api/open/countdown 获取当前倒计时
 * @apiName GetCountdown
 * @apiGroup OpenAPI
 * @apiDescription 获取全人类命运共同体倒计时（The Final Countdown）
 * @apiVersion 1.0.0
 * 
 * @apiSuccess {String} targetTime 目标时间 (ISO 8601)
 * @apiSuccess {Number} targetTimeMs 目标时间戳 (毫秒)
 * @apiSuccess {String} serverTime 服务器当前时间 (ISO 8601)
 * @apiSuccess {Number} serverTimeMs 服务器当前时间戳 (毫秒)
 * @apiSuccess {Number} remainingMs 剩余时间 (毫秒)
 * @apiSuccess {Number} remainingSeconds 剩余时间 (秒)
 * @apiSuccess {Boolean} isExpired 是否已结束
 */
router.get('/countdown', (req, res) => {
  try {
    const targetTimeMs = getTargetTime();
    const now = Date.now();
    const remainingMs = Math.max(0, targetTimeMs - now);

    res.json({
      success: true,
      data: {
        targetTime: new Date(targetTimeMs).toISOString(),
        targetTimeMs: targetTimeMs,
        serverTime: new Date(now).toISOString(),
        serverTimeMs: now,
        remainingMs: remainingMs,
        remainingSeconds: Math.floor(remainingMs / 1000),
        isExpired: remainingMs <= 0
      },
      meta: {
        api_version: "1.0.0",
        documentation_url: "https://tws-fronted.zeabur.app/docs" // Placeholder
      }
    });
  } catch (error) {
    console.error('OpenAPI Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error'
    });
  }
});

export default router;
