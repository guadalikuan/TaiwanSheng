import React, { useState, useEffect } from 'react';
import { Upload, ShieldCheck, FileText, ChevronRight } from 'lucide-react';
import { submitAsset } from '../utils/api';

// --- 模拟：脱敏算法 ---
// 当老板输入信息时，实时给他展示"如果不动产上链后会变成什么样"
const generateCodeName = (city, area) => {
  if (!city) return "WAITING_INPUT...";
  const cityCode = city.slice(0, 2).toUpperCase(); // 简单模拟拼音首字母
  const sizeCode = area > 120 ? "CMD" : "BKR"; // CMD=指挥所, BKR=地堡
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `CN-${cityCode}-${sizeCode}-${randomNum}`; // 例：CN-XI-BKR-4921
};

const ArsenalEntry = () => {
  const [step, setStep] = useState(1); // 1: 基础信息, 2: 价值评估, 3: 提交成功
  const [formData, setFormData] = useState({
    ownerName: '',
    phone: '',
    projectName: '',
    city: '西安', // 默认值
    area: '',
    debtPrice: '',
  });

  const [previewCode, setPreviewCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    setPreviewCode(generateCodeName(formData.city, Number(formData.area) || 0));
  }, [formData.city, formData.area]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/arsenal/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('文件上传失败');
      }

      const result = await response.json();
      if (result.success) {
        setUploadedFiles([...uploadedFiles, result.file]);
        setUploadProgress(100);
      } else {
        throw new Error(result.message || '文件上传失败');
      }
    } catch (error) {
      console.error('文件上传错误:', error);
      alert('文件上传失败: ' + error.message);
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
    if (!formData.ownerName || !formData.phone || !formData.projectName || !formData.city || !formData.area || !formData.debtPrice) {
      alert('请填写所有必填字段');
      return;
    }
    
    setSubmitting(true);
    try {
      const result = await submitAsset({
        ownerName: formData.ownerName,
        phone: formData.phone,
        projectName: formData.projectName,
        city: formData.city,
        area: formData.area,
        debtPrice: formData.debtPrice,
        proofDocs: uploadedFiles.map(f => f.url),
      });
      
      // 更新预览代码为服务器返回的代号
      if (result.sanitizedAsset?.codeName) {
        setPreviewCode(result.sanitizedAsset.codeName);
      }
      
      setSubmitting(false);
      setStep(3);
    } catch (error) {
      console.error('提交失败:', error);
      alert('提交失败: ' + (error.message || '网络错误，请稍后重试'));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans selection:bg-red-200">
      
      {/* === 顶部：红头文件风格 Header === */}
      <div className="bg-white border-b-4 border-red-800 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-red-900 tracking-wide flex items-center gap-2">
              <span className="text-3xl">🇨🇳</span> 
              数字资产战略储备库 · 入库通道
            </h1>
            <p className="text-xs text-slate-500 mt-1 tracking-wider uppercase">
              Digital Asset Strategic Reserve System (Internal Only)
            </p>
          </div>
          <div className="hidden md:block text-right">
            <div className="text-xs font-bold text-red-700 border border-red-700 px-2 py-1 rounded">
              内部通道
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Ver 2.0.4 CN</div>
          </div>
        </div>
      </div>

      {/* === 主要内容区 === */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">所在城市</label>
                    <select 
                      name="city" value={formData.city} onChange={handleChange}
                      className="w-full border border-slate-300 p-3 rounded focus:ring-2 focus:ring-red-800 outline-none bg-white"
                    >
                      <option value="西安">陕西 - 西安</option>
                      <option value="咸阳">陕西 - 咸阳</option>
                      <option value="宝鸡">陕西 - 宝鸡</option>
                      <option value="商洛">陕西 - 商洛</option>
                      <option value="其他">其他城市</option>
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
                {formData.projectName && (
                  <div className="bg-slate-800 text-green-400 p-4 rounded font-mono text-sm mt-2 relative overflow-hidden group cursor-help">
                    <div className="absolute top-2 right-2 text-[10px] bg-green-900/50 px-2 py-0.5 rounded border border-green-700">
                      展示端预览
                    </div>
                    <div className="opacity-50 text-[10px] uppercase mb-1">Data Masking Protocol Active</div>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                      <span>
                        项目名称: {formData.projectName} <span className="text-red-500 line-through ml-2 text-xs">HIDDEN</span>
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

      </div>
    </div>
  );
};

export default ArsenalEntry;

