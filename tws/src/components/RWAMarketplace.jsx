import React, { useState, useEffect } from 'react';
import { getOrderBook, getMyOrders, createSellOrder, createBuyOrder, cancelOrder, getTradeHistory } from '../utils/api';

const RWAMarketplace = () => {
  const [orderBook, setOrderBook] = useState({ buys: [], sells: [] });
  const [myOrders, setMyOrders] = useState([]);
  const [trades, setTrades] = useState([]);
  const [activeTab, setActiveTab] = useState('orderbook');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // 每10秒刷新
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [orderBookResult, ordersResult, tradesResult] = await Promise.all([
        getOrderBook(),
        getMyOrders(),
        getTradeHistory()
      ]);

      if (orderBookResult.success) {
        setOrderBook(orderBookResult.orderBook || { buys: [], sells: [] });
      }
      if (ordersResult.success) {
        setMyOrders(ordersResult.orders || []);
      }
      if (tradesResult.success) {
        setTrades(tradesResult.trades || []);
      }
    } catch (error) {
      console.error('Error loading marketplace data:', error);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('确定要取消这个订单吗？')) {
      return;
    }

    setLoading(true);
    try {
      const result = await cancelOrder(orderId);
      if (result.success) {
        setMessage('订单已取消');
        loadData();
      } else {
        setMessage(result.message || '取消失败');
      }
    } catch (error) {
      setMessage('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-red-500">RWA二级市场</h2>

      {message && (
        <div className={`p-3 rounded mb-4 ${
          message.includes('成功') || message.includes('已') ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
        }`}>
          {message}
        </div>
      )}

      <div className="flex space-x-2 mb-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('orderbook')}
          className={`px-4 py-2 ${activeTab === 'orderbook' ? 'border-b-2 border-red-500 text-red-500' : 'text-gray-400'}`}
        >
          订单簿
        </button>
        <button
          onClick={() => setActiveTab('myorders')}
          className={`px-4 py-2 ${activeTab === 'myorders' ? 'border-b-2 border-red-500 text-red-500' : 'text-gray-400'}`}
        >
          我的订单
        </button>
        <button
          onClick={() => setActiveTab('trades')}
          className={`px-4 py-2 ${activeTab === 'trades' ? 'border-b-2 border-red-500 text-red-500' : 'text-gray-400'}`}
        >
          交易历史
        </button>
      </div>

      {activeTab === 'orderbook' && (
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-green-400">买单</h3>
            <div className="space-y-2">
              {orderBook.buys.length === 0 ? (
                <p className="text-gray-400 text-sm">暂无买单</p>
              ) : (
                orderBook.buys.map((order) => (
                  <div key={order.id} className="p-3 border border-gray-700 rounded bg-gray-900">
                    <div className="flex justify-between">
                      <span className="text-green-400 font-semibold">{order.price} TOT</span>
                      <span className="text-gray-400 text-sm">{order.amount} 份</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">城市: {order.preferredCity || '不限'}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-red-400">卖单</h3>
            <div className="space-y-2">
              {orderBook.sells.length === 0 ? (
                <p className="text-gray-400 text-sm">暂无卖单</p>
              ) : (
                orderBook.sells.map((order) => (
                  <div key={order.id} className="p-3 border border-gray-700 rounded bg-gray-900">
                    <div className="flex justify-between">
                      <span className="text-red-400 font-semibold">{order.price} TOT</span>
                      <span className="text-gray-400 text-sm">{order.amount} 份</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">资产ID: {order.assetId?.substring(0, 20)}...</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'myorders' && (
        <div>
          {myOrders.length === 0 ? (
            <p className="text-gray-400">暂无订单</p>
          ) : (
            <div className="space-y-2">
              {myOrders.map((order) => (
                <div key={order.id} className="p-4 border border-gray-700 rounded bg-gray-900">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">
                        {order.orderType === 'buy' ? '买单' : '卖单'} - {order.price} TOT
                      </p>
                      <p className="text-sm text-gray-400">
                        数量: {order.amount} | 
                        已成交: {order.filledAmount || 0} | 
                        状态: {order.status === 'pending' ? '待成交' : order.status === 'filled' ? '已成交' : '已取消'}
                      </p>
                    </div>
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={loading}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm disabled:opacity-50"
                      >
                        取消
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'trades' && (
        <div>
          {trades.length === 0 ? (
            <p className="text-gray-400">暂无交易记录</p>
          ) : (
            <div className="space-y-2">
              {trades.map((trade) => (
                <div key={trade.id} className="p-4 border border-gray-700 rounded bg-gray-900">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">{trade.price} TOT × {trade.amount}</p>
                      <p className="text-sm text-gray-400">
                        {new Date(trade.timestamp).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <span className="text-green-400">成交</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RWAMarketplace;

