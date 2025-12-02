import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, createWriteStream } from 'fs';
import { getAssetById } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONTRACTS_DIR = join(__dirname, '../contracts');
if (!existsSync(CONTRACTS_DIR)) {
  mkdirSync(CONTRACTS_DIR, { recursive: true });
}

/**
 * 生成资产数字化托管协议PDF
 * @param {Object} assetData - 资产数据（包含raw和sanitized）
 * @param {Object} options - 选项
 * @returns {Promise<string>} PDF文件路径
 */
export const generateContractPDF = async (assetData, options = {}) => {
  const { raw, sanitized } = assetData;
  
  if (!raw || !sanitized) {
    throw new Error('Asset data is incomplete');
  }

  // 生成文件名
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `contract_${sanitized.id}_${timestamp}.pdf`;
  const filepath = join(CONTRACTS_DIR, filename);

  // 创建PDF文档
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 }
  });

  // 创建写入流
  const stream = createWriteStream(filepath);
  doc.pipe(stream);

  // ========== 合同头部 ==========
  doc.fontSize(20)
     .font('Helvetica-Bold')
     .text('数字资产委托处置协议', { align: 'center' });
  
  doc.moveDown(0.5);
  doc.fontSize(12)
     .font('Helvetica')
     .text('Digital Asset Entrustment Agreement', { align: 'center' });
  
  doc.moveDown(1);

  // ========== 合同编号 ==========
  doc.fontSize(10)
     .font('Helvetica')
     .text(`合同编号：TWS-${sanitized.id}`, { align: 'right' });
  
  doc.moveDown(0.5);
  doc.text(`签订日期：${new Date().toLocaleDateString('zh-CN')}`, { align: 'right' });
  
  doc.moveDown(1);

  // ========== 合同正文 ==========
  doc.fontSize(11)
     .font('Helvetica')
     .text('甲方（委托方）：', { continued: true })
     .font('Helvetica-Bold')
     .text(raw.ownerName || '_______________');
  
  doc.moveDown(0.5);
  doc.font('Helvetica')
     .text('身份证号：', { continued: true })
     .text(raw.ownerId ? `****${raw.ownerId.slice(-4)}` : '_______________');
  
  doc.moveDown(0.5);
  doc.text('联系电话：', { continued: true })
     .text(raw.contactPhone || '_______________');
  
  doc.moveDown(1);
  
  doc.text('乙方（受托方）：', { continued: true })
     .font('Helvetica-Bold')
     .text('天河计划数字资产管理平台');
  
  doc.moveDown(0.5);
  doc.font('Helvetica')
     .text('统一社会信用代码：_______________');
  
  doc.moveDown(1.5);

  // ========== 第一条 ==========
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('第一条 委托资产信息', { indent: 20 });
  
  doc.moveDown(0.5);
  doc.fontSize(11)
     .font('Helvetica')
     .text('1.1 资产代号：', { continued: true })
     .font('Helvetica-Bold')
     .text(sanitized.codeName || sanitized.displayId);
  
  doc.moveDown(0.5);
  doc.font('Helvetica')
     .text('1.2 资产类型：', { continued: true })
     .text(sanitized.zoneClass || '战略储备资产');
  
  doc.moveDown(0.5);
  doc.text('1.3 所在区域：', { continued: true })
     .text(sanitized.region || sanitized.locationTag);
  
  doc.moveDown(0.5);
  doc.text('1.4 建筑面积：', { continued: true })
     .text(`${raw.area || 0} 平方米`);
  
  doc.moveDown(0.5);
  doc.text('1.5 委托处置金额：', { continued: true })
     .font('Helvetica-Bold')
     .text(`人民币 ${(raw.debtAmount || 0).toLocaleString('zh-CN')} 万元`);
  
  doc.moveDown(1);

  // ========== 第二条 ==========
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('第二条 委托事项', { indent: 20 });
  
  doc.moveDown(0.5);
  doc.fontSize(11)
     .font('Helvetica')
     .text('甲方委托乙方对上述资产进行数字化处理、脱敏包装，并面向全球（含台海地区）进行权益置换。乙方有权将资产信息进行技术处理，以"战略储备资产"的名义进行展示和交易。', { indent: 20 });
  
  doc.moveDown(1);

  // ========== 第三条 ==========
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('第三条 权益分配', { indent: 20 });
  
  doc.moveDown(0.5);
  doc.fontSize(11)
     .font('Helvetica')
     .text('3.1 资产数字化后，将发行对应的数字资产份额（Token），总份额为：', { indent: 20 })
     .font('Helvetica-Bold')
     .text(`${sanitized.financials?.totalTokens || 0} 份`);
  
  doc.moveDown(0.5);
  doc.font('Helvetica')
     .text('3.2 甲方保留资产原始所有权，乙方负责数字化包装和全球流通。', { indent: 20 });
  
  doc.moveDown(0.5);
  doc.text('3.3 交易成功后，甲方将获得委托处置金额的相应比例收益。', { indent: 20 });
  
  doc.moveDown(1);

  // ========== 第四条 ==========
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('第四条 保密条款', { indent: 20 });
  
  doc.moveDown(0.5);
  doc.fontSize(11)
     .font('Helvetica')
     .text('4.1 乙方承诺对甲方的原始资产信息（具体地址、门牌号等）进行严格保密和脱敏处理。', { indent: 20 });
  
  doc.moveDown(0.5);
  doc.text('4.2 公开展示的资产信息仅包含脱敏后的代号、区域、面积等非敏感信息。', { indent: 20 });
  
  doc.moveDown(1);

  // ========== 第五条 ==========
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('第五条 其他约定', { indent: 20 });
  
  doc.moveDown(0.5);
  doc.fontSize(11)
     .font('Helvetica')
     .text('5.1 本协议自双方签字盖章之日起生效。', { indent: 20 });
  
  doc.moveDown(0.5);
  doc.text('5.2 本协议一式两份，甲乙双方各执一份。', { indent: 20 });
  
  doc.moveDown(1.5);

  // ========== 签字区域 ==========
  doc.fontSize(11)
     .font('Helvetica')
     .text('甲方（委托方）签字：', { indent: 20 });
  
  doc.moveDown(2);
  doc.text('_________________________', { indent: 20 });
  
  doc.moveDown(1);
  doc.text('乙方（受托方）盖章：', { indent: 20 });
  
  doc.moveDown(2);
  doc.text('_________________________', { indent: 20 });
  
  doc.moveDown(0.5);
  doc.fontSize(10)
     .text('（天河计划数字资产管理平台）', { indent: 20 });

  // ========== 页脚 ==========
  doc.fontSize(8)
     .font('Helvetica')
     .text('本协议由TWS系统自动生成，具有法律效力。', 50, doc.page.height - 50, { align: 'center' });

  // 结束文档
  doc.end();

  // 等待PDF生成完成
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      resolve(filepath);
    });
    stream.on('error', reject);
  });
};

/**
 * 根据资产ID生成合同
 * @param {string} assetId - 资产ID
 * @returns {Promise<string>} PDF文件路径
 */
export const generateContractByAssetId = async (assetId) => {
  const assetData = getAssetById(assetId);
  
  if (!assetData.raw || !assetData.sanitized) {
    throw new Error(`Asset with id ${assetId} not found`);
  }

  return await generateContractPDF(assetData);
};

