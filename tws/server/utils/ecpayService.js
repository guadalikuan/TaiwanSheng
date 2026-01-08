/**
 * 绿界科技（ECPay）支付服务
 * 支持7-11 ibon线下门店扫码支付
 */

import crypto from 'crypto';
import querystring from 'querystring';

// ECPay配置
const ECPAY_MERCHANT_ID = process.env.ECPAY_MERCHANT_ID || '';
const ECPAY_HASH_KEY = process.env.ECPAY_HASH_KEY || '';
const ECPAY_HASH_IV = process.env.ECPAY_HASH_IV || '';
const ECPAY_API_URL = process.env.ECPAY_API_URL || 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';
const ECPAY_RETURN_URL = process.env.ECPAY_RETURN_URL || `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/tot-purchase/callback`;
const ECPAY_ORDER_RESULT_URL = process.env.ECPAY_ORDER_RESULT_URL || `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/tot-purchase/callback`;

// 支付方式：7-11 ibon
const PAYMENT_TYPE = 'CVS';
const STORE_TYPE = 'IBON';

/**
 * 生成检查码（CheckMacValue）
 * @param {Object} params - 参数对象
 * @returns {string} 检查码
 */
function generateCheckMacValue(params) {
  // 按字母顺序排序
  const sortedKeys = Object.keys(params).sort();
  
  // 构建查询字符串
  const queryString = sortedKeys
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  // 添加HashKey和HashIV
  const checkString = `HashKey=${ECPAY_HASH_KEY}&${queryString}&HashIV=${ECPAY_HASH_IV}`;
  
  // URL编码
  const encodedString = encodeURIComponent(checkString)
    .toLowerCase()
    .replace(/%20/g, '+')
    .replace(/%2d/g, '-')
    .replace(/%5f/g, '_')
    .replace(/%2e/g, '.')
    .replace(/%21/g, '!')
    .replace(/%2a/g, '*')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')');
  
  // SHA256加密
  const hash = crypto.createHash('sha256').update(encodedString).digest('hex');
  
  return hash.toUpperCase();
}

/**
 * 验证回调检查码
 * @param {Object} params - 回调参数
 * @returns {boolean} 是否有效
 */
export function verifyCallback(params) {
  try {
    const receivedCheckMacValue = params.CheckMacValue;
    delete params.CheckMacValue;
    
    const calculatedCheckMacValue = generateCheckMacValue(params);
    
    return receivedCheckMacValue === calculatedCheckMacValue;
  } catch (error) {
    console.error('验证回调检查码失败:', error);
    return false;
  }
}

/**
 * 创建7-11 ibon支付订单
 * @param {Object} orderData - 订单数据
 * @param {string} orderData.MerchantTradeNo - 商户订单号
 * @param {number} orderData.TotalAmount - 支付金额（新台币）
 * @param {string} orderData.TradeDesc - 交易描述
 * @param {string} orderData.ItemName - 商品名称
 * @param {string} orderData.ReturnURL - 返回URL
 * @param {string} orderData.OrderResultURL - 订单结果URL
 * @returns {Object} 支付订单信息
 */
export function createIbonOrder(orderData) {
  const {
    MerchantTradeNo,
    TotalAmount,
    TradeDesc = 'TOT游戏点卡购买',
    ItemName = 'TOT游戏点卡',
    ReturnURL = ECPAY_RETURN_URL,
    OrderResultURL = ECPAY_ORDER_RESULT_URL
  } = orderData;

  // 构建订单参数
  const params = {
    MerchantID: ECPAY_MERCHANT_ID,
    MerchantTradeNo: MerchantTradeNo,
    MerchantTradeDate: new Date().toISOString().replace(/[-:T]/g, '').split('.')[0], // YYYYMMDDHHmmss
    PaymentType: 'aio',
    TotalAmount: Math.floor(TotalAmount), // 金额为整数
    TradeDesc: TradeDesc,
    ItemName: ItemName,
    ReturnURL: ReturnURL,
    OrderResultURL: OrderResultURL,
    ChoosePayment: PAYMENT_TYPE,
    StoreExpireDate: 7, // 7天有效期
    PaymentInfoURL: OrderResultURL,
    ClientRedirectURL: '', // 客户端重定向URL（可选）
    StoreID: '', // 商店ID（可选）
    CustomField1: '', // 自定义字段1
    CustomField2: '', // 自定义字段2
    CustomField3: '', // 自定义字段3
    CustomField4: '', // 自定义字段4
    EncryptType: 1 // 加密类型：1=SHA256
  };

  // 生成检查码
  params.CheckMacValue = generateCheckMacValue(params);

  // 返回支付表单数据（前端需要提交表单到ECPay）
  return {
    apiUrl: ECPAY_API_URL,
    params: params,
    // 为了方便前端使用，也生成一个二维码URL（实际应该由ECPay返回）
    // 注意：ECPay的ibon支付需要用户到门店扫码，这里返回的是支付表单
    formData: params
  };
}

/**
 * 解析ECPay回调数据
 * @param {Object} callbackData - 回调数据
 * @returns {Object} 解析后的订单信息
 */
export function parseCallback(callbackData) {
  const isValid = verifyCallback({ ...callbackData });
  
  if (!isValid) {
    throw new Error('回调签名验证失败');
  }

  return {
    merchantTradeNo: callbackData.MerchantTradeNo,
    rtnCode: callbackData.RtnCode,
    rtnMsg: callbackData.RtnMsg,
    tradeNo: callbackData.TradeNo,
    tradeAmt: parseInt(callbackData.TradeAmt),
    paymentDate: callbackData.PaymentDate,
    paymentType: callbackData.PaymentType,
    paymentTypeChargeFee: callbackData.PaymentTypeChargeFee ? parseFloat(callbackData.PaymentTypeChargeFee) : 0,
    tradeDate: callbackData.TradeDate,
    simulatePaid: callbackData.SimulatePaid === '1', // 是否为模拟付款
    customField1: callbackData.CustomField1,
    customField2: callbackData.CustomField2,
    customField3: callbackData.CustomField3,
    customField4: callbackData.CustomField4
  };
}

/**
 * 检查支付是否成功
 * @param {Object} callbackData - 回调数据
 * @returns {boolean} 是否支付成功
 */
export function isPaymentSuccess(callbackData) {
  try {
    const parsed = parseCallback(callbackData);
    // RtnCode = 1 表示支付成功
    return parsed.rtnCode === '1';
  } catch (error) {
    console.error('检查支付状态失败:', error);
    return false;
  }
}

/**
 * 生成ibon付款代码查询URL（用于用户查询付款代码）
 * @param {string} merchantTradeNo - 商户订单号
 * @returns {string} 查询URL
 */
export function getPaymentCodeQueryUrl(merchantTradeNo) {
  // ECPay的ibon付款代码查询页面
  return `https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5?MerchantTradeNo=${merchantTradeNo}`;
}

export default {
  createIbonOrder,
  verifyCallback,
  parseCallback,
  isPaymentSuccess,
  getPaymentCodeQueryUrl
};

