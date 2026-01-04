import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getAll, NAMESPACES } from '../utils/rocksdb.js';
import { getUserInvestments } from '../utils/investmentManager.js';
import { getSanitizedAssets } from '../utils/storage.js';

const router = express.Router();

/**
 * 获取用户的所有资产数据（聚合）
 * GET /api/my-assets/all
 */
router.get('/all', authenticate, async (req, res) => {
  try {
    const { walletAddress } = req.query;
    const userAddress = (walletAddress || req.user?.address)?.toLowerCase();

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    // 并行获取所有数据
    const [allAssets, allAuctions, allBets, allInvestments] = await Promise.all([
      getSanitizedAssets(),
      getAll(NAMESPACES.AUCTIONS),
      getAll(NAMESPACES.PREDICTION_BETS),
      getAll(NAMESPACES.INVESTMENTS)
    ]);

    // 筛选购买的资产（purchasedBy === userAddress 且 status === 'RESERVED'）
    const purchasedAssets = allAssets
      .filter(asset => 
        asset.purchasedBy?.toLowerCase() === userAddress && 
        asset.status === 'RESERVED'
      )
      .map(asset => ({
        ...asset,
        type: 'asset',
        timestamp: asset.purchasedAt || asset.createdAt || 0
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    // 筛选参与的拍卖（owner === userAddress）
    const myAuctions = allAuctions
      .map(item => item.value)
      .filter(auction => auction.owner?.toLowerCase() === userAddress)
      .map(auction => ({
        ...auction,
        type: 'auction',
        timestamp: new Date(auction.lastSeizedAt || auction.createdAt || 0).getTime()
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    // 筛选预测下注（walletAddress === userAddress）
    const myBets = allBets
      .map(item => item.value)
      .filter(bet => bet.walletAddress?.toLowerCase() === userAddress)
      .map(bet => ({
        ...bet,
        type: 'bet',
        timestamp: new Date(bet.timestamp || 0).getTime()
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    // 获取所有项目信息
    const allProjects = await getAll(NAMESPACES.TECH_PROJECTS);
    const projectsMap = new Map();
    allProjects.forEach(item => {
      projectsMap.set(item.value.id, item.value);
    });

    // 筛选投资记录（investorAddress === userAddress）
    const myInvestments = allInvestments
      .map(item => item.value)
      .filter(inv => inv.investorAddress?.toLowerCase() === userAddress)
      .map(inv => {
        const project = projectsMap.get(inv.projectId);
        return {
          ...inv,
          type: 'investment',
          timestamp: inv.timestamp || 0,
          projectName: project?.projectName || `項目 #${inv.projectId}`,
          projectCodeName: project?.codeName || null
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      success: true,
      data: {
        purchasedAssets,
        auctions: myAuctions,
        bets: myBets,
        investments: myInvestments,
        counts: {
          assets: purchasedAssets.length,
          auctions: myAuctions.length,
          bets: myBets.length,
          investments: myInvestments.length
        }
      }
    });
  } catch (error) {
    console.error('Error getting all user assets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user assets',
      message: error.message
    });
  }
});

/**
 * 获取用户购买的资产
 * GET /api/my-assets/purchased
 */
router.get('/purchased', authenticate, async (req, res) => {
  try {
    const { walletAddress } = req.query;
    const userAddress = (walletAddress || req.user?.address)?.toLowerCase();

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const allAssets = await getSanitizedAssets();
    const purchasedAssets = allAssets
      .filter(asset => 
        asset.purchasedBy?.toLowerCase() === userAddress && 
        asset.status === 'RESERVED'
      )
      .map(asset => ({
        ...asset,
        timestamp: asset.purchasedAt || asset.createdAt || 0
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      success: true,
      data: purchasedAssets
    });
  } catch (error) {
    console.error('Error getting purchased assets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get purchased assets',
      message: error.message
    });
  }
});

/**
 * 获取用户参与的拍卖
 * GET /api/my-assets/auctions
 */
router.get('/auctions', authenticate, async (req, res) => {
  try {
    const { walletAddress } = req.query;
    const userAddress = (walletAddress || req.user?.address)?.toLowerCase();

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const allAuctions = await getAll(NAMESPACES.AUCTIONS);
    const myAuctions = allAuctions
      .map(item => item.value)
      .filter(auction => auction.owner?.toLowerCase() === userAddress)
      .map(auction => ({
        ...auction,
        timestamp: new Date(auction.lastSeizedAt || auction.createdAt || 0).getTime()
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      success: true,
      data: myAuctions
    });
  } catch (error) {
    console.error('Error getting user auctions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user auctions',
      message: error.message
    });
  }
});

/**
 * 获取用户的预测下注记录
 * GET /api/my-assets/bets
 */
router.get('/bets', authenticate, async (req, res) => {
  try {
    const { walletAddress } = req.query;
    const userAddress = (walletAddress || req.user?.address)?.toLowerCase();

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const allBets = await getAll(NAMESPACES.PREDICTION_BETS);
    const myBets = allBets
      .map(item => item.value)
      .filter(bet => bet.walletAddress?.toLowerCase() === userAddress)
      .map(bet => ({
        ...bet,
        timestamp: new Date(bet.timestamp || 0).getTime()
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      success: true,
      data: myBets
    });
  } catch (error) {
    console.error('Error getting user bets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user bets',
      message: error.message
    });
  }
});

/**
 * 获取用户的投资记录（复用investments路由的逻辑）
 * GET /api/my-assets/investments
 */
router.get('/investments', authenticate, async (req, res) => {
  try {
    const { walletAddress } = req.query;
    const userAddress = walletAddress || req.user?.address;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const investments = await getUserInvestments(userAddress);
    
    // 获取项目信息
    const allProjects = await getAll(NAMESPACES.TECH_PROJECTS);
    const projectsMap = new Map();
    allProjects.forEach(item => {
      projectsMap.set(item.value.id, item.value);
    });
    
    // 为投资记录添加项目信息
    const investmentsWithProjects = investments.map(inv => {
      const project = projectsMap.get(inv.projectId);
      return {
        ...inv,
        projectName: project?.projectName || `項目 #${inv.projectId}`,
        projectCodeName: project?.codeName || null
      };
    });

    res.json({
      success: true,
      data: investmentsWithProjects
    });
  } catch (error) {
    console.error('Error getting user investments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get investments',
      message: error.message
    });
  }
});

export default router;

