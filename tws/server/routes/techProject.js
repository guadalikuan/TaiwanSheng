import express from 'express';
import { put, get, getAll, getAllKeys, NAMESPACES } from '../utils/rocksdb.js';
import { authenticate } from '../middleware/auth.js';
import { getUserByAddress } from '../utils/userStorage.js';

const router = express.Router();

// POST /api/tech-project/create - 创建科技项目（需认证）
router.post('/create', authenticate, async (req, res) => {
  try {
    const {
      projectName,
      description,
      category, // 技术领域：AI、区块链、生物技术等
      targetAmount, // 目标众筹金额
      minInvestment, // 最小投资额
      duration, // 项目周期（月）
      teamInfo, // 团队信息
      roadmap, // 路线图
      ipAssets, // 知识产权资产
      contactInfo
    } = req.body;

    // 验证必填字段
    if (!projectName || !description || !targetAmount || !minInvestment) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['projectName', 'description', 'targetAmount', 'minInvestment']
      });
    }

    // 获取用户钱包地址
    const walletAddress = req.user?.address;
    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        error: 'Wallet address not found',
        message: 'User wallet address is required'
      });
    }

    // 生成项目ID和代号
    const projectId = `tech_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const codeName = `TECH-${(category || 'GEN').toUpperCase().slice(0, 3)}-${Math.floor(Math.random() * 9000) + 1000}`;

    // 创建项目对象
    const project = {
      id: projectId,
      codeName,
      projectName,
      description,
      category: category || 'General',
      targetAmount: Number(targetAmount),
      currentAmount: 0, // 当前已筹集金额
      minInvestment: Number(minInvestment),
      duration: Number(duration) || 12,
      teamInfo: teamInfo || {},
      roadmap: roadmap || [],
      ipAssets: ipAssets || [], // 知识产权资产列表
      investors: [], // 投资者列表
      status: 'PENDING', // PENDING, FUNDING, FUNDED, COMPLETED, CANCELLED
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: walletAddress, // 创建者钱包地址
      contactInfo: contactInfo || {},
      // 证券化相关
      tokenized: false, // 是否已证券化
      tokenAddress: null, // 证券化代币地址
      yield: `${((Number(targetAmount) * 0.15) / 100).toFixed(1)}% APY`, // 预估收益率
      location: '科技园区', // 虚拟位置
      assetType: '科创' // 资产类型
    };

    // 保存到RocksDB
    await put(NAMESPACES.TECH_PROJECTS, projectId, project);

    res.json({
      success: true,
      message: 'Tech project created successfully',
      project: project
    });
  } catch (error) {
    console.error('Error creating tech project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tech project',
      message: error.message
    });
  }
});

// GET /api/tech-project/:id - 获取项目详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await get(NAMESPACES.TECH_PROJECTS, id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Error getting tech project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tech project',
      message: error.message
    });
  }
});

// GET /api/tech-project - 获取项目列表（支持筛选）
router.get('/', async (req, res) => {
  try {
    const { status, category } = req.query;
    
    const allProjects = await getAll(NAMESPACES.TECH_PROJECTS);
    let projects = allProjects.map(p => p.value);

    // 状态筛选
    if (status) {
      projects = projects.filter(p => p.status === status);
    }

    // 类别筛选
    if (category) {
      projects = projects.filter(p => p.category === category);
    }

    // 只返回FUNDING和FUNDED状态的项目（公开可见）
    // 如果需要查看所有项目，需要管理员权限
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'REVIEWER')) {
      projects = projects.filter(p => p.status === 'FUNDING' || p.status === 'FUNDED' || p.status === 'COMPLETED');
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

// POST /api/tech-project/:id/build-transaction - 构建投资交易（前端调用）
router.post('/:id/build-transaction', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, investorAddress } = req.body;

    if (!amount || !investorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Amount and investorAddress are required'
      });
    }

    const project = await get(NAMESPACES.TECH_PROJECTS, id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // 构建投资交易（使用tot合约的consume_to_treasury，免税）
    const { consumeToTreasury } = await import('../utils/solanaBlockchain.js');
    
    let investmentTransaction = null;
    try {
      const investmentResult = await consumeToTreasury(investorAddress, amount, 2); // ConsumeType::Other
      investmentTransaction = investmentResult.transaction;
    } catch (error) {
      console.error('构建投资交易失败:', error);
      return res.status(400).json({
        success: false,
        error: '构建投资交易失败',
        message: error.message
      });
    }

    res.json({
      success: true,
      transaction: investmentTransaction, // 投资交易（需要用户签名）
      amount: amount
    });
  } catch (error) {
    console.error('Error building transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to build transaction',
      message: error.message
    });
  }
});

// POST /api/tech-project/:id/invest - 投资项目（链上验证）
router.post('/:id/invest', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, txSignature } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid investment amount'
      });
    }

    if (!txSignature) {
      return res.status(400).json({
        success: false,
        error: 'Transaction signature is required'
      });
    }

    const project = await get(NAMESPACES.TECH_PROJECTS, id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (project.status !== 'FUNDING') {
      return res.status(400).json({
        success: false,
        error: 'Project is not accepting investments'
      });
    }

    if (amount < project.minInvestment) {
      return res.status(400).json({
        success: false,
        error: `Minimum investment is ${project.minInvestment} TaiOneToken`
      });
    }

    // 获取用户钱包地址
    const walletAddress = req.user?.address;
    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        error: 'Wallet address not found'
      });
    }

    // 验证链上交易（这里需要调用paymentVerifier）
    const { verifyPayment } = await import('../utils/paymentVerifier.js');
    const verification = await verifyPayment(txSignature, {
      from: walletAddress,
      to: project.id, // 项目收款地址
      amount: amount,
      projectId: id
    });

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed',
        message: verification.message
      });
    }

    // 记录投资
    const investment = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      projectId: id,
      investorAddress: walletAddress,
      amount: Number(amount),
      txSignature: txSignature,
      timestamp: Date.now(),
      status: 'CONFIRMED'
    };

    // 更新项目投资信息
    project.investors.push(investment);
    project.currentAmount += Number(amount);
    project.updatedAt = Date.now();

    // 检查是否达到目标金额
    if (project.currentAmount >= project.targetAmount) {
      project.status = 'FUNDED';
    }

    // 保存投资记录和更新项目
    await put(NAMESPACES.INVESTMENTS, investment.id, investment);
    await put(NAMESPACES.TECH_PROJECTS, id, project);

    // 记录推荐佣金（不影响主流程）
    try {
      const { recordCommission } = await import('../utils/referral.js');
      await recordCommission(walletAddress, Number(amount), 0.05, { immediateTransfer: true });
      console.log(`✅ 推荐佣金已记录: ${walletAddress}, 金额: ${Number(amount) * 0.05} TOT`);
    } catch (commissionError) {
      console.error('推荐佣金记录失败（不影响主流程）:', commissionError);
    }

    // 记录用户行为
    const { logAction } = await import('../utils/actionLogger.js');
    await logAction(walletAddress, 'INVEST_TECH_PROJECT', {
      projectId: id,
      amount: amount,
      txSignature: txSignature
    });

    res.json({
      success: true,
      message: 'Investment successful',
      project,
      investment
    });
  } catch (error) {
    console.error('Error investing in tech project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invest',
      message: error.message
    });
  }
});

// POST /api/tech-project/:id/tokenize - 知识产权证券化
router.post('/:id/tokenize', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const project = await get(NAMESPACES.TECH_PROJECTS, id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // 只有项目创建者或管理员可以证券化
    const walletAddress = req.user?.address;
    if (project.createdBy !== walletAddress && req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Only project creator or admin can tokenize'
      });
    }

    if (project.tokenized) {
      return res.status(400).json({
        success: false,
        error: 'Project already tokenized'
      });
    }

    // 这里应该调用智能合约进行证券化
    // 暂时标记为已证券化
    project.tokenized = true;
    project.tokenAddress = `token_${id}_${Date.now()}`;
    project.updatedAt = Date.now();

    await put(NAMESPACES.TECH_PROJECTS, id, project);

    res.json({
      success: true,
      message: 'Project tokenized successfully',
      project
    });
  } catch (error) {
    console.error('Error tokenizing project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to tokenize project',
      message: error.message
    });
  }
});

// GET /api/tech-project/:id/investors - 获取投资者列表
router.get('/:id/investors', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await get(NAMESPACES.TECH_PROJECTS, id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      investors: project.investors || []
    });
  } catch (error) {
    console.error('Error getting investors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get investors',
      message: error.message
    });
  }
});

// PUT /api/tech-project/:id - 更新项目信息（仅项目创建者）
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const project = await get(NAMESPACES.TECH_PROJECTS, id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const walletAddress = req.user?.address;
    if (project.createdBy !== walletAddress && req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Only project creator can update'
      });
    }

    // 更新允许的字段
    const allowedFields = ['description', 'teamInfo', 'roadmap', 'ipAssets', 'contactInfo'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const updatedProject = {
      ...project,
      ...updates,
      updatedAt: Date.now()
    };

    await put(NAMESPACES.TECH_PROJECTS, id, updatedProject);

    res.json({
      success: true,
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
      message: error.message
    });
  }
});

export default router;

