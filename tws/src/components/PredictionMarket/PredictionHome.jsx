import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@project-serum/anchor';
import { Buffer } from 'buffer';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSSE } from '../../contexts/SSEContext';

// 如果没有安装 Buffer polyfill
window.Buffer = window.Buffer || Buffer;

export const PREDICTION_MARKETS = [
  // 第一梯队：民生痛点
  { id: 1, category: "Livelihood", question: "明日 12:00-14:00，桃园/新竹地区是否会发生突发性跳电？", poolYes: 150000, poolNo: 300000, endTime: "2025-05-21", image: "https://www.taipower.com.tw/upload/244/2021051714242666542.jpg" },
  { id: 2, category: "Livelihood", question: "台北全联超市明日 18:00 前，普通白蛋是否会售罄？", poolYes: 80000, poolNo: 120000, endTime: "2025-05-21", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Chicken_egg_2009-06-04.jpg/1200px-Chicken_egg_2009-06-04.jpg" },
  { id: 3, category: "Livelihood", question: "明日台积电（2330）外资是净买入还是净卖出？", poolYes: 5000000, poolNo: 4200000, endTime: "2025-05-21", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/TSMC_Logo.svg/1200px-TSMC_Logo.svg.png" },
  { id: 4, category: "Livelihood", question: "未来 24 小时内，花莲海域是否会发生里氏 4.5 级以上地震？", poolYes: 200000, poolNo: 800000, endTime: "2025-05-21", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/2018_Hualien_earthquake_intensity_map.png/600px-2018_Hualien_earthquake_intensity_map.png" },
  { id: 5, category: "Livelihood", question: "明日下午，高雄市中心积水深度是否超过 10 厘米？", poolYes: 100000, poolNo: 500000, endTime: "2025-05-21", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Flooding_in_Kaohsiung.jpg/800px-Flooding_in_Kaohsiung.jpg" },
  { id: 6, category: "Livelihood", question: "本周内，台北捷运文湖线是否会再次发生信号故障停运？", poolYes: 300000, poolNo: 400000, endTime: "2025-05-27", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Taipei_Metro_Wenhu_Line_Bombardier_Innovia_APM_256_train.jpg/800px-Taipei_Metro_Wenhu_Line_Bombardier_Innovia_APM_256_train.jpg" },
  { id: 7, category: "Livelihood", question: "台南市本周新增登革热病例是否超过 100 例？", poolYes: 50000, poolNo: 20000, endTime: "2025-05-27", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Aedes_aegypti_feeding.jpg/800px-Aedes_aegypti_feeding.jpg" },
  { id: 8, category: "Livelihood", question: "明日台中火力发电厂是否全负荷运转（PM2.5 是否紫爆）？", poolYes: 600000, poolNo: 100000, endTime: "2025-05-21", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Taichung_Power_Plant.jpg/800px-Taichung_Power_Plant.jpg" },
  { id: 9, category: "Livelihood", question: "明日新台币兑美元汇率是否跌破 32.5 大关？", poolYes: 2000000, poolNo: 1500000, endTime: "2025-05-21", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/New_Taiwan_Dollar_1000_bill.jpg/800px-New_Taiwan_Dollar_1000_bill.jpg" },
  { id: 10, category: "Livelihood", question: "台湾本月法拍屋数量是否突破 500 户？", poolYes: 150000, poolNo: 300000, endTime: "2025-05-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Real_estate_sold_sign.jpg/800px-Real_estate_sold_sign.jpg" },

  // 第二梯队：政治斗兽场
  { id: 11, category: "Politics", question: "赖清德明日公开发言中，是否会提及“两岸互不隶属”关键词？", poolYes: 800000, poolNo: 200000, endTime: "2025-05-21", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Lai_Ching-te_Official_Photo_2024.jpg/800px-Lai_Ching-te_Official_Photo_2024.jpg" },
  { id: 12, category: "Politics", question: "下一次立法院会议，是否会发生肢体冲突（推挤/丢水球/勒脖子）？", poolYes: 900000, poolNo: 100000, endTime: "2025-05-25", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Legislative_Yuan_meeting_hall.jpg/800px-Legislative_Yuan_meeting_hall.jpg" },
  { id: 13, category: "Politics", question: "黄国昌委员在明日质询中，分贝是否超过 85 分贝？", poolYes: 600000, poolNo: 300000, endTime: "2025-05-21", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Huang_Kuo-chang_2019.jpg/800px-Huang_Kuo-chang_2019.jpg" },
  { id: 14, category: "Politics", question: "韩国瑜院长本周是否会爆出新的“韩式金句”？", poolYes: 400000, poolNo: 500000, endTime: "2025-05-27", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Han_Kuo-yu_2019.jpg/800px-Han_Kuo-yu_2019.jpg" },
  { id: 15, category: "Politics", question: "本月内，检调是否会二度搜查柯文哲办公室？", poolYes: 700000, poolNo: 600000, endTime: "2025-05-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Ko_Wen-je_2019.jpg/800px-Ko_Wen-je_2019.jpg" },
  { id: 16, category: "Politics", question: "本月内，是否有民进党立委被爆出婚外情或不雅视频？", poolYes: 300000, poolNo: 800000, endTime: "2025-05-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Democratic_Progressive_Party_flag.svg/800px-Democratic_Progressive_Party_flag.svg.png" },
  { id: 17, category: "Politics", question: "明日 PTT 八卦版，“王义川”相关讨论帖是否超过 50 篇？", poolYes: 200000, poolNo: 150000, endTime: "2025-05-21", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/PTT_Bulletin_Board_System_logo.svg/800px-PTT_Bulletin_Board_System_logo.svg.png" },
  { id: 18, category: "Politics", question: "本周是否会有新的高端疫苗相关弊案录音流出？", poolYes: 100000, poolNo: 900000, endTime: "2025-05-27", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Medigen_Vaccine_Biologics_logo.svg/800px-Medigen_Vaccine_Biologics_logo.svg.png" },
  { id: 19, category: "Politics", question: "赖清德在今年 520 前，是否会宣布特赦陈水扁？", poolYes: 50000, poolNo: 1000000, endTime: "2025-05-20", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Chen_Shui-bian_2008.jpg/800px-Chen_Shui-bian_2008.jpg" },
  { id: 20, category: "Politics", question: "本月内，是否有国民党地方派系宣布退党？", poolYes: 150000, poolNo: 400000, endTime: "2025-05-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Kuomintang_flag.svg/800px-Kuomintang_flag.svg.png" },

  // 第三梯队：台海红线
  { id: 21, category: "Military", question: "明日解放军绕台军机总数是否超过 30 架次？", poolYes: 500000, poolNo: 200000, endTime: "2025-05-21", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/J-20_at_Airshow_China_2016.jpg/1200px-J-20_at_Airshow_China_2016.jpg" },
  { id: 22, category: "Military", question: "明日是否会有 5 艘以上解放军军舰跨越所谓“海峡中线”？", poolYes: 400000, poolNo: 300000, endTime: "2025-05-21", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/PLAN_Type_052D_destroyer_Hefei_%28174%29.jpg/800px-PLAN_Type_052D_destroyer_Hefei_%28174%29.jpg" },
  { id: 23, category: "Military", question: "本周内，是否有大陆无人机飞越金门/马祖哨所上空？", poolYes: 300000, poolNo: 400000, endTime: "2025-05-27", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/BZK-005_UAV.jpg/800px-BZK-005_UAV.jpg" },
  { id: 24, category: "Military", question: "未来 72 小时内，山东舰航母编队是否会通过巴士海峡？", poolYes: 600000, poolNo: 500000, endTime: "2025-05-23", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Shandong_CV-17.jpg/800px-Shandong_CV-17.jpg" },
  { id: 25, category: "Military", question: "东部战区本月是否会发布带有“围岛”字样的宣传视频？", poolYes: 800000, poolNo: 100000, endTime: "2025-05-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/PLA_Eastern_Theater_Command_Emblem.svg/800px-PLA_Eastern_Theater_Command_Emblem.svg.png" },
  { id: 26, category: "Military", question: "若台海演习升级，美军里根号航母是向北航行（日本）还是向南（菲律宾）？", poolYes: 500000, poolNo: 500000, endTime: "2025-06-01", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/USS_Ronald_Reagan_%28CVN-76%29_underway_in_the_Pacific_Ocean_on_12_June_2020.jpg/800px-USS_Ronald_Reagan_%28CVN-76%29_underway_in_the_Pacific_Ocean_on_12_June_2020.jpg" },
  { id: 27, category: "Military", question: "未来 3 个月内，是否会有拉美邦交国宣布与台湾断交？", poolYes: 200000, poolNo: 600000, endTime: "2025-08-01", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Flag_of_the_Republic_of_China.svg/800px-Flag_of_the_Republic_of_China.svg.png" },
  { id: 28, category: "Military", question: "大陆商务部本月是否会宣布中止下一批 ECFA 关税减让产品？", poolYes: 700000, poolNo: 300000, endTime: "2025-05-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Ministry_of_Commerce_of_the_PRC_gate.jpg/800px-Ministry_of_Commerce_of_the_PRC_gate.jpg" },
  { id: 29, category: "Military", question: "下一个被大陆海关暂停输入的台湾农产品是：A. 凤梨释迦 B. 午仔鱼 C. 莲雾？", poolYes: 100000, poolNo: 100000, endTime: "2025-06-01", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Wax_apple.jpg/800px-Wax_apple.jpg" },
  { id: 30, category: "Military", question: "本周内，大陆海警是否会在金厦海域再次登检台湾游船？", poolYes: 400000, poolNo: 400000, endTime: "2025-05-27", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/China_Coast_Guard_Vessel_2901.jpg/800px-China_Coast_Guard_Vessel_2901.jpg" },

  // 第四梯队：国际与未来
  { id: 31, category: "International", question: "特朗普下次演讲，是否会再次提到“台湾偷走了芯片生意”？", poolYes: 900000, poolNo: 200000, endTime: "2025-05-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/800px-Donald_Trump_official_portrait.jpg" },
  { id: 32, category: "International", question: "美国承诺交付的 F-16V 战机，本月是否会宣布再次延期？", poolYes: 800000, poolNo: 200000, endTime: "2025-05-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/F-16_Fighting_Falcon.jpg/800px-F-16_Fighting_Falcon.jpg" },
  { id: 33, category: "International", question: "日本驻台协会是否会在本季度更新“在台日侨紧急撤离指南”？", poolYes: 300000, poolNo: 500000, endTime: "2025-06-30", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Flag_of_Japan.svg/800px-Flag_of_Japan.svg.png" },
  { id: 34, category: "International", question: "台积电是否会宣布在德国或美国建立新的 2nm 晶圆厂？", poolYes: 400000, poolNo: 600000, endTime: "2025-12-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/TSMC_Logo.svg/1200px-TSMC_Logo.svg.png" },
  { id: 35, category: "International", question: "本年内，是否会有东南亚国家取消对台湾的免签待遇？", poolYes: 200000, poolNo: 700000, endTime: "2025-12-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Flag_of_Vietnam.svg/800px-Flag_of_Vietnam.svg.png" },
  { id: 36, category: "International", question: "黄仁勋下周是否会访问中国大陆（上海/北京）？", poolYes: 500000, poolNo: 500000, endTime: "2025-05-27", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Jensen_Huang_at_Computex_2023.jpg/800px-Jensen_Huang_at_Computex_2023.jpg" },
  { id: 37, category: "International", question: "马斯克本月是否会在 X 上发表关于“台湾是中国一部分”的言论？", poolYes: 300000, poolNo: 800000, endTime: "2025-05-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Elon_Musk_Royal_Society_%28crop2%29.jpg/800px-Elon_Musk_Royal_Society_%28crop2%29.jpg" },
  { id: 38, category: "International", question: "台湾央行本月黄金储备量是否减少（暗示转移）？", poolYes: 100000, poolNo: 900000, endTime: "2025-05-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Gold_Bullion_Bars.jpg/800px-Gold_Bullion_Bars.jpg" },
  { id: 39, category: "International", question: "台湾百大富豪榜中，本月是否有人变更国籍为新加坡？", poolYes: 200000, poolNo: 400000, endTime: "2025-05-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Flag_of_Singapore.svg/800px-Flag_of_Singapore.svg.png" },
  { id: 40, category: "International", question: "2026 年底前，新台币是否会发行新版（去中国化设计）？", poolYes: 100000, poolNo: 800000, endTime: "2026-12-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/New_Taiwan_Dollar_1000_bill.jpg/800px-New_Taiwan_Dollar_1000_bill.jpg" },

  // 第五梯队：黑色幽默
  { id: 41, category: "Humor", question: "2028 年 1 月 1 日，台北总统府的产权归属是：A. 中华民国 B. 中华人民共和国 C. TWS 资产管理公司？", poolYes: 1000, poolNo: 1000000, endTime: "2028-01-01", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Presidential_Office_Building_Taipei.jpg/800px-Presidential_Office_Building_Taipei.jpg" },
  { id: 42, category: "Humor", question: "假如开战，台军能撑过：A. 24小时 B. 72小时 C. 1周？", poolYes: 500000, poolNo: 500000, endTime: "2025-12-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/ROCA_soldier_with_T91_assault_rifle.jpg/800px-ROCA_soldier_with_T91_assault_rifle.jpg" },
  { id: 43, category: "Humor", question: "解放军首批登陆点预测：A. 桃园竹围 B. 台北港 C. 宜兰头城？", poolYes: 300000, poolNo: 300000, endTime: "2025-12-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Port_of_Taipei.jpg/800px-Port_of_Taipei.jpg" },
  { id: 44, category: "Humor", question: "开战后，AIT（美国在台协会）直升机能带走多少人？ A. <50人 B. 100-500人 C. 仅限处长？", poolYes: 600000, poolNo: 200000, endTime: "2025-12-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/AIT_New_Compound.jpg/800px-AIT_New_Compound.jpg" },
  { id: 45, category: "Humor", question: "台北故宫翠玉白菜最终会：A. 留在台北 B. 回到北京 C. 被运往日本？", poolYes: 200000, poolNo: 400000, endTime: "2025-12-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Jadeite_Cabbage_with_Insects.jpg/800px-Jadeite_Cabbage_with_Insects.jpg" },
  { id: 46, category: "Humor", question: "台北市防空洞租金本月环比涨幅是否超过 5%？", poolYes: 50000, poolNo: 100000, endTime: "2025-05-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Air_raid_shelter_sign_in_Taipei.jpg/800px-Air_raid_shelter_sign_in_Taipei.jpg" },
  { id: 47, category: "Humor", question: "统一后，康师傅方便面在台湾的售价是：A. 涨价 B. 降价 C. 免费发放？", poolYes: 100000, poolNo: 200000, endTime: "2025-12-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Kang_Shi_Fu_Instant_Noodles.jpg/800px-Kang_Shi_Fu_Instant_Noodles.jpg" },
  { id: 48, category: "Humor", question: "您的台胞证号码最后一位是奇数还是偶数？（纯博彩）", poolYes: 500000, poolNo: 500000, endTime: "2025-12-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Mainland_Travel_Permit_for_Taiwan_Residents_%28sample%29.jpg/800px-Mainland_Travel_Permit_for_Taiwan_Residents_%28sample%29.jpg" },
  { id: 49, category: "Humor", question: "下一批公布的“台独顽固分子”名单中，是否包含名嘴于北辰？", poolYes: 800000, poolNo: 100000, endTime: "2025-05-31", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Yu_Pei-chen.jpg/800px-Yu_Pei-chen.jpg" },
  { id: 50, category: "Humor", question: "本周五收盘，TWS Coin 能否突破 $10 美元？", poolYes: 10000000, poolNo: 100000, endTime: "2025-05-24", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Cryptocurrency_Logo.svg/800px-Cryptocurrency_Logo.svg.png" },
];

const PredictionHome = () => {
  const { isAuthenticated, user } = useAuth();
  const { subscribe } = useSSE();
  const [walletAddress, setWalletAddress] = useState(null);
  const [balance, setBalance] = useState(0); // TWSCoin Balance
  
  // Initialize markets from localStorage or default
  const [markets, setMarkets] = useState(() => {
    try {
      const saved = localStorage.getItem('prediction_markets');
      return saved ? JSON.parse(saved) : PREDICTION_MARKETS;
    } catch (e) {
      return PREDICTION_MARKETS;
    }
  });

  // Save markets to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('prediction_markets', JSON.stringify(markets));
  }, [markets]);

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [adminMode, setAdminMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMarketForm, setNewMarketForm] = useState({
    question: '',
    image: '',
    category: 'General',
    poolYes: 10000,
    poolNo: 10000
  });

  const controls = useAnimation();
  const location = useLocation();
  const navigate = useNavigate();
  
  // 弹幕数据
  const [barrage, setBarrage] = useState([]);

  // 检查管理员权限
  const isAdmin = useMemo(() => {
    return user?.username === 'admin' && user?.role === 'ADMIN';
  }, [user]);

  // 真实下注数据监听 (SSE)
  useEffect(() => {
    // 订阅 prediction 频道的 bet 事件
    const unsubscribe = subscribe('prediction', (message) => {
      if (message.data && message.data.type === 'bet') {
        setBarrage(prev => {
          const newBarrage = [...prev, message.data.bet];
          // 保持最近 5 条
          if (newBarrage.length > 5) newBarrage.shift();
          return newBarrage;
        });
      }
    });
    return unsubscribe;
  }, [subscribe]);

  // 监听路由参数，定位到指定卡片
  useEffect(() => {
    checkWallet();
    
    // 如果有传入的起始ID，跳转到对应卡片
    if (location.state?.startMarketId) {
      const idx = PREDICTION_MARKETS.findIndex(m => m.id === location.state.startMarketId);
      if (idx !== -1) setCurrentCardIndex(idx);
    }
  }, [location.state]);

  const checkWallet = async () => {
    try {
      const { solana } = window;
      if (solana && solana.isPhantom) {
        const response = await solana.connect({ onlyIfTrusted: true });
        setWalletAddress(response.publicKey.toString());
        // TODO: 查询 TWSCoin 余额
        setBalance(15000); // 模拟余额 > 10000
      }
    } catch (err) {
      console.log("Phantom not connected");
    }
  };

  const connectWallet = async () => {
    const { solana } = window;
    if (solana) {
      try {
        const response = await solana.connect();
        setWalletAddress(response.publicKey.toString());
        setBalance(15000); // 模拟
      } catch (err) {
        console.error(err);
      }
    } else {
      alert("请安装 Phantom 钱包！");
      window.open("https://phantom.app/", "_blank");
    }
  };

  const handleDragEnd = (event, info) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      handleSwipe('YES');
    } else if (info.offset.x < -threshold) {
      handleSwipe('NO');
    } else {
      controls.start({ x: 0 });
    }
  };

  const handleSwipe = async (direction) => {
    if (currentCardIndex >= markets.length) return;

    // 1. 检查是否登录
    if (!isAuthenticated) {
      // 复位卡片位置（防止拖拽后卡住）
      controls.start({ x: 0, opacity: 1 });
      
      if (window.confirm("您需要登录才能参与预测下注。\n\n是否立即前往登录？")) {
        navigate('/login', { state: { from: location } });
      }
      return;
    }
    
    // 动画飞出
    await controls.start({ 
      x: direction === 'YES' ? 500 : -500, 
      opacity: 0,
      transition: { duration: 0.2 } 
    });

    const market = markets[currentCardIndex];
    console.log(`User voted ${direction} on market ${market.id}`);
    
    // 这里调用合约下注逻辑
    placeBet(market.id, direction);

    setCurrentCardIndex(prev => prev + 1);
    controls.set({ x: 0, opacity: 1 }); // 重置位置给下一张卡片
  };

  const placeBet = async (marketId, direction) => {
    if (!walletAddress) {
      // 即使没连接钱包，也允许滑动体验，但提示
      // alert("请先连接钱包！"); 
      // 为了体验流畅，暂时静默，实际部署需开启检查
      return;
    }
    if (balance < 10000) {
      alert("门槛不足：你需要持有 10,000 TWSCoin 才能下注！");
      return;
    }
    
    // 模拟下注成功
    // alert(`下注成功！\n盘口: ${marketId}\n方向: ${direction}\n金额: 100 TWSCoin`);
  };

  const handleDeleteMarket = (id) => {
    if (!isAdmin) return;
    if (window.confirm(`[GOD MODE] Delete market #${id}?`)) {
      setMarkets(prev => prev.filter(m => m.id !== id));
      // Adjust index if needed to avoid out of bounds
      if (currentCardIndex >= markets.length - 1) {
         setCurrentCardIndex(Math.max(0, markets.length - 2));
      }
    }
  };

  const handleAddMarket = (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    const newMarket = {
      id: Date.now(),
      ...newMarketForm,
      endTime: "2025-12-31" // Default end time
    };
    
    setMarkets(prev => [...prev, newMarket]);
    setShowAddModal(false);
    setNewMarketForm({
        question: '',
        image: '',
        category: 'General',
        poolYes: 10000,
        poolNo: 10000
    });
    alert("New market added!");
  };

  const handleForceResolve = (marketId, outcome) => {
    if (!isAdmin) return;
    const confirm = window.confirm(`[GOD MODE] Are you sure you want to FORCE RESOLVE market #${marketId} to ${outcome}? This action is irreversible.`);
    if (confirm) {
        alert(`[GOD MODE] Market #${marketId} has been resolved to ${outcome}. \nSettlement distributed to winning pool.`);
        // 这里未来可以对接实际合约调用
        // await program.methods.resolveMarket(outcome).accounts({...}).rpc();
    }
  };

  const currentMarket = markets[currentCardIndex];

  // 计算当前卡片的赔率
  const currentOdds = currentMarket ? {
    yes: (currentMarket.poolNo / currentMarket.poolYes + 1).toFixed(2),
    no: (currentMarket.poolYes / currentMarket.poolNo + 1).toFixed(2)
  } : { yes: 1, no: 1 };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center overflow-hidden relative font-sans">
      
      {/* 动态背景图层 */}
      <div className="absolute inset-0 opacity-20 pointer-events-none z-0" 
           style={{
             backgroundImage: "radial-gradient(circle at 50% 50%, #1a1a1a 0%, #000000 100%)",
             backgroundSize: "cover"
           }}>
      </div>

      {/* 顶部导航 */}
      <div className="w-full max-w-md p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black to-transparent">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black text-red-600 tracking-tighter italic" style={{ textShadow: "0 0 10px rgba(220, 38, 38, 0.5)" }}>
            TWS <span className="text-white">WAR ROOM</span>
          </h1>
          <span className="text-xs text-gray-500 tracking-widest">GEOPOLITICAL CASINO</span>
        </div>
        
        <button 
          onClick={connectWallet}
          className={`px-3 py-1 text-sm rounded-sm font-bold border ${walletAddress ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-red-900/20 border-red-500 text-red-500 animate-pulse'}`}
        >
          {walletAddress ? 
            `● ${walletAddress.slice(0, 4)}..${walletAddress.slice(-4)}` : 
            "[ CONNECT WALLET ]"
          }
        </button>
      </div>

      {/* 弹幕区域 */}
      <div className="w-full max-w-md h-24 overflow-hidden relative z-0 pointer-events-none">
        <AnimatePresence>
          {barrage.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="absolute w-full text-xs text-green-400/70 px-4 py-1 font-mono"
              style={{ top: `${(i % 3) * 20}px` }}
            >
              {`> ${msg.text}`}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 主要卡片区域 */}
      <div className="flex-1 w-full max-w-md flex flex-col justify-center items-center relative p-4 z-10">
        <AnimatePresence mode='wait'>
          {currentMarket ? (
            <motion.div
              key={currentMarket.id}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={handleDragEnd}
              animate={controls}
              className="w-full h-[550px] bg-gray-900 rounded-xl border border-gray-700 overflow-hidden relative shadow-2xl flex flex-col cursor-grab active:cursor-grabbing"
              style={{
                boxShadow: "0 20px 50px -12px rgba(0, 0, 0, 0.5)"
              }}
            >
              
              {/* 图片背景 */}
              <div className="h-3/5 w-full bg-cover bg-center relative group" style={{ backgroundImage: `url(${currentMarket.image})` }}>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-900"></div>
                
                {/* 类别标签 */}
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-2 py-1 rounded text-xs font-bold border border-white/20 uppercase">
                  {currentMarket.category}
                </div>

                {/* 滑动提示覆盖层 */}
                <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                   <div className="bg-red-600/80 text-white font-black text-2xl px-4 py-2 transform -rotate-12 rounded border-4 border-white">NO</div>
                   <div className="bg-green-600/80 text-white font-black text-2xl px-4 py-2 transform rotate-12 rounded border-4 border-white">YES</div>
                </div>

                {/* 胜率仪表盘 (中心悬浮) */}
                <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-20 w-full justify-center px-4">
                   {/* NO ODDS */}
                   <div className="bg-red-900/90 backdrop-blur border border-red-500 p-2 rounded w-20 text-center shadow-lg">
                      <div className="text-[10px] text-red-300">NO PAYOUT</div>
                      <div className="text-xl font-black text-white">{currentOdds.no}x</div>
                   </div>

                   {/* VS Badge */}
                   <div className="w-16 h-16 bg-gray-800 rounded-full border-4 border-yellow-500 flex items-center justify-center shadow-xl z-30">
                      <span className="font-black text-yellow-500 text-xl italic">VS</span>
                   </div>

                   {/* YES ODDS */}
                   <div className="bg-green-900/90 backdrop-blur border border-green-500 p-2 rounded w-20 text-center shadow-lg">
                      <div className="text-[10px] text-green-300">YES PAYOUT</div>
                      <div className="text-xl font-black text-white">{currentOdds.yes}x</div>
                   </div>
                </div>
              </div>

              {/* 内容区域 */}
              <div className="flex-1 pt-14 px-6 pb-6 flex flex-col justify-between bg-gray-900">
                <div>
                  <h2 className="text-xl font-bold leading-tight mb-3 line-clamp-3 text-white">
                    {currentMarket.question}
                  </h2>
                  
                  {/* 进度条 */}
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden flex mb-2">
                    <div 
                      className="h-full bg-green-500" 
                      style={{ width: `${(currentMarket.poolYes / (currentMarket.poolYes + currentMarket.poolNo)) * 100}%` }}
                    ></div>
                    <div 
                      className="h-full bg-red-500" 
                      style={{ width: `${(currentMarket.poolNo / (currentMarket.poolYes + currentMarket.poolNo)) * 100}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-400 font-mono">
                    <span>YES POOL: ${(currentMarket.poolYes/1000).toFixed(1)}k</span>
                    <span>NO POOL: ${(currentMarket.poolNo/1000).toFixed(1)}k</span>
                  </div>
                </div>

                {/* 底部操作指引 */}
                <div className="text-center">
                  <p className="text-gray-500 text-xs uppercase tracking-widest mb-2 animate-pulse">
                    &larr; Swipe Left (NO) &nbsp; | &nbsp; Swipe Right (YES) &rarr;
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center text-gray-500 py-20"
            >
              <h2 className="text-3xl font-black text-white mb-4">MISSION COMPLETE</h2>
              <p className="mb-8">All targets engaged for today.</p>
              <button 
                onClick={() => setCurrentCardIndex(0)}
                className="px-6 py-3 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition"
              >
                RELOAD TARGETS
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 上帝模式入口 (仅管理员可见) */}
      {isAdmin && (
        <div 
          className="absolute top-0 right-0 w-10 h-10 z-50 cursor-default"
          onClick={() => setAdminMode(!adminMode)}
          title="God Mode"
        ></div>
      )}

      {/* 底部状态栏 */}
      <div className="w-full max-w-md p-3 flex justify-between border-t border-gray-800 bg-black text-xs font-mono text-gray-600 z-10">
        <span>STATUS: ONLINE</span>
        <span>BURNED: 1,204,500 TWS</span>
      </div>
      
      {/* 上帝模式面板 */}
      {adminMode && isAdmin && (
        <div className="absolute inset-0 bg-black/95 z-50 p-6 flex flex-col overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-yellow-500">GOD MODE</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700"
                    >
                        + ADD MARKET
                    </button>
                    <button onClick={() => setAdminMode(false)} className="text-gray-500 hover:text-white">CLOSE</button>
                </div>
            </div>
            
            {markets.map(m => (
                <div key={m.id} className="border border-gray-800 p-4 mb-4 rounded bg-gray-900">
                    <div className="flex justify-between mb-2">
                        <span className="text-xs text-gray-500">ID: {m.id}</span>
                        <button 
                            onClick={() => handleDeleteMarket(m.id)}
                            className="text-red-500 text-xs hover:underline"
                        >
                            DELETE
                        </button>
                    </div>
                    <p className="text-sm text-gray-300 mb-2 truncate">{m.question}</p>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleForceResolve(m.id, 'YES')}
                            className="flex-1 bg-green-900 text-green-500 py-2 text-xs font-bold border border-green-700 hover:bg-green-700 hover:text-white transition-colors"
                        >
                            FORCE YES
                        </button>
                        <button 
                            onClick={() => handleForceResolve(m.id, 'NO')}
                            className="flex-1 bg-red-900 text-red-500 py-2 text-xs font-bold border border-red-700 hover:bg-red-700 hover:text-white transition-colors"
                        >
                            FORCE NO
                        </button>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* Add Market Modal */}
      {showAddModal && isAdmin && (
        <div className="absolute inset-0 bg-black/95 z-[60] p-6 flex items-center justify-center">
            <form onSubmit={handleAddMarket} className="bg-gray-900 p-6 rounded-lg border border-gray-700 w-full max-w-md">
                <h3 className="text-xl font-bold text-white mb-4">Add New Market</h3>
                
                <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1">Question</label>
                    <input 
                        type="text" 
                        required
                        className="w-full bg-black border border-gray-700 p-2 text-white rounded focus:border-blue-500 outline-none"
                        value={newMarketForm.question}
                        onChange={e => setNewMarketForm({...newMarketForm, question: e.target.value})}
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1">Image URL</label>
                    <input 
                        type="text" 
                        required
                        className="w-full bg-black border border-gray-700 p-2 text-white rounded focus:border-blue-500 outline-none"
                        value={newMarketForm.image}
                        onChange={e => setNewMarketForm({...newMarketForm, image: e.target.value})}
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1">Category</label>
                    <select 
                        className="w-full bg-black border border-gray-700 p-2 text-white rounded focus:border-blue-500 outline-none"
                        value={newMarketForm.category}
                        onChange={e => setNewMarketForm({...newMarketForm, category: e.target.value})}
                    >
                        <option value="Livelihood">Livelihood</option>
                        <option value="Politics">Politics</option>
                        <option value="Military">Military</option>
                        <option value="International">International</option>
                        <option value="Humor">Humor</option>
                    </select>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button 
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="px-4 py-2 text-gray-400 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700"
                    >
                        Create Market
                    </button>
                </div>
            </form>
        </div>
      )}
    </div>
  );
};

export default PredictionHome;