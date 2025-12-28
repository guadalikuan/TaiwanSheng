import React, { useState, useEffect, useMemo } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@project-serum/anchor';
import { Buffer } from 'buffer';

// 如果没有安装 Buffer polyfill
window.Buffer = window.Buffer || Buffer;

const PredictionHome = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [balance, setBalance] = useState(0); // TWSCoin Balance
  const [markets, setMarkets] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  
  // 模拟数据 - 实际上应该从链上 fetch
  const MOCK_MARKETS = [
    {
      id: 1,
      question: "2025年12月31日之前，解放军军机是否会飞越台湾本岛上空？",
      poolYes: 500000,
      poolNo: 200000,
      endTime: "2025-12-31",
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/J-20_at_Airshow_China_2016.jpg/1200px-J-20_at_Airshow_China_2016.jpg"
    },
    {
      id: 2,
      question: "明日 12:00-14:00，桃园/新竹地区是否会发生突发性跳电？",
      poolYes: 10000,
      poolNo: 50000,
      endTime: "2024-05-21",
      image: "https://www.taipower.com.tw/upload/244/2021051714242666542.jpg"
    },
    {
      id: 3,
      question: "赖清德明日公开发言中，是否会提及“两岸互不隶属”关键词？",
      poolYes: 88888,
      poolNo: 11111,
      endTime: "2024-05-22",
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Lai_Ching-te_Official_Photo_2024.jpg/800px-Lai_Ching-te_Official_Photo_2024.jpg"
    }
  ];

  useEffect(() => {
    checkWallet();
    setMarkets(MOCK_MARKETS);
  }, []);

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

  const handleSwipe = (direction) => {
    if (currentCardIndex >= markets.length) return;
    
    const market = markets[currentCardIndex];
    console.log(`User voted ${direction} on market ${market.id}`);
    
    // 这里调用合约下注逻辑
    placeBet(market.id, direction);

    setCurrentCardIndex(prev => prev + 1);
  };

  const placeBet = async (marketId, direction) => {
    if (!walletAddress) {
      alert("请先连接钱包！");
      return;
    }
    if (balance < 10000) {
      alert("门槛不足：你需要持有 10,000 TWSCoin 才能下注！");
      return;
    }
    
    // 模拟下注成功
    alert(`下注成功！\n盘口: ${marketId}\n方向: ${direction}\n金额: 100 TWSCoin`);
  };

  const currentMarket = markets[currentCardIndex];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center overflow-hidden relative">
      {/* 顶部导航 */}
      <div className="w-full max-w-md p-4 flex justify-between items-center z-10">
        <h1 className="text-2xl font-bold text-red-500 tracking-wider">TWS PREDICT</h1>
        <button 
          onClick={connectWallet}
          className={`px-4 py-2 rounded-full font-bold border ${walletAddress ? 'bg-green-900 border-green-500 text-green-500' : 'bg-transparent border-red-500 text-red-500'}`}
        >
          {walletAddress ? 
            `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : 
            "CONNECT PHANTOM"
          }
        </button>
      </div>

      {/* 门槛提示 */}
      {walletAddress && balance < 10000 && (
        <div className="absolute top-20 bg-red-900/80 text-red-200 px-4 py-2 rounded z-20">
          ⚠️ 权限不足：需持有 10,000 TWSCoin
        </div>
      )}

      {/* 主要卡片区域 */}
      <div className="flex-1 w-full max-w-md flex flex-col justify-center items-center relative p-4">
        {currentMarket ? (
          <div className="w-full h-[600px] bg-gray-900 rounded-3xl border-2 border-gray-700 overflow-hidden relative shadow-2xl flex flex-col">
            
            {/* 图片背景 */}
            <div className="h-1/2 w-full bg-cover bg-center relative" style={{ backgroundImage: `url(${currentMarket.image})` }}>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900"></div>
              
              {/* 胜率仪表盘 */}
              <div className="absolute bottom-[-40px] left-1/2 transform -translate-x-1/2 w-32 h-32 bg-gray-800 rounded-full border-4 border-yellow-500 flex items-center justify-center z-10 shadow-lg">
                 <div className="text-center">
                    <div className="text-xs text-gray-400">YES ODDS</div>
                    <div className="text-2xl font-black text-white">
                      {Math.round((currentMarket.poolNo / (currentMarket.poolYes + currentMarket.poolNo)) * 100 + 10)}%
                    </div>
                 </div>
              </div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 pt-12 px-6 pb-6 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-bold leading-tight mb-4">{currentMarket.question}</h2>
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>Pool: {(currentMarket.poolYes + currentMarket.poolNo).toLocaleString()} TWS</span>
                  <span>Ends: {currentMarket.endTime}</span>
                </div>
              </div>

              {/* 操作按钮 (Tinder Style) */}
              <div className="flex justify-between items-center px-4">
                <button 
                  onClick={() => handleSwipe('NO')}
                  className="w-16 h-16 rounded-full border-2 border-red-500 text-red-500 flex items-center justify-center text-xl font-bold hover:bg-red-500 hover:text-white transition-all"
                >
                  NO
                </button>
                
                <div className="text-gray-500 text-xs uppercase tracking-widest">Swipe to Bet</div>

                <button 
                  onClick={() => handleSwipe('YES')}
                  className="w-16 h-16 rounded-full border-2 border-green-500 text-green-500 flex items-center justify-center text-xl font-bold hover:bg-green-500 hover:text-white transition-all"
                >
                  YES
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <h2 className="text-xl mb-4">No more markets today.</h2>
            <p>Come back tomorrow for more chaos.</p>
          </div>
        )}
      </div>

      {/* 底部 Tab */}
      <div className="w-full max-w-md p-4 flex justify-around border-t border-gray-800 bg-gray-900/50 backdrop-blur">
        <button className="text-yellow-500 font-bold">Predict</button>
        <button className="text-gray-500">Leaderboard</button>
        <button className="text-gray-500">Profile</button>
      </div>
    </div>
  );
};

export default PredictionHome;
