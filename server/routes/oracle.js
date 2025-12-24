import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROLES } from '../utils/roles.js';
import { scanNewsSources, triggerUnification, manualScan, checkKeywords } from '../utils/oracle.js';

const router = express.Router();

// GET /api/oracle/status - 获取Oracle状态（需要管理员权限）
router.get('/status', authenticate, requireRole(ROLES.ADMIN), (req, res) => {
  try {
    res.json({
      success: true,
      status: 'active',
      keywords: [
        '联合利剑',
        '封锁',
        '统一',
        'reunification'
      ],
      lastScan: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting oracle status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get oracle status',
      message: error.message
    });
  }
});

// POST /api/oracle/scan - 手动触发扫描（需要管理员权限）
router.post('/scan', authenticate, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const results = await manualScan();
    
    res.json({
      success: true,
      message: 'Scan completed',
      results,
      count: results.length
    });
  } catch (error) {
    console.error('Error scanning:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan',
      message: error.message
    });
  }
});

// POST /api/oracle/trigger - 手动触发统一事件（需要管理员权限）
router.post('/trigger', authenticate, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { keyword } = req.body;
    
    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: 'Keyword is required'
      });
    }
    
    const result = await triggerUnification(keyword);
    
    res.json({
      success: true,
      message: 'Unification event triggered',
      result
    });
  } catch (error) {
    console.error('Error triggering unification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger unification',
      message: error.message
    });
  }
});

// POST /api/oracle/check-keywords - 检查文本中的关键词（公开接口）
router.post('/check-keywords', (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }
    
    const matched = checkKeywords(text);
    
    res.json({
      success: true,
      matched,
      count: matched.length
    });
  } catch (error) {
    console.error('Error checking keywords:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check keywords',
      message: error.message
    });
  }
});

export default router;


