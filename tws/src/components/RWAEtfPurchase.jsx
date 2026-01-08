import React, { useState, useEffect } from 'react';
import { getEtfList, getEtfDetail, buyEtf } from '../utils/api';

const RWAEtfPurchase = () => {
  const [etfs, setEtfs] = useState([]);
  const [selectedEtf, setSelectedEtf] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadEtfs();
  }, []);

  const loadEtfs = async () => {
    try {
      const result = await getEtfList();
      if (result.success) {
        setEtfs(result.etfs || []);
      }
    } catch (error) {
      console.error('Error loading ETFs:', error);
    }
  };

  const handleSelectEtf = async (etfId) => {
    try {
      const result = await getEtfDetail(etfId);
      if (result.success) {
        setSelectedEtf(result.etf);
      }
    } catch (error) {
      console.error('Error loading ETF detail:', error);
    }
  };

  const handleBuy = async () => {
    if (!selectedEtf || !investmentAmount) {
      setMessage('请选择ETF并输入投资金额');
      return;
    }

    if (Number(investmentAmount) < selectedEtf.minInvestment) {
      setMessage(`最小投资额为 ${selectedEtf.minInvestment} TOT`);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await buyEtf(selectedEtf.id, Number(investmentAmount), null);
      if (result.success) {
        setMessage('ETF购买成功！');
        setInvestmentAmount('');
        setSelectedEtf(null);
      } else {
        setMessage(result.message || '购买失败');
      }
    } catch (error) {
      setMessage('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-red-500">RWA ETF购买</h2>

      {message && (
        <div className={`p-3 rounded mb-4 ${
          message.includes('成功') ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ETF列表 */}
        <div>
          <h3 className="text-lg font-semibold mb-4">可用ETF</h3>
          <div className="space-y-2">
            {etfs.length === 0 ? (
              <p className="text-gray-400">暂无可用ETF</p>
            ) : (
              etfs.map((etf) => (
                <div
                  key={etf.id}
                  onClick={() => handleSelectEtf(etf.id)}
                  className={`p-4 border rounded cursor-pointer transition-colors ${
                    selectedEtf?.id === etf.id
                      ? 'border-red-500 bg-red-900/20'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                  }`}
                >
                  <h4 className="font-semibold">{etf.name}</h4>
                  <p className="text-sm text-gray-400 mt-1">{etf.description}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    包含 {etf.assetIds.length} 个资产 | 
                    城市: {etf.cities.join(', ') || '全部'} | 
                    最小投资: {etf.minInvestment} TOT
                  </p>
                  {etf.matchScore !== undefined && (
                    <p className="text-xs text-green-400 mt-1">
                      匹配度: {etf.matchScore.toFixed(1)}%
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ETF详情和购买 */}
        <div>
          {selectedEtf ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">{selectedEtf.name}</h3>
              <div className="p-4 border border-gray-700 rounded bg-gray-900 mb-4">
                <p className="text-sm text-gray-400 mb-4">{selectedEtf.description}</p>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">投资金额 (TOT)</label>
                  <input
                    type="number"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                    min={selectedEtf.minInvestment}
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-800 text-white"
                    placeholder={`最小: ${selectedEtf.minInvestment} TOT`}
                  />
                </div>

                {selectedEtf.assets && selectedEtf.assets.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">资产组合:</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedEtf.assets.map((asset, idx) => (
                        <div key={asset.id} className="p-2 bg-gray-800 rounded text-xs">
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-300">{asset.codeName || asset.id}</span>
                            <span className="text-gray-400">
                              权重: {(selectedEtf.weights[idx] * 100).toFixed(1)}%
                            </span>
                          </div>
                          {investmentAmount && (
                            <p className="text-gray-500">
                              预计投资: {(Number(investmentAmount) * selectedEtf.weights[idx]).toFixed(2)} TOT
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleBuy}
                  disabled={loading || !investmentAmount}
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  {loading ? '购买中...' : '购买ETF'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">
              请选择一个ETF查看详情
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RWAEtfPurchase;

