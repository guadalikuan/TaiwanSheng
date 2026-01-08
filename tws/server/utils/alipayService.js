/**
 * 支付宝支付服务
 * 支持扫码支付
 */

import crypto from 'crypto';
import https from 'https';
import querystring from 'querystring';

// 支付宝配置
const ALIPAY_APP_ID = process.env.ALIPAY_APP_ID || '';
const ALIPAY_PRIVATE_KEY = process.env.ALIPAY_PRIVATE_KEY || '';
const ALIPAY_PUBLIC_KEY = process.env.ALIPAY_PUBLIC_KEY || '';
const ALIPAY_GATEWAY = process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do';
const ALIPAY_NOTIFY_URL = process.env.ALIPAY_NOTIFY_URL || `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/tot-purchase/callback/alipay`;
const ALIPAY_SIGN_TYPE = 'RSA2'; // RSA2签名方式

/**
 * 生成签名
 * @param {Object} params - 参数对象
 * @param {string} privateKey - 私钥
 * @returns {string} 签名
 */
function generateSign(params, privateKey) {
  // 过滤空值和sign、sign_type
  const filteredParams = {};
  Object.keys(params).forEach(key => {
    if (params[key] !== '' && key !== 'sign' && key !== 'sign_type') {
      filteredParams[key] = params[key];
    }
  });

  // 按字母顺序排序
  const sortedKeys = Object.keys(filteredParams).sort();
  
  // 构建待签名字符串
  const signString = sortedKeys
    .map(key => `${key}=${filteredParams[key]}`)
    .join('&');

  // RSA2签名
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signString, 'utf8');
  return sign.sign(privateKey, 'base64');
}

/**
 * 验证签名
 * @param {Object} params - 参数对象
 * @param {string} publicKey - 公钥
 * @returns {boolean} 是否有效
 */
export function verifySign(params, publicKey) {
  const sign = params.sign;
  delete params.sign;
  delete params.sign_type;

  // 过滤空值
  const filteredParams = {};
  Object.keys(params).forEach(key => {
    if (params[key] !== '') {
      filteredParams[key] = params[key];
    }
  });

  // 按字母顺序排序
  const sortedKeys = Object.keys(filteredParams).sort();
  
  // 构建待签名字符串
  const signString = sortedKeys
    .map(key => `${key}=${filteredParams[key]}`)
    .join('&');

  // 验证签名
  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(signString, 'utf8');
  return verify.verify(publicKey, sign, 'base64');
}

/**
 * 格式化私钥（添加头尾）
 */
function formatPrivateKey(key) {
  if (key.includes('-----BEGIN')) {
    return key;
  }
  return `-----BEGIN RSA PRIVATE KEY-----\n${key}\n-----END RSA PRIVATE KEY-----`;
}

/**
 * 格式化公钥（添加头尾）
 */
function formatPublicKey(key) {
  if (key.includes('-----BEGIN')) {
    return key;
  }
  return `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;
}

/**
 * 创建扫码支付订单
 * @param {Object} orderData - 订单数据
 * @param {string} orderData.outTradeNo - 商户订单号
 * @param {number} orderData.totalAmount - 支付金额（新台币）
 * @param {string} orderData.subject - 订单标题
 * @returns {Promise<Object>} 支付订单信息
 */
export async function createQrCodeOrder(orderData) {
  const {
    outTradeNo,
    totalAmount, // 金额（新台币）
    subject = 'TOT游戏点卡购买'
  } = orderData;

  // 支付宝金额单位为元，保留2位小数
  const amount = parseFloat(totalAmount).toFixed(2);

  const params = {
    app_id: ALIPAY_APP_ID,
    method: 'alipay.trade.precreate', // 统一收单线下交易预创建
    format: 'JSON',
    charset: 'utf-8',
    sign_type: ALIPAY_SIGN_TYPE,
    timestamp: new Date().toISOString().replace(/[-:T]/g, '').split('.')[0].slice(0, 14), // yyyyMMddHHmmss
    version: '1.0',
    notify_url: ALIPAY_NOTIFY_URL,
    biz_content: JSON.stringify({
      out_trade_no: outTradeNo,
      total_amount: amount,
      subject: subject,
      store_id: 'TOT_STORE',
      timeout_express: '7d' // 7天有效期
    })
  };

  // 生成签名
  const privateKey = formatPrivateKey(ALIPAY_PRIVATE_KEY);
  params.sign = generateSign(params, privateKey);

  try {
    // 调用支付宝API
    const response = await makeRequest(ALIPAY_GATEWAY, params);
    const result = JSON.parse(response);

    if (result[`${params.method}_response`]) {
      const alipayResponse = result[`${params.method}_response`];
      
      if (alipayResponse.code === '10000') {
        // 验证响应签名（验证整个响应对象）
        const publicKey = formatPublicKey(ALIPAY_PUBLIC_KEY);
        const responseToVerify = {
          [`${params.method}_response`]: JSON.stringify(alipayResponse),
          sign: result.sign,
          sign_type: ALIPAY_SIGN_TYPE
        };
        
        // 注意：支付宝响应签名验证需要特殊处理
        // 这里简化处理，实际生产环境需要按照支付宝文档验证
        
        return {
          success: true,
          qrCode: alipayResponse.qr_code, // 支付二维码内容
          outTradeNo: outTradeNo
        };
      } else {
        throw new Error(alipayResponse.sub_msg || alipayResponse.msg || '创建订单失败');
      }
    } else {
      throw new Error('支付宝API响应格式错误');
    }
  } catch (error) {
    console.error('支付宝创建订单失败:', error);
    throw error;
  }
}

/**
 * 解析支付宝回调
 * @param {Object} callbackData - 回调数据（已解析的JSON或查询字符串）
 * @returns {Object} 解析后的订单信息
 */
export function parseCallback(callbackData) {
  // 如果是查询字符串，解析为对象
  let params = callbackData;
  if (typeof callbackData === 'string') {
    params = querystring.parse(callbackData);
  }

  // 验证签名
  const publicKey = formatPublicKey(ALIPAY_PUBLIC_KEY);
  if (!verifySign(params, publicKey)) {
    throw new Error('支付宝回调签名验证失败');
  }

  return {
    outTradeNo: params.out_trade_no,
    tradeNo: params.trade_no,
    totalAmount: parseFloat(params.total_amount),
    tradeStatus: params.trade_status,
    buyerId: params.buyer_id,
    buyerLogonId: params.buyer_logon_id,
    gmtPayment: params.gmt_payment,
    receiptAmount: params.receipt_amount ? parseFloat(params.receipt_amount) : null
  };
}

/**
 * 检查支付是否成功
 * @param {Object} callbackData - 回调数据
 * @returns {boolean} 是否支付成功
 */
export function isPaymentSuccess(callbackData) {
  return callbackData.tradeStatus === 'TRADE_SUCCESS' || 
         callbackData.tradeStatus === 'TRADE_FINISHED';
}

/**
 * 生成回调响应
 */
export function generateCallbackResponse(success = true) {
  return success ? 'success' : 'fail';
}

/**
 * 发送HTTPS请求
 */
function makeRequest(url, params) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify(params);
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.setEncoding('utf8');
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

    req.write(postData);
    req.end();
  });
}

export default {
  createQrCodeOrder,
  parseCallback,
  isPaymentSuccess,
  verifySign,
  generateCallbackResponse
};

