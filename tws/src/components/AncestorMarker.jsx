import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { MapPin, Home, Upload, X, Check, Loader, FileText, Eye } from 'lucide-react';
import { AMAP_CONFIG, loadAMapScript } from '../config/amap';
import { 
  markAncestorOrigin, 
  markAncestorProperty, 
  getAncestorMarks, 
  uploadAncestorProof 
} from '../utils/api';

const AncestorMarker = () => {
  const { type } = useParams(); // 'origin' 或 'property'
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const currentMarkerRef = useRef(null);
  const existingMarkersRef = useRef([]);

  const [location, setLocation] = useState({ lat: 34.3416, lng: 108.9398 }); // 默认西安
  const [submitting, setSubmitting] = useState(false);
  const [marks, setMarks] = useState([]);
  const [showMarks, setShowMarks] = useState(true);
  const [selectedMark, setSelectedMark] = useState(null);

  // 表单数据
  const [formData, setFormData] = useState({
    province: '',
    city: '',
    district: '',
    address: '',
    // 祖籍字段
    familyName: '',
    generation: '',
    ancestorName: '',
    migrationHistory: '',
    // 祖产字段
    propertyType: '',
    area: '',
    propertyName: '',
    ownershipInfo: '',
    currentStatus: '',
    estimatedValue: '',
    proofFiles: []
  });

  const [uploading, setUploading] = useState(false);

  // 初始化地图
  useEffect(() => {
    const initMap = async () => {
      await loadAMapScript();
      if (!window.AMap || !mapContainerRef.current) return;

      try {
        const map = new window.AMap.Map(mapContainerRef.current, {
          zoom: 8,
          center: [location.lng, location.lat],
          mapStyle: AMAP_CONFIG.defaultStyleId || 'amap://styles/darkblue',
          resizeEnable: true,
          showLabel: true,
          dragEnable: true,
          doubleClickZoom: true,
        });
        mapRef.current = map;

        // 点击地图添加标记
        map.on('click', (e) => {
          const { lng, lat } = e.lnglat;
          setLocation({ lat, lng });
          updateMarker(lat, lng);
        });

        // 加载已标记的位置
        loadExistingMarks();
      } catch (error) {
        console.error('地图初始化失败:', error);
      }
    };

    initMap();
  }, []);

  // 更新标记
  const updateMarker = (lat, lng) => {
    if (!mapRef.current || !window.AMap) return;

    // 移除旧标记
    if (currentMarkerRef.current) {
      currentMarkerRef.current.setMap(null);
    }

    // 创建新标记
    const marker = new window.AMap.Marker({
      position: [lng, lat],
      draggable: true,
      cursor: 'move',
      icon: new window.AMap.Icon({
        size: new window.AMap.Size(40, 40),
        image: 'data:image/svg+xml;base64,' + btoa(`
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="15" fill="#ef4444" stroke="#fff" stroke-width="2"/>
            <circle cx="20" cy="20" r="8" fill="#fff"/>
          </svg>
        `),
        imageSize: new window.AMap.Size(40, 40)
      })
    });

    marker.setMap(mapRef.current);
    currentMarkerRef.current = marker;

    // 拖拽事件
    marker.on('dragend', (e) => {
      const { lng, lat } = e.lnglat;
      setLocation({ lat, lng });
    });
  };

  // 加载已标记的位置
  const loadExistingMarks = async () => {
    if (!publicKey) return;

    try {
      const result = await getAncestorMarks(publicKey.toString(), type);
      if (result.success && result.data) {
        setMarks(result.data);
        // 在地图上显示已标记的位置
        result.data.forEach(mark => {
          if (mark.location && mark.location.lat && mark.location.lng) {
            addExistingMarker(mark);
          }
        });
      }
    } catch (error) {
      console.error('加载已标记位置失败:', error);
    }
  };

  // 添加已存在的标记
  const addExistingMarker = (mark) => {
    if (!mapRef.current || !window.AMap) return;

    const marker = new window.AMap.Marker({
      position: [mark.location.lng, mark.location.lat],
      draggable: false,
      icon: new window.AMap.Icon({
        size: new window.AMap.Size(30, 30),
        image: 'data:image/svg+xml;base64,' + btoa(`
          <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
            <circle cx="15" cy="15" r="12" fill="#10b981" stroke="#fff" stroke-width="2"/>
            <circle cx="15" cy="15" r="6" fill="#fff"/>
          </svg>
        `),
        imageSize: new window.AMap.Size(30, 30)
      })
    });

    marker.on('click', () => {
      setSelectedMark(mark);
    });

    marker.setMap(mapRef.current);
    existingMarkersRef.current.push(marker);
  };

  // 文件上传
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('只支持 JPG、PNG 和 PDF 文件');
      return;
    }

    // 验证文件大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过 10MB');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadAncestorProof(file);
      if (result.success && result.file) {
        setFormData(prev => ({
          ...prev,
          proofFiles: [...prev.proofFiles, result.file.url]
        }));
      } else {
        throw new Error(result.message || '上传失败');
      }
    } catch (error) {
      console.error('文件上传失败:', error);
      alert('文件上传失败: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // 删除文件
  const handleRemoveFile = (index) => {
    setFormData(prev => ({
      ...prev,
      proofFiles: prev.proofFiles.filter((_, i) => i !== index)
    }));
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!publicKey) {
      alert('请先连接钱包');
      return;
    }

    if (!location.lat || !location.lng) {
      alert('请在地图上标记位置');
      return;
    }

    setSubmitting(true);
    try {
      const submitData = {
        walletAddress: publicKey.toString(),
        location,
        province: formData.province,
        city: formData.city,
        district: formData.district,
        address: formData.address,
        proofFiles: formData.proofFiles
      };

      if (type === 'origin') {
        submitData.familyName = formData.familyName;
        submitData.generation = formData.generation;
        submitData.ancestorName = formData.ancestorName;
        submitData.migrationHistory = formData.migrationHistory;
        
        const result = await markAncestorOrigin(submitData);
        if (result.success) {
          alert('祖籍标记成功！');
          navigate('/app');
        } else {
          throw new Error(result.message || '标记失败');
        }
      } else {
        submitData.propertyType = formData.propertyType;
        submitData.area = formData.area ? Number(formData.area) : 0;
        submitData.propertyName = formData.propertyName;
        submitData.ownershipInfo = formData.ownershipInfo;
        submitData.currentStatus = formData.currentStatus;
        submitData.estimatedValue = formData.estimatedValue ? Number(formData.estimatedValue) : 0;
        
        const result = await markAncestorProperty(submitData);
        if (result.success) {
          alert('祖产标记成功！');
          navigate('/app');
        } else {
          throw new Error(result.message || '标记失败');
        }
      }
    } catch (error) {
      console.error('提交失败:', error);
      alert('提交失败: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isOrigin = type === 'origin';

  return (
    <div className="min-h-screen bg-black text-gray-300 flex flex-col">
      {/* 顶部导航 */}
      <div className="bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-mono text-white">
            {isOrigin ? '标记大陆祖籍' : '标记大陆祖产'}
          </h1>
        </div>
        <div className="text-xs font-mono text-gray-500">
          位置: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧地图 */}
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="w-full h-full" />
          <div className="absolute top-4 left-4 bg-black/80 p-2 rounded text-xs font-mono">
            <div>点击地图标记位置</div>
            <div>可拖拽标记调整位置</div>
          </div>
        </div>

        {/* 右侧表单 */}
        <div className="w-96 bg-gray-900 border-l border-gray-800 overflow-y-auto">
          <div className="p-4 space-y-4">
            <h2 className="text-sm font-mono text-gray-400 mb-4">填写信息</h2>

            {/* 地理位置 */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-500">省份</label>
              <input
                type="text"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                placeholder="可选"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-500">城市</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                placeholder="可选"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-500">区县</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                placeholder="可选"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-500">详细地址</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                placeholder="可选"
              />
            </div>

            {/* 祖籍字段 */}
            {isOrigin && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-mono text-gray-500">姓氏</label>
                  <input
                    type="text"
                    value={formData.familyName}
                    onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                    placeholder="可选"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-gray-500">世代</label>
                  <input
                    type="text"
                    value={formData.generation}
                    onChange={(e) => setFormData({ ...formData, generation: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                    placeholder="可选"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-gray-500">祖先姓名</label>
                  <input
                    type="text"
                    value={formData.ancestorName}
                    onChange={(e) => setFormData({ ...formData, ancestorName: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                    placeholder="可选"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-gray-500">迁徙历史</label>
                  <textarea
                    value={formData.migrationHistory}
                    onChange={(e) => setFormData({ ...formData, migrationHistory: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 h-20 resize-none"
                    placeholder="可选"
                  />
                </div>
              </>
            )}

            {/* 祖产字段 */}
            {!isOrigin && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-mono text-gray-500">房产类型</label>
                  <select
                    value={formData.propertyType}
                    onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="">请选择（可选）</option>
                    <option value="住宅">住宅</option>
                    <option value="商铺">商铺</option>
                    <option value="土地">土地</option>
                    <option value="其他">其他</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-gray-500">面积（平方米）</label>
                  <input
                    type="number"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                    placeholder="可选"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-gray-500">房产名称</label>
                  <input
                    type="text"
                    value={formData.propertyName}
                    onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                    placeholder="可选"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-gray-500">产权信息</label>
                  <textarea
                    value={formData.ownershipInfo}
                    onChange={(e) => setFormData({ ...formData, ownershipInfo: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 h-20 resize-none"
                    placeholder="可选"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-gray-500">当前状态</label>
                  <select
                    value={formData.currentStatus}
                    onChange={(e) => setFormData({ ...formData, currentStatus: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="">请选择（可选）</option>
                    <option value="自用">自用</option>
                    <option value="出租">出租</option>
                    <option value="空置">空置</option>
                    <option value="其他">其他</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-gray-500">估值（万元）</label>
                  <input
                    type="number"
                    value={formData.estimatedValue}
                    onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                    placeholder="可选"
                  />
                </div>
              </>
            )}

            {/* 文件上传 */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-500">证明文件</label>
              <div className="space-y-2">
                <label className="flex items-center justify-center gap-2 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm cursor-pointer hover:bg-gray-700 transition-colors">
                  <Upload className="w-4 h-4" />
                  {uploading ? '上传中...' : '上传文件'}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                {formData.proofFiles.map((url, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-800 rounded px-2 py-1 text-xs">
                    <span className="truncate flex-1">{url.split('/').pop()}</span>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="text-red-500 hover:text-red-400 ml-2"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 提交按钮 */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-mono py-3 rounded transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  提交标记
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 底部已标记列表 */}
      {marks.length > 0 && (
        <div className="bg-gray-900 border-t border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-mono text-gray-400">已标记列表 ({marks.length})</h3>
            <button
              onClick={() => setShowMarks(!showMarks)}
              className="text-xs font-mono text-gray-500 hover:text-gray-300"
            >
              {showMarks ? '隐藏' : '显示'}
            </button>
          </div>
          {showMarks && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {marks.map((mark) => (
                <div
                  key={mark.id}
                  className="bg-gray-800 border border-gray-700 rounded p-2 text-xs cursor-pointer hover:border-red-500 transition-colors"
                  onClick={() => {
                    setSelectedMark(mark);
                    if (mapRef.current && mark.location) {
                      mapRef.current.setCenter([mark.location.lng, mark.location.lat]);
                      mapRef.current.setZoom(12);
                    }
                  }}
                >
                  <div className="font-mono text-white mb-1">
                    {mark.type === 'origin' ? '祖籍' : '祖产'}
                  </div>
                  <div className="text-gray-400 truncate">
                    {mark.city || mark.province || '未知位置'}
                  </div>
                  <div className="text-gray-500 text-[10px] mt-1">
                    {new Date(mark.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 详情弹窗 */}
      {selectedMark && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setSelectedMark(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-mono text-white">
                {selectedMark.type === 'origin' ? '祖籍详情' : '祖产详情'}
              </h3>
              <button onClick={() => setSelectedMark(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500 font-mono">位置:</span>
                <span className="text-white ml-2">
                  {selectedMark.province} {selectedMark.city} {selectedMark.district}
                </span>
              </div>
              {selectedMark.type === 'origin' && (
                <>
                  {selectedMark.familyName && (
                    <div>
                      <span className="text-gray-500 font-mono">姓氏:</span>
                      <span className="text-white ml-2">{selectedMark.familyName}</span>
                    </div>
                  )}
                  {selectedMark.ancestorName && (
                    <div>
                      <span className="text-gray-500 font-mono">祖先姓名:</span>
                      <span className="text-white ml-2">{selectedMark.ancestorName}</span>
                    </div>
                  )}
                </>
              )}
              {selectedMark.type === 'property' && (
                <>
                  {selectedMark.propertyType && (
                    <div>
                      <span className="text-gray-500 font-mono">房产类型:</span>
                      <span className="text-white ml-2">{selectedMark.propertyType}</span>
                    </div>
                  )}
                  {selectedMark.area > 0 && (
                    <div>
                      <span className="text-gray-500 font-mono">面积:</span>
                      <span className="text-white ml-2">{selectedMark.area} 平方米</span>
                    </div>
                  )}
                </>
              )}
              {selectedMark.proofFiles && selectedMark.proofFiles.length > 0 && (
                <div>
                  <span className="text-gray-500 font-mono">证明文件:</span>
                  <div className="mt-2 space-y-1">
                    {selectedMark.proofFiles.map((url, index) => (
                      <a
                        key={index}
                        href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}${url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-red-500 hover:text-red-400 text-xs"
                      >
                        <FileText className="w-3 h-3" />
                        {url.split('/').pop()}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {selectedMark.chainTxHash && (
                <div>
                  <span className="text-gray-500 font-mono">上链哈希:</span>
                  <span className="text-white ml-2 font-mono text-xs break-all">{selectedMark.dataHash}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AncestorMarker;

