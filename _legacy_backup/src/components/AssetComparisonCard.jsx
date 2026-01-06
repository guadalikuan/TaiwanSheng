import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle, Image, Package } from 'lucide-react';

const AssetComparisonCard = ({ asset, onApprove, onReject, onMintNFT, isProcessing, canReview = true, isDeveloper = false }) => {
  const navigate = useNavigate();
  const { raw, sanitized } = asset;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {/* 头部：资产ID和状态 */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-600">ID: {sanitized?.id || raw?.id}</span>
          {(() => {
            const status = sanitized?.status || raw?.status || 'UNKNOWN';
            const statusColors = {
              'MINTING': 'bg-yellow-100 text-yellow-800',
              'AVAILABLE': 'bg-green-100 text-green-800',
              'RESERVED': 'bg-blue-100 text-blue-800',
              'LOCKED': 'bg-red-100 text-red-800',
              'REJECTED': 'bg-gray-100 text-gray-800',
            };
            const statusLabels = {
              'MINTING': '审核中',
              'AVAILABLE': '已上架',
              'RESERVED': '已预订',
              'LOCKED': '已锁定',
              'REJECTED': '已拒绝',
            };
            return (
              <span className={`px-2 py-0.5 ${statusColors[status] || 'bg-gray-100 text-gray-800'} text-xs font-semibold rounded`}>
                {statusLabels[status] || status}
              </span>
            );
          })()}
        </div>
        {/* 只有有审核权限的用户才显示操作按钮 */}
        {canReview && (
          <div className="flex gap-2">
            {onMintNFT && sanitized?.status === 'AVAILABLE' && (
              <button
                onClick={() => onMintNFT(sanitized?.id || raw?.id)}
                disabled={isProcessing || sanitized?.nftMinted}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white text-xs font-semibold rounded flex items-center gap-1 transition-colors"
                title={sanitized?.nftMinted ? "NFT 已铸造" : "铸造 TWS Land NFT"}
              >
                <Image size={14} />
                {sanitized?.nftMinted ? '已铸造NFT' : '铸造NFT'}
              </button>
            )}
            {onApprove && (
              <button
                onClick={() => onApprove(sanitized?.id || raw?.id)}
                disabled={isProcessing}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs font-semibold rounded flex items-center gap-1 transition-colors"
              >
                <CheckCircle size={14} />
                批准
              </button>
            )}
            {onReject && (
              <button
                onClick={() => onReject(sanitized?.id || raw?.id)}
                disabled={isProcessing}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-semibold rounded flex items-center gap-1 transition-colors"
              >
                <XCircle size={14} />
                拒绝
              </button>
            )}
          </div>
        )}
      </div>

      {/* 内容：左右对比 */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 左侧：原始数据（红色警告风格） */}
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-600" />
            <h4 className="text-sm font-bold text-red-900">原始数据（绝密）</h4>
          </div>
          {raw ? (
            <div className="space-y-1 text-xs text-red-800">
              <p><span className="font-semibold">债权人：</span>{raw.ownerName}</p>
              <p><span className="font-semibold">联系电话：</span>{raw.contactPhone}</p>
              <p><span className="font-semibold">项目名称：</span>{raw.projectName}</p>
              <p><span className="font-semibold">城市：</span>{raw.city} {raw.district}</p>
              <p><span className="font-semibold">地址：</span>{raw.address || '未填写'}</p>
              <p><span className="font-semibold">房号：</span>{raw.roomNumber || '未填写'}</p>
              <p><span className="font-semibold">面积：</span>{raw.area} m²</p>
              <p><span className="font-semibold">工抵价：</span>¥{raw.debtAmount}万</p>
              <p><span className="font-semibold">市场价：</span>¥{raw.marketValuation}万</p>
            </div>
          ) : (
            <p className="text-xs text-red-600">原始数据缺失</p>
          )}
        </div>

        {/* 右侧：脱敏数据（绿色安全风格） */}
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-green-600" />
            <h4 className="text-sm font-bold text-green-900">脱敏数据（公开）</h4>
          </div>
          {sanitized ? (
            <div className="space-y-1 text-xs text-green-800">
              <p><span className="font-semibold">代号：</span>{sanitized.displayId || sanitized.codeName}</p>
              <p><span className="font-semibold">标题：</span>{sanitized.title}</p>
              <p><span className="font-semibold">战区：</span>{sanitized.locationTag}</p>
              <p><span className="font-semibold">安全等级：</span>{sanitized.securityLevel} 星</p>
              <p><span className="font-semibold">类型：</span>{sanitized.specs?.type || 'N/A'}</p>
              <p><span className="font-semibold">面积：</span>{sanitized.specs?.area || 'N/A'}</p>
              <p><span className="font-semibold">容量：</span>{sanitized.specs?.capacity || 'N/A'}</p>
              <p><span className="font-semibold">Token数量：</span>{sanitized.financials?.totalTokens?.toLocaleString() || 'N/A'}</p>
              <p><span className="font-semibold">状态：</span>{sanitized.status || 'MINTING'}</p>
              {/* NFT 信息 */}
              {sanitized.nftMinted && (
                <div className="mt-3 pt-3 border-t border-green-300">
                  <p className="font-semibold text-purple-700 mb-1 flex items-center gap-1">
                    <Image size={12} />
                    TWS Land NFT
                  </p>
                  {sanitized.nftTokenId && (
                    <p className="text-xs">
                      <span className="font-semibold">Token ID:</span> 
                      <span className="ml-1 font-mono">{sanitized.nftTokenId}</span>
                    </p>
                  )}
                  {sanitized.nftTxHash && (
                    <p className="text-xs truncate">
                      <span className="font-semibold">Tx Hash:</span> 
                      <span className="ml-1 font-mono">{sanitized.nftTxHash.slice(0, 16)}...</span>
                    </p>
                  )}
                  {sanitized.nftMintedAt && (
                    <p className="text-xs">
                      <span className="font-semibold">铸造时间:</span> 
                      <span className="ml-1">{new Date(sanitized.nftMintedAt).toLocaleString('zh-CN')}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-green-600">脱敏数据缺失</p>
          )}
        </div>
      </div>

      {/* 底部：提交时间和操作按钮 */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex justify-between items-center">
        {raw?.timestamp && (
          <div className="text-xs text-slate-500">
            提交时间：{new Date(raw.timestamp).toLocaleString('zh-CN')}
          </div>
        )}
        {/* 开发商账户显示资产入库按钮 */}
        {isDeveloper && (
          <button
            onClick={() => navigate('/arsenal')}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-md"
          >
            <Package size={16} />
            资产入库
          </button>
        )}
      </div>
    </div>
  );
};

export default AssetComparisonCard;
