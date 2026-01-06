import React, { useState, useEffect } from 'react';
import { Upload, ShieldCheck, FileText, ChevronRight, MapPin, Package, Database, Settings, LogOut, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useArsenalAuth } from '../contexts/ArsenalAuthContext';
import { useAuth } from '../contexts/AuthContext';
import { submitAsset, uploadFile, getMyAssets } from '../utils/api';
import MapLocationPicker from './MapLocationPicker';
import { getProvinceList, getCitiesByProvince, getProvinceByCity } from '../utils/chinaRegions';
import CommandCenter from './CommandCenter';
import UserManagement from './UserManagement';

// --- 模拟：脱敏算法 ---
// 当老板输入信息时，实时给他展示"如果不动产上链后会变成什么样"
const generateCodeName = (city, area) => {
  if (!city) return "WAITING_INPUT...";
  const cityCode = city.slice(0, 2).toUpperCase(); // 简单模拟拼音首字母
  const sizeCode = area > 120 ? "CMD" : "BKR"; // CMD=指挥所, BKR=地堡
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `CN-${cityCode}-${sizeCode}-${randomNum}`; // 例：CN-XI-BKR-4921
};

const ArsenalEntry = ({ user: propsUser, isAdmin, useMainAuth }) => {
  const navigate = useNavigate();
  // 根据是否是管理员选择认证上下文
  const mainAuth = useAuth(); // 主站点认证
  const arsenalAuth = useArsenalAuth(); // 资产入库独立认证
  
  // 判断使用哪个认证上下文
  const user = propsUser || (useMainAuth ? mainAuth.user : arsenalAuth.user);
  const isAdminUser = isAdmin !== undefined ? isAdmin : (user?.role === 'ADMIN');
  
  // 调试日志
  React.useEffect(() => {
    console.log('[ArsenalEntry] 用户信息:', { 
      isAdminUser, 
      userRole: user?.role, 
      username: user?.username,
      hasUser: !!user
    });
  }, [isAdminUser, user]);
  
  // 判断用户是否已完全加载（非loading状态且user对象存在）
  const isUserReady = useMainAuth 
    ? (!mainAuth.loading && !!user)
    : (!arsenalAuth.loading && !!user);
  
  // 登出函数
  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      if (isAdminUser) {
        // 管理员使用主站点登出
        mainAuth.logout();
        // 清除资产入库的 token（如果有）
        localStorage.removeItem('arsenal_token');
      } else {
        // 普通用户使用资产入库登出
        arsenalAuth.logout();
      }
      // 重新加载页面，让 ArsenalProtectedRoute 自动显示登录界面
      window.location.reload();
    }
  };

  // 管理员视图模式：'review' = 审核, 'users' = 账户管理
  // 非管理员视图模式：'list' = 资产列表，'form' = 资产入库表单
  const [adminViewMode, setAdminViewMode] = useState('review'); // 管理员默认显示审核
  const [viewMode, setViewMode] = useState('list'); // 非管理员默认显示资产列表
  const [step, setStep] = useState(1); // 1: 基础信息, 2: 价值评估, 3: 提交成功
  const [assets, setAssets] = useState([]); // 资产列表
  const [assetsLoading, setAssetsLoading] = useState(true); // 资产列表加载状态
  const [formData, setFormData] = useState({
    ownerName: '',
    phone: '',
    projectName: '',
    buildingNumber: '', // 楼号
    unitNumber: '', // 门牌号
    province: '陕西省', // 默认省份
    city: '西安', // 默认城市
    area: '',
    debtPrice: '',
  });
  
  // 获取当前省份的城市列表
  const [availableCities, setAvailableCities] = useState(getCitiesByProvince('陕西省'));

  const [previewCode, setPreviewCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  // 位置信息（经纬度和地址）
  const [location, setLocation] = useState({
    lat: null,
    lng: null,
    address: ''
  });

  useEffect(() => {
    setPreviewCode(generateCodeName(formData.city, Number(formData.area) || 0));
  }, [formData.city, formData.area]);

  // 调试：检查按钮渲染
  useEffect(() => {
    if (!isAdminUser) {
      console.log('[ArsenalEntry] 非管理员用户，应该显示两个按钮 - isAdminUser:', isAdminUser, 'userRole:', user?.role);
      setTimeout(() => {
        const buttons = document.querySelectorAll('[data-button-type]');
        console.log('[ArsenalEntry] DOM 中找到的按钮数量:', buttons.length);
        buttons.forEach((btn, i) => {
          console.log(`按钮${i}:`, btn.textContent.trim(), {
            display: btn.style.display,
            width: btn.offsetWidth,
            height: btn.offsetHeight,
            visible: btn.offsetWidth > 0 && btn.offsetHeight > 0
          });
        });
      }, 100);
    }
  }, [isAdminUser, user]);

  // 管理员不需要自动跳转，而是在当前页面切换视图

  // 加载资产列表（非管理员用户）
  useEffect(() => {
    if (!isAdminUser && isUserReady && user && viewMode === 'list') {
      loadAssets();
    } else if (isAdminUser || !isUserReady) {
      // 管理员或用户信息未加载完成时，不需要加载资产列表
      if (isAdminUser) {
        setAssetsLoading(false);
      }
    }
  }, [isAdminUser, isUserReady, user, viewMode]);

  // 加载资产列表
  const loadAssets = async () => {
    if (isAdminUser) {
      // 管理员不需要加载资产列表
      setAssetsLoading(false);
      return;
    }
    
    try {
      setAssetsLoading(true);
      const response = await getMyAssets();
      if (response && response.success) {
        setAssets(response.assets || []);
      } else {
        console.warn('加载资产失败:', response?.message || '未知错误');
        setAssets([]);
      }
    } catch (err) {
      console.error('Error loading assets:', err);
      setAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  };

  // 获取状态标签
  const getStatusLabel = (status) => {
    const statusMap = {
      'MINTING': { label: '审核中', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'AVAILABLE': { label: '已上架', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'RESERVED': { label: '已预订', color: 'bg-blue-100 text-blue-800', icon: Package },
      'LOCKED': { label: '已锁定', color: 'bg-red-100 text-red-800', icon: AlertCircle },
      'REJECTED': { label: '已拒绝', color: 'bg-gray-100 text-gray-800', icon: XCircle },
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: FileText };
  };

  // 格式化日期
  const formatDate = (timestamp) => {
    if (!timestamp) return '未知';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // 如果改变的是省份，更新城市列表并重置城市选择
    if (name === 'province') {
      const cities = getCitiesByProvince(value);
      setAvailableCities(cities);
      setFormData({ 
        ...formData, 
        province: value,
        city: cities.length > 0 ? cities[0] : '' // 自动选择第一个城市
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  
  // 初始化时，根据当前城市查找省份
  useEffect(() => {
    if (formData.city && !formData.province) {
      const province = getProvinceByCity(formData.city);
      if (province) {
        setFormData(prev => ({
          ...prev,
          province: province
        }));
        setAvailableCities(getCitiesByProvince(province));
      }
    }
  }, []);

  // 处理文件上传
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
    setUploadProgress(50); // 开始上传

    try {
      // 使用 api.js 中的 uploadFile 函数
      const result = await uploadFile(file);

      if (result.success && result.file) {
        setUploadedFiles([...uploadedFiles, result.file]);
        setUploadProgress(100);
      } else {
        throw new Error(result.message || '文件上传失败');
      }
    } catch (error) {
      console.error('文件上传错误:', error);
      alert('文件上传失败: ' + (error.message || '网络错误，请稍后重试'));
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // 删除已上传的文件
  const handleRemoveFile = (index) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!agreed) {
      alert('请先阅读并同意《数字资产委托处置协议》');
      return;
    }
    
    // 验证必填字段
    if (!formData.ownerName || !formData.phone || !formData.projectName || !formData.province || !formData.city || !formData.area || !formData.debtPrice) {
      alert('请填写所有必填字段（包括省份和城市）');
      return;
    }
    
    // 验证位置信息
    if (!location.lat || !location.lng) {
      const confirmContinue = window.confirm('您尚未在地图上标注位置。位置信息将用于在首页地图上显示资产。\n\n是否继续提交（位置将使用城市中心点）？');
      if (!confirmContinue) {
        return;
      }
    }
    
    setSubmitting(true);
    try {
      // 构建完整的文件 URL（如果后端返回的是相对路径，需要拼接完整 URL）
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:10000';
      const proofDocs = uploadedFiles.map(f => {
        // 如果已经是完整 URL，直接使用；否则拼接 API_BASE_URL
        if (f.url && f.url.startsWith('http')) {
          return f.url;
        }
        return `${API_BASE_URL}${f.url || f.filename || ''}`;
      });

      // 如果用户没有选择位置，使用城市默认中心点
      let finalLat = location.lat;
      let finalLng = location.lng;
      if (!finalLat || !finalLng) {
        // 尝试从地图组件获取地址，如果地址中包含城市信息，可以尝试解析
        // 否则使用城市默认中心点（需要通过 API 获取）
        // 暂时使用西安作为默认值
        finalLat = 34.3416;
        finalLng = 108.9398;
      }

      // 构建完整的项目名称（包含楼号和门牌号）
      const fullProjectName = [
        formData.projectName,
        formData.buildingNumber ? `${formData.buildingNumber}号楼` : '',
        formData.unitNumber ? `${formData.unitNumber}室` : ''
      ].filter(Boolean).join(' ');

      const result = await submitAsset({
        ownerName: formData.ownerName,
        phone: formData.phone,
        projectName: fullProjectName, // 使用包含楼号和门牌号的完整项目名称
        buildingNumber: formData.buildingNumber || '', // 单独保存楼号
        unitNumber: formData.unitNumber || '', // 单独保存门牌号
        province: formData.province, // 添加省份信息
        city: formData.city,
        area: formData.area,
        debtPrice: formData.debtPrice,
        proofDocs: proofDocs,
        // 位置信息
        latitude: finalLat,
        longitude: finalLng,
        locationAddress: location.address || `${formData.province}${formData.city}`,
      });
      
      // 检查返回结果
      if (result.success) {
        // 更新预览代码为服务器返回的代号
        if (result.sanitizedAsset?.codeName) {
          setPreviewCode(result.sanitizedAsset.codeName);
        }
        setStep(3);
        // 提交成功后，切换到列表视图并刷新资产列表
        setTimeout(() => {
          setViewMode('list');
          setStep(1);
          loadAssets();
        }, 2000);
      } else {
        throw new Error(result.message || '提交失败');
      }
    } catch (error) {
      console.error('提交失败:', error);
      
      // 提供更详细的错误信息
      let errorMessage = error.message || '网络错误，请稍后重试';
      
      // 检查常见错误
      if (error.message?.includes('未登录') || error.message?.includes('token')) {
        errorMessage = '未登录或登录已过期，请重新登录资产入库系统';
      } else if (error.message?.includes('Missing required fields')) {
        errorMessage = '请填写所有必填字段（债权人姓名、联系电话、项目名称、省份、城市、面积、期望回款金额）';
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('网络')) {
        errorMessage = '无法连接到服务器，请检查网络连接或确认后端服务正在运行';
      } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        errorMessage = '权限不足，请确认您的账户有提交资产的权限';
      }
      
      alert(`提交失败: ${errorMessage}\n\n详细错误信息请查看浏览器控制台 (F12)`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans selection:bg-red-200">
      
      {/* === 顶部：红头文件风格 Header === */}
      <div className="bg-white border-b-4 border-red-800 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-serif font-bold text-red-900 tracking-wide flex items-center gap-2">
                <span className="text-3xl">🇨🇳</span> 
                {isAdminUser ? '管理员控制台' : '数字资产战略储备库 · 入库通道'}
              </h1>
              <p className="text-xs text-slate-500 mt-1 tracking-wider uppercase">
                {isAdminUser 
                  ? 'Administrator Console' 
                  : 'Digital Asset Strategic Reserve System (Internal Only)'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* 用户信息 */}
              <div className="hidden md:block text-right">
                <div className="text-xs font-bold text-red-700 border border-red-700 px-2 py-1 rounded">
                  内部通道
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {user?.username || user?.address || '用户'} · {user?.role || 'USER'}
                </div>
              </div>
              
              {/* 退出登录按钮 */}
              <button
                onClick={handleLogout}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                title="退出登录"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">退出</span>
              </button>
            </div>
          </div>
          
          {/* 导航按钮组 */}
          <div 
            className="flex gap-2 flex-wrap" 
            style={{ 
              display: 'flex', 
              gap: '0.5rem',
              flexWrap: 'nowrap', // 强制不换行
              overflow: 'visible', // 确保不会被裁剪
              position: 'relative',
              zIndex: 10 // 确保在最上层
            }}
          >
            {/* 管理员：在审核和账户管理之间切换 */}
            {isAdminUser ? (
              <>
                <button
                  onClick={() => setAdminViewMode('review')}
                  className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    adminViewMode === 'review'
                      ? 'bg-purple-700 hover:bg-purple-800'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                  title="审核资产"
                >
                  <ShieldCheck size={16} />
                  资产审核
                </button>
                <button
                  onClick={() => setAdminViewMode('users')}
                  className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    adminViewMode === 'users'
                      ? 'bg-blue-700 hover:bg-blue-800'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  title="账户管理"
                >
                  <Settings size={16} />
                  账户管理
                </button>
              </>
            ) : (
              <>
                {/* 非管理员用户：显示资产列表和资产入库两个按钮（所有角色都能看到） */}
                <button
                  key="asset-list-btn"
                  data-button-type="asset-list"
                  onClick={() => {
                    console.log('[ArsenalEntry] 切换到列表视图');
                    setViewMode('list');
                  }}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '120px' }}
                  title="资产列表"
                >
                  <Database size={16} />
                  <span>资产列表</span>
                </button>
                <button
                  key="asset-entry-btn"
                  data-button-type="asset-entry"
                  onClick={() => {
                    console.log('[ArsenalEntry] 切换到入库表单视图');
                    setViewMode('form');
                  }}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  style={{ 
                    display: 'flex !important', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    minWidth: '120px',
                    position: 'relative',
                    zIndex: 10,
                    visibility: 'visible',
                    opacity: 1,
                    backgroundColor: '#0891b2', // 强制设置背景色（cyan-600）
                    color: 'white',
                    marginLeft: '0.5rem' // 确保有间距
                  }}
                  title="资产入库"
                >
                  <Upload size={16} />
                  <span style={{ color: 'white' }}>资产入库</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* === 主要内容区 === */}
      <div className={isAdminUser ? '' : 'max-w-3xl mx-auto px-6 py-8'}>
        {/* 管理员：显示审核或账户管理视图 */}
        {isAdminUser ? (
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden -mt-4">
            {adminViewMode === 'review' ? (
              <div className="p-6">
                <CommandCenter hideHeader={true} />
              </div>
            ) : (
              <div className="p-6">
                <UserManagement hideHeader={true} />
              </div>
            )}
          </div>
        ) : viewMode === 'list' ? (
          /* 资产列表视图 */
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">资产列表</h2>
                  <p className="text-sm text-slate-500 mt-1">共 {assets.length} 项资产</p>
                </div>
                {/* 开发商已经在顶部导航栏有切换按钮，这里不再显示 */}
                {user?.role !== 'DEVELOPER' && (
                  <button
                    onClick={() => setViewMode('form')}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    title="资产入库"
                  >
                    <Upload size={16} />
                    资产入库
                  </button>
                )}
              </div>
            </div>
            
            {assetsLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800 mx-auto"></div>
                <p className="mt-4 text-slate-600">加载中...</p>
              </div>
            ) : assets.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">暂无资产</h3>
                <p className="text-slate-600 mb-6">您还没有提交任何资产</p>
                <button
                  onClick={() => setViewMode('form')}
                  className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-base font-medium flex items-center gap-2 mx-auto transition-colors"
                >
                  <Upload size={18} />
                  开始资产入库
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">项目名称</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">楼号/房号</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">面积 (m²)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">市场备案价 (元)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">双方结算底价 (元)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">提交时间</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">状态</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {assets.map((asset) => {
                      const raw = asset.raw;
                      const sanitized = asset.sanitized;
                      const status = sanitized?.status || raw?.status || 'UNKNOWN';
                      const statusInfo = getStatusLabel(status);
                      const StatusIcon = statusInfo.icon;
                      return (
                        <tr key={raw?.id || sanitized?.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-900">{raw?.projectName || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {raw?.buildingNumber || raw?.unitNumber 
                              ? `${raw?.buildingNumber ? raw.buildingNumber + '号楼' : ''} ${raw?.unitNumber || ''}`.trim()
                              : '-'
                            }
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{raw?.area ? `${raw.area}m²` : '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {raw?.marketValuation ? `¥${(raw.marketValuation * 10000).toLocaleString('zh-CN')}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {raw?.debtAmount ? `¥${(raw.debtAmount * 10000).toLocaleString('zh-CN')}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{formatDate(raw?.timestamp)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 ${statusInfo.color} text-xs font-semibold rounded flex items-center gap-1 w-fit`}>
                              <StatusIcon size={12} />
                              {statusInfo.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* 资产入库表单视图 */
          <>
            {/* 信任背书栏 */}
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-8 flex gap-4 items-start">
              <ShieldCheck className="text-red-700 w-6 h-6 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-red-900">国家级数据安全保障 / 资产去库存专项通道</h3>
                <p className="text-xs text-red-800/70 mt-1">
                  本系统采用军工级加密技术。您的房产信息将进行 <span className="font-bold">脱敏处理</span> 后进入全球流通网络。
                  旨在盘活存量资产，引入离岸流动性。
                </p>
              </div>
            </div>

            {/* === 表单卡片 === */}
            <div className="bg-white shadow-xl rounded-sm border border-slate-200 overflow-hidden relative">
          
          {/* 顶部进度条 */}
          <div className="h-1 bg-slate-100 w-full">
            <div 
              className="h-full bg-red-800 transition-all duration-500" 
              style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
            ></div>
          </div>

          {/* STEP 1: 基础资产登记 */}
          {step === 1 && (
            <div className="p-8 animate-fadeIn">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                <span className="bg-red-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3">1</span>
                资产基础信息登记
              </h2>

              <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">债权人姓名</label>
                    <input 
                      type="text" name="ownerName" value={formData.ownerName} onChange={handleChange}
                      className="w-full border border-slate-300 p-3 rounded focus:ring-2 focus:ring-red-800 outline-none"
                      placeholder="张三"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">联系电话</label>
                    <input 
                      type="text" name="phone" value={formData.phone} onChange={handleChange}
                      className="w-full border border-slate-300 p-3 rounded focus:ring-2 focus:ring-red-800 outline-none"
                      placeholder="139..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">项目名称 (工抵房所属楼盘)</label>
                  <input 
                    type="text" name="projectName" value={formData.projectName} onChange={handleChange}
                    className="w-full border border-slate-300 p-3 rounded focus:ring-2 focus:ring-red-800 outline-none"
                    placeholder="例：西安·曲江·xx公馆"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">楼号 (可选)</label>
                    <input 
                      type="text" name="buildingNumber" value={formData.buildingNumber} onChange={handleChange}
                      className="w-full border border-slate-300 p-3 rounded focus:ring-2 focus:ring-red-800 outline-none"
                      placeholder="例：1、2、3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">门牌号 (可选)</label>
                    <input 
                      type="text" name="unitNumber" value={formData.unitNumber} onChange={handleChange}
                      className="w-full border border-slate-300 p-3 rounded focus:ring-2 focus:ring-red-800 outline-none"
                      placeholder="例：101、201、301"
                    />
                  </div>
                </div>

                {/* 地图位置选择器 */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                    <MapPin size={16} className="text-red-800" />
                    资产位置标注（在地图上标注位置）
                  </label>
                  <div className="bg-white border border-slate-300 rounded-lg p-4">
                    <MapLocationPicker
                      city={formData.city}
                      province={formData.province} // 传递省份信息
                      address={location.address}
                      onChange={(loc) => {
                        setLocation({
                          lat: loc.lat,
                          lng: loc.lng,
                          address: loc.address || location.address
                        });
                      }}
                      defaultLat={location.lat}
                      defaultLng={location.lng}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    * 请在地图上标注资产的具体位置，或输入详细地址后点击搜索。位置信息将用于在首页地图上显示。
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">所在省份</label>
                    <select 
                      name="province" 
                      value={formData.province} 
                      onChange={handleChange}
                      className="w-full border border-slate-300 p-3 rounded focus:ring-2 focus:ring-red-800 outline-none bg-white"
                    >
                      {getProvinceList().map(province => (
                        <option key={province} value={province}>{province}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">所在城市</label>
                    <select 
                      name="city" 
                      value={formData.city} 
                      onChange={handleChange}
                      className="w-full border border-slate-300 p-3 rounded focus:ring-2 focus:ring-red-800 outline-none bg-white"
                      disabled={availableCities.length === 0}
                    >
                      {availableCities.length > 0 ? (
                        availableCities.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))
                      ) : (
                        <option value="">请先选择省份</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">建筑面积 (㎡)</label>
                    <input 
                      type="number" name="area" value={formData.area} onChange={handleChange}
                      className="w-full border border-slate-300 p-3 rounded focus:ring-2 focus:ring-red-800 outline-none"
                      placeholder="120"
                    />
                  </div>
                </div>

                {/* 实时脱敏预览 - 心理震慑点 */}
                {(formData.projectName || formData.buildingNumber || formData.unitNumber) && (
                  <div className="bg-slate-800 text-green-400 p-4 rounded font-mono text-sm mt-2 relative overflow-hidden group cursor-help">
                    <div className="absolute top-2 right-2 text-[10px] bg-green-900/50 px-2 py-0.5 rounded border border-green-700">
                      展示端预览
                    </div>
                    <div className="opacity-50 text-[10px] uppercase mb-1">Data Masking Protocol Active</div>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                      <span>
                        项目名称: {[
                          formData.projectName,
                          formData.buildingNumber ? `${formData.buildingNumber}号楼` : '',
                          formData.unitNumber ? `${formData.unitNumber}室` : ''
                        ].filter(Boolean).join(' ')} <span className="text-red-500 line-through ml-2 text-xs">HIDDEN</span>
                      </span>
                      <span className="text-white">
                         ➜ 代号: <span className="font-bold text-yellow-400">{previewCode}</span>
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-2 italic">
                      *您的房产将在平台显示为"{formData.city}战区战略储备库"，具体地址仅在交易完成后对买家可见。
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={() => setStep(2)}
                  className="bg-red-900 hover:bg-red-800 text-white px-8 py-3 rounded font-medium flex items-center transition-colors shadow-lg"
                >
                  下一步：价值评估 <ChevronRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: 价值与上传 */}
          {step === 2 && (
            <div className="p-8 animate-fadeIn">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                <span className="bg-red-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3">2</span>
                价值锚定与凭证上传
              </h2>

              <div className="grid gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">期望回款金额 (人民币/万元)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400">¥</span>
                    <input 
                      type="number" name="debtPrice" value={formData.debtPrice} onChange={handleChange}
                      className="w-full border border-slate-300 p-3 pl-8 rounded focus:ring-2 focus:ring-red-800 outline-none text-lg font-bold text-red-900"
                      placeholder="100"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    *平台将基于此价格，按汇率自动转换为离岸数字资产份额。
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">上传房产证或工抵协议</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer group relative">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {uploading ? (
                      <div>
                        <Upload className="w-10 h-10 text-red-800 mx-auto mb-3 animate-pulse" />
                        <p className="text-sm text-slate-700">上传中... {uploadProgress}%</p>
                        <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-red-800 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3 group-hover:text-red-800 transition-colors" />
                        <h3 className="text-sm font-medium text-slate-700">点击选择文件</h3>
                        <p className="text-xs text-slate-400 mt-1">支持 JPG/PDF (最大 10MB)</p>
                      </>
                    )}
                  </div>
                  
                  {/* 已上传文件列表 */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded p-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText size={16} className="text-slate-600 flex-shrink-0" />
                            <span className="text-xs text-slate-700 truncate">{file.originalName}</span>
                            <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <button
                            onClick={() => handleRemoveFile(index)}
                            className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 协议勾选 */}
                <div className="flex items-start gap-3 mt-2">
                  <input 
                    type="checkbox" 
                    className="mt-1 accent-red-900" 
                    id="agree" 
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <label htmlFor="agree" className="text-sm text-slate-600 leading-relaxed">
                    我已阅读并同意 <span className="text-red-800 font-bold underline cursor-pointer">《数字资产委托处置协议》</span>。
                    我同意平台将该资产信息进行数字化脱敏，并面向全球（含台海地区）进行权益置换。
                  </label>
                </div>
              </div>

              <div className="mt-8 flex justify-between items-center">
                <button 
                  onClick={() => setStep(1)}
                  className="text-slate-500 hover:text-slate-800 px-4 py-2 text-sm"
                >
                  返回上一步
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-red-900 hover:bg-red-800 disabled:opacity-50 text-white px-8 py-3 rounded font-medium flex items-center transition-colors shadow-lg"
                >
                  {submitting ? '提交中...' : '提交审核'} <FileText className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: 提交成功 (反馈) */}
          {step === 3 && (
            <div className="p-12 text-center animate-fadeIn">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">资料已入库，等待确权</h2>
              <p className="text-slate-500 mb-8">
                您的资产编号：<span className="font-mono font-bold text-slate-800">{previewCode}</span><br/>
                审核专员将在 24 小时内与您 ({formData.phone}) 联系。
              </p>
              
              <div className="bg-slate-50 p-4 rounded border border-slate-200 text-left text-sm text-slate-600">
                <p className="font-bold mb-2">后续流程：</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>平台审核资产真实性（线下/线上核验）</li>
                  <li>签署《资产托管协议》（电子签）</li>
                  <li>资产上链（生成 TWS-Token）</li>
                  <li>全球发售（您可在 TWS 官网看到您的资产化身为"战略储备库"）</li>
                </ol>
              </div>

              <button 
                onClick={() => window.location.reload()}
                className="mt-8 text-red-800 border border-red-800 px-6 py-2 rounded hover:bg-red-50 transition-colors"
              >
                录入下一套
              </button>
            </div>
          )}

            </div>
            
            <div className="text-center mt-8 text-slate-400 text-xs">
              &copy; 2025 Digital Asset Strategic Reserve | 陕ICP备xxxxxxxx号-1
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default ArsenalEntry;

