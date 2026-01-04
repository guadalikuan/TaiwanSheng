import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PREDICTION_MARKETS } from './PredictionHome';

const BettingHistory = () => {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, fetch from backend
    // const fetchHistory = async () => {
    //   try {
    //     const res = await fetch(`/api/prediction/history/${publicKey.toString()}`);
    //     setHistory(await res.json());
    //   } catch (e) { ... }
    // };

    // For now, load from localStorage if available, or show mock data
    const loadHistory = () => {
      setLoading(true);
      setTimeout(() => {
        const localData = localStorage.getItem('tws_betting_history');
        if (localData) {
           try {
             const parsed = JSON.parse(localData);
             // Filter by current wallet
             if (publicKey) {
                const userHistory = parsed.filter(item => item.walletAddress === publicKey.toString());
                setHistory(userHistory);
             } else {
                setHistory([]);
             }
           } catch(e) {
             setHistory([]);
           }
        } else {
            setHistory([]);
        }
        setLoading(false);
      }, 500);
    };

    loadHistory();
  }, [publicKey]);

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button 
            onClick={() => navigate('/predict')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold ml-4">My Betting History</h1>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center mt-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No betting history found.</p>
            <p className="text-sm mt-2">Place your first bet on the prediction market!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((bet, index) => {
               // Find market details if available (mock)
               const market = PREDICTION_MARKETS.find(m => m.id === bet.marketId);
               return (
                <div key={index} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs px-2 py-1 rounded ${bet.direction === 'Yes' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      Voted {bet.direction}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(bet.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-medium text-sm mb-2 line-clamp-2">
                    {market ? market.question : `Market #${bet.marketId}`}
                  </h3>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Amount</span>
                    <span className="font-mono font-bold text-yellow-500">{bet.amount} TaiOneToken</span>
                  </div>
                </div>
               );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BettingHistory;
