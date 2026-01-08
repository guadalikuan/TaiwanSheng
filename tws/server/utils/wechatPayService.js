/**
 * 微信支付服务
 * 支持Native扫码支付
 */

import crypto from 'crypto';
import https from 'https';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 微信支付配置
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || '';
const WECHAT_MCH_ID = process.env.WECHAT_MCH_ID || '';
const WECHAT_API_KEY = process.env.WECHAT_API_KEY || '';
const WECHAT_API_V3_KEY = process.env.WECHAT_API_V3_KEY || '';
const WECHAT_NOTIFY_URL = process.env.WECHAT_NOTIFY_URL || `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/tot-purchase/callback/wechat`;

// 证书路径（可选，如果使用证书）
const WECHAT_CERT_PATH = process.env.WECHAT_CERT_PATH || '';
const WECHAT_KEY_PATH = process.env.WECHAT_KEY_PATH || '';

// 微信支付API地址
const WECHAT_API_BASE = process.env.WECHAT_API_BASE || 'https://api.mch.weixin.qq.com';

/**
 * 生成随机字符串
 */
function generateNonceStr(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成签名（MD5）
 */
function generateSign(params, apiKey) {
  const sortedKeys = Object.keys(params).filter(k => k !== 'sign' && params[k] !== '').sort();
  const stringA = sortedKeys.map(k => `${k}=${params[k]}`).join('&');
  const stringSignTemp = `${stringA}&key=${apiKey}`;
  return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
}

/**
 * 验证签名
 */
export function verifySign(params, apiKey) {
  const sign = params.sign;
  delete params.sign;
  const calculatedSign = generateSign(params, apiKey);
  return sign === calculatedSign;
}

/**
 * 创建Native扫码支付订单
 * @param {Object} orderData - 订单数据
 * @param {string} orderData.outTradeNo - 商户订单号
 * @param {number} orderData.totalAmount - 支付金额（分，新台币转换为分）
 * @param {string} orderData.description - 商品描述
 * @returns {Promise<Object>} 支付订单信息
 */
export async function createNativeOrder(orderData) {
  const {
    outTradeNo,
    totalAmount, // 金额（新台币）
    description = 'TOT游戏点卡购买'
  } = orderData;

  // 将新台币转换为分（微信支付以分为单位）
  // 注意：如果微信支付不支持TWD，可能需要转换为CNY
  const amountInCents = Math.floor(totalAmount * 100); // TWD转分

  const params = {
    appid: WECHAT_APP_ID,
    mch_id: WECHAT_MCH_ID,
    nonce_str: generateNonceStr(),
    body: description,
    out_trade_no: outTradeNo,
    total_fee: amountInCents,
    spbill_create_ip: '127.0.0.1', // 服务器IP
    notify_url: WECHAT_NOTIFY_URL,
    trade_type: 'NATIVE',
    product_id: outTradeNo
  };

  // 生成签名
  params.sign = generateSign(params, WECHAT_API_KEY);

  // 构建XML请求
  const xml = buildXML(params);

  try {
    // 调用微信支付统一下单API
    const response = await makeRequest(`${WECHAT_API_BASE}/pay/unifiedorder`, xml);
    const result = parseXML(response);

    if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
      return {
        success: true,
        codeUrl: result.code_url, // 支付二维码URL
        prepayId: result.prepay_id,
        outTradeNo: outTradeNo
      };
    } else {
      throw new Error(result.err_code_des || result.return_msg || '创建订单失败');
    }
  } catch (error) {
    console.error('微信支付创建订单失败:', error);
    throw error;
  }
}

/**
 * 解析微信支付回调
 * @param {string} xmlData - XML格式的回调数据
 * @returns {Object} 解析后的订单信息
 */
export function parseCallback(xmlData) {
  const result = parseXML(xmlData);
  
  // 验证签名
  if (!verifySign(result, WECHAT_API_KEY)) {
    throw new Error('微信支付回调签名验证失败');
  }

  return {
    outTradeNo: result.out_trade_no,
    transactionId: result.transaction_id,
    totalFee: parseInt(result.total_fee), // 金额（分）
    cashFee: parseInt(result.cash_fee || result.total_fee),
    returnCode: result.return_code,
    resultCode: result.result_code,
    timeEnd: result.time_end,
    openid: result.openid
  };
}

/**
 * 检查支付是否成功
 * @param {Object} callbackData - 回调数据
 * @returns {boolean} 是否支付成功
 */
export function isPaymentSuccess(callbackData) {
  return callbackData.returnCode === 'SUCCESS' && 
         callbackData.resultCode === 'SUCCESS';
}

/**
 * 构建XML
 */
function buildXML(params) {
  const xmlParts = ['<xml>'];
  Object.keys(params).forEach(key => {
    xmlParts.push(`<${key}><![CDATA[${params[key]}]]></${key}>`);
  });
  xmlParts.push('</xml>');
  return xmlParts.join('');
}

/**
 * 解析XML
 */
function parseXML(xmlString) {
  const result = {};
  // 先尝试匹配CDATA格式
  const cdataRegex = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/\1>/g;
  let match;
  while ((match = cdataRegex.exec(xmlString)) !== null) {
    result[match[1]] = match[2];
  }
  
  // 如果没有CDATA，尝试匹配普通XML格式
  if (Object.keys(result).length === 0) {
    const normalRegex = /<(\w+)>(.*?)<\/\1>/g;
    while ((match = normalRegex.exec(xmlString)) !== null) {
      result[match[1]] = match[2];
    }
  }
  
  return result;
}

/**
 * 发送HTTPS请求
 */
function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    // 如果配置了证书，使用证书
    if (WECHAT_CERT_PATH && existsSync(WECHAT_CERT_PATH) && 
        WECHAT_KEY_PATH && existsSync(WECHAT_KEY_PATH)) {
      options.cert = readFileSync(WECHAT_CERT_PATH);
      options.key = readFileSync(WECHAT_KEY_PATH);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        resolve(responseData);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

/**
 * 生成回调响应XML
 */
export function generateCallbackResponse(success = true, message = 'OK') {
  const returnCode = success ? 'SUCCESS' : 'FAIL';
  return buildXML({
    return_code: returnCode,
    return_msg: message
  });
}

export default {
  createNativeOrder,
  parseCallback,
  isPaymentSuccess,
  verifySign,
  generateCallbackResponse
};

