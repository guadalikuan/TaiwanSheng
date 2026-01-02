import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROLES } from '../utils/roles.js';
import { getAll, getAllKeys, get, put, NAMESPACES } from '../utils/rocksdb.js';
import { getAllAssets, getAssetsByType, getAssetsByStatus } from '../utils/storage.js';
import { getAllActions } from '../utils/actionLogger.js';

const router = express.Router();

// 所有路由需要管理员权限
router.use(authenticate);
router.use(requireRole(ROLES.ADMIN));

// GET /api/admin/assets - 获取所有资产（分页、筛选）
router.get('/assets', async (req, res) => {
  try {
    const { type, status, page = 1, limit = 50 } = req.query;
    
    let assets = [];
    if (type) {
      assets = await getAssetsByType(type);
    } else {
      const allAssets = await getAllAssets();
      assets = allAssets.sanitized;
    }

    if (status) {
      assets = assets.filter(a => a.status === status);
    }

    // 分页
    const start = (page - 1) * limit;
    const end = start + parseInt(limit);
    const paginatedAssets = assets.slice(start, end);

    res.json({
      success: true,
      assets: paginatedAssets,
      total: assets.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error getting admin assets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get assets',
      message: error.message
    });
  }
});

// POST /api/admin/assets - 批量创建资产
router.post('/assets', async (req, res) => {
  try {
    const { assets } = req.body;
    
    if (!Array.isArray(assets)) {
      return res.status(400).json({
        success: false,
        error: 'Assets must be an array'
      });
    }

    const { saveRawAsset, saveSanitizedAsset } = await import('../utils/storage.js');
    const { wrapAsset } = await import('../utils/assetWrapperFactory.js');

    const savedAssets = [];
    for (const assetData of assets) {
      const rawAsset = await saveRawAsset(assetData);
      const sanitizedAsset = wrapAsset(rawAsset);
      sanitizedAsset.id = rawAsset.id;
      sanitizedAsset.assetType = assetData.assetType || '房产';
      const saved = await saveSanitizedAsset(sanitizedAsset);
      savedAssets.push(saved);
    }

    res.json({
      success: true,
      message: `Created ${savedAssets.length} assets`,
      assets: savedAssets
    });
  } catch (error) {
    console.error('Error creating assets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create assets',
      message: error.message
    });
  }
});

// PUT /api/admin/assets/:id - 更新资产
router.put('/assets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { updateRawAsset, updateAssetStatus } = await import('../utils/storage.js');
    
    if (updates.raw) {
      await updateRawAsset(id, updates.raw);
    }
    
    if (updates.status) {
      await updateAssetStatus(id, updates.status, {
        reviewedBy: req.user?.username || 'admin',
        reviewNotes: updates.reviewNotes || ''
      });
    }

    res.json({
      success: true,
      message: 'Asset updated successfully'
    });
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update asset',
      message: error.message
    });
  }
});

// GET /api/admin/tech-projects - 获取所有项目
router.get('/tech-projects', async (req, res) => {
  try {
    const { status, category } = req.query;
    
    const allProjects = await getAll(NAMESPACES.TECH_PROJECTS);
    let projects = allProjects.map(p => p.value);

    if (status) {
      projects = projects.filter(p => p.status === status);
    }

    if (category) {
      projects = projects.filter(p => p.category === category);
    }

    res.json({
      success: true,
      projects: projects.sort((a, b) => b.createdAt - a.createdAt)
    });
  } catch (error) {
    console.error('Error getting tech projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tech projects',
      message: error.message
    });
  }
});

// PUT /api/admin/tech-projects/:id - 更新项目状态
router.put('/tech-projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;

    const project = await get(NAMESPACES.TECH_PROJECTS, id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const updatedProject = {
      ...project,
      status: status || project.status,
      updatedAt: Date.now(),
      reviewNotes: reviewNotes || project.reviewNotes
    };

    await put(NAMESPACES.TECH_PROJECTS, id, updatedProject);

    res.json({
      success: true,
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Error updating tech project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
      message: error.message
    });
  }
});

// GET /api/admin/investments - 获取投资记录
router.get('/investments', async (req, res) => {
  try {
    const { walletAddress, projectId, limit = 100 } = req.query;
    
    const allInvestments = await getAll(NAMESPACES.INVESTMENTS);
    let investments = allInvestments.map(inv => inv.value);

    if (walletAddress) {
      investments = investments.filter(inv => 
        inv.investorAddress.toLowerCase() === walletAddress.toLowerCase()
      );
    }

    if (projectId) {
      investments = investments.filter(inv => inv.projectId === projectId);
    }

    investments.sort((a, b) => b.timestamp - a.timestamp);
    investments = investments.slice(0, parseInt(limit));

    res.json({
      success: true,
      investments
    });
  } catch (error) {
    console.error('Error getting investments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get investments',
      message: error.message
    });
  }
});

// GET /api/admin/user-actions - 获取用户行为日志
router.get('/user-actions', async (req, res) => {
  try {
    const { walletAddress, actionType, limit = 100 } = req.query;
    
    const result = await getAllActions({
      walletAddress: walletAddress || null,
      actionType: actionType || null,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      actions: result.actions,
      total: result.total
    });
  } catch (error) {
    console.error('Error getting user actions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user actions',
      message: error.message
    });
  }
});

export default router;

