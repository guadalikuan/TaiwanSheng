import { put, get, NAMESPACES } from './rocksdb.js';

/**
 * 初始化预置的 TWS 科创项目
 * 确保本项目始终作为第一个待投资的科创项目
 */
export const initTWSMainProject = async () => {
  try {
    const PROJECT_ID = 'tws_main_project'; // 使用固定ID确保唯一性
    
    // 检查项目是否已存在
    const existingProject = await get(NAMESPACES.TECH_PROJECTS, PROJECT_ID);
    
    if (existingProject) {
      // 如果已存在，确保状态为 FUNDING 并更新信息
      existingProject.status = 'FUNDING';
      existingProject.updatedAt = Date.now();
      await put(NAMESPACES.TECH_PROJECTS, PROJECT_ID, existingProject);
      console.log('✅ TWS 主项目已更新');
      return;
    }
    
    // 创建新的预置项目
    const twsProject = {
      id: PROJECT_ID,
      codeName: 'TWS-MAIN-0001',
      projectName: 'TaiwanSheng (TWS) 区块链平台',
      description: 'TaiwanSheng 是一个基于区块链技术的数字主权平台，旨在通过序态规制战实现台湾和平统一。项目包含九大核心模块：数字身份认证、数字钱包、爱国信誉积分、营业执照数字化、税费减免、两岸商贸联通、资本市场建设、自治社区和省内选举。',
      category: 'Blockchain',
      targetAmount: 10000000, // 目标金额：1000万 TaiOneToken
      currentAmount: 0,
      minInvestment: 100, // 最小投资额：100 TaiOneToken
      duration: 36, // 项目周期：36个月
      teamInfo: {
        name: 'TaiwanSheng 开发团队',
        description: '致力于通过区块链技术推进祖国统一的专业团队'
      },
      roadmap: [
        { phase: 1, title: '平台基础建设', description: '完成核心区块链基础设施和智能合约开发', timeline: 'Q1-Q2 2025' },
        { phase: 2, title: '九大模块开发', description: '逐步实现数字身份、钱包、积分等核心功能', timeline: 'Q3-Q4 2025' },
        { phase: 3, title: '生态建设', description: '吸引用户、企业和开发者加入平台生态', timeline: '2026' },
        { phase: 4, title: '规模化运营', description: '实现大规模用户增长和资产上链', timeline: '2027+' }
      ],
      ipAssets: [
        { name: '序态规制战理论', type: '理论创新', description: '基于区块链的数字主权理论体系' },
        { name: 'TWS 区块链协议', type: '技术专利', description: '专为数字主权设计的区块链协议' }
      ],
      investors: [],
      status: 'FUNDING', // 始终处于募资状态
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'system', // 系统预置
      contactInfo: {
        email: 'contact@taiwansheng.org',
        website: 'https://github.com/taiwansheng'
      },
      tokenized: false,
      tokenAddress: null,
      yield: '15.0% APY', // 预估收益率
      location: '数字主权空间',
      assetType: '科创',
      isPinned: true, // 标记为置顶项目
      priority: 0 // 最高优先级，确保排序时在最前面
    };
    
    await put(NAMESPACES.TECH_PROJECTS, PROJECT_ID, twsProject);
    console.log('✅ TWS 主项目已初始化并置顶');
  } catch (error) {
    console.error('❌ 初始化 TWS 主项目失败:', error);
  }
};

