/**
 * TOT购买路由
 * 处理多种支付方式购买TOT游戏点卡：
 * - 7-11 ibon线下门店扫码支付（通过绿界科技ECPay）
 * - 微信扫码支付
 * - 支付宝扫码支付
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { put, get, NAMESPACES } from '../utils/rocksdb.js';
import { createIbonOrder, parseCallback as parseECPayCallback, isPaymentSuccess as isECPaySuccess, verifyCallback } from '../utils/ecpayService.js';
import { parseCallback as parseWechatCallback, isPaymentSuccess as isWechatSuccess, generateCallbackResponse as generateWechatResponse } from '../utils/wechatPayService.js';
import { parseCallback as parseAlipayCallback, isPaymentSuccess as isAlipaySuccess, generateCallbackResponse as generateAlipayResponse } from '../utils/alipayService.js';
import PaymentServiceFactory, { PAYMENT_METHODS } from '../utils/paymentServiceFactory.js';
import { convertTwdToTot, getExchangeRate } from '../utils/exchangeRate.js';
import { platformTransfer } from '../utils/solanaBlockchain.js';

const router = express.Router();

// 订单状态
const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired'
};

/**
 * 生成订单ID
 */
function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `TOT_${timestamp}_${random}`;
}

/**
 * 创建购买订单
 * POST /api/tot-purchase/create-order
 */
router.post('/create-order', authenticate, async (req, res) => {
  try {
    const { twdAmount, walletAddress, paymentMethod = PAYMENT_METHODS.IBON } = req.body;

    // 验证参数
    if (!twdAmount || twdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
        message: '金额必须大于0'
      });
    }

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing wallet address',
        message: '请提供钱包地址'
      });
    }

    // 验证支付方式
    if (!PaymentServiceFactory.isValidPaymentMethod(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method',
        message: `不支持的支付方式: ${paymentMethod}`
      });
    }

    // 验证Solana地址格式
    try {
      const { PublicKey } = await import('@solana/web3.js');
      new PublicKey(walletAddress);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address',
        message: '无效的Solana钱包地址'
      });
    }

    // 计算汇率和TOT数量
    const conversionResult = await convertTwdToTot(twdAmount);
    
    if (!conversionResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Exchange rate unavailable',
        message: conversionResult.error || '无法获取汇率，请稍后重试'
      });
    }

    const { totAmount, rate, totPriceUsd, twdUsdRate } = conversionResult;

    // 生成订单ID
    const orderId = generateOrderId();
    const merchantTradeNo = orderId;

    // 使用支付服务工厂创建支付订单
    const paymentService = PaymentServiceFactory.getService(paymentMethod);
    const paymentResult = await paymentService.createOrder({
      outTradeNo: merchantTradeNo,
      totalAmount: Math.floor(twdAmount),
      description: 'TOT游戏点卡购买',
      subject: `TOT游戏点卡 ${totAmount.toFixed(4)} TOT`
    });

    // 保存订单到数据库
    const order = {
      id: orderId,
      merchantTradeNo: merchantTradeNo,
      userId: req.user?.address || walletAddress,
      walletAddress: walletAddress,
      twdAmount: twdAmount,
      totAmount: totAmount,
      rate: rate,
      totPriceUsd: totPriceUsd,
      twdUsdRate: twdUsdRate,
      paymentMethod: paymentMethod,
      paymentGateway: paymentMethod,
      status: ORDER_STATUS.PENDING,
      paymentGatewayOrderNo: null, // 将在回调时更新
      qrCodeUrl: paymentResult.qrCodeUrl,
      qrCode: paymentResult.qrCode,
      formData: paymentResult.formData,
      apiUrl: paymentResult.apiUrl,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7天有效期
    };

    await put(NAMESPACES.TOT_PURCHASE_ORDERS, orderId, order);

    res.json({
      success: true,
      order: {
        id: order.id,
        twdAmount: order.twdAmount,
        totAmount: order.totAmount,
        rate: order.rate,
        status: order.status,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
        expiresAt: order.expiresAt
      },
      payment: {
        method: paymentMethod,
        qrCodeUrl: paymentResult.qrCodeUrl,
        qrCode: paymentResult.qrCode,
        formData: paymentResult.formData,
        apiUrl: paymentResult.apiUrl
      }
    });
  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order',
      message: error.message
    });
  }
});

/**
 * 统一处理支付回调
 */
async function handlePaymentCallback(paymentMethod, callbackData, res) {
  try {
    console.log(`[TOT Purchase] 收到${paymentMethod}回调:`, callbackData);

    // 获取支付服务
    const paymentService = PaymentServiceFactory.getService(paymentMethod);
    
    // 解析回调数据
    const parsed = paymentService.parseCallback(callbackData);
    const outTradeNo = parsed.outTradeNo || parsed.merchantTradeNo;

    // 查找订单
    const order = await get(NAMESPACES.TOT_PURCHASE_ORDERS, outTradeNo);
    
    if (!order) {
      console.error(`[TOT Purchase] 订单不存在: ${outTradeNo}`);
      return { success: false, status: 404, response: 'Order not found' };
    }

    // 检查订单状态
    if (order.status === ORDER_STATUS.COMPLETED) {
      console.log(`[TOT Purchase] 订单已完成，忽略重复回调: ${outTradeNo}`);
      return { success: true, status: 200, response: getCallbackResponse(paymentMethod, true) };
    }

    // 检查支付是否成功
    if (paymentService.isPaymentSuccess(parsed)) {
      // 更新订单状态为已支付
      order.status = ORDER_STATUS.PAID;
      order.paidAt = Date.now();
      order.paymentGatewayOrderNo = parsed.transactionId || parsed.tradeNo || parsed.ecpayTradeNo || null;
      order.callbackData = parsed;

      await put(NAMESPACES.TOT_PURCHASE_ORDERS, outTradeNo, order);

      // 异步处理TOT转账（避免阻塞回调响应）
      processTOTTransfer(order).catch(error => {
        console.error(`[TOT Purchase] TOT转账失败: ${outTradeNo}`, error);
        // 更新订单状态为处理失败
        order.status = ORDER_STATUS.FAILED;
        order.error = error.message;
        put(NAMESPACES.TOT_PURCHASE_ORDERS, outTradeNo, order).catch(console.error);
      });

      return { success: true, status: 200, response: getCallbackResponse(paymentMethod, true) };
    } else {
      // 支付失败
      order.status = ORDER_STATUS.FAILED;
      order.failedAt = Date.now();
      order.error = parsed.rtnMsg || parsed.msg || 'Payment failed';
      await put(NAMESPACES.TOT_PURCHASE_ORDERS, outTradeNo, order);

      return { success: true, status: 200, response: getCallbackResponse(paymentMethod, false) };
    }
  } catch (error) {
    console.error(`[TOT Purchase] 处理${paymentMethod}回调失败:`, error);
    return { success: false, status: 500, response: 'Internal server error', error: error.message };
  }
}

/**
 * 获取回调响应格式
 */
function getCallbackResponse(paymentMethod, success) {
  switch (paymentMethod) {
    case PAYMENT_METHODS.IBON:
      return '1|OK'; // ECPay要求返回格式
    case PAYMENT_METHODS.WECHAT:
      return generateWechatResponse(success);
    case PAYMENT_METHODS.ALIPAY:
      return generateAlipayResponse(success);
    default:
      return success ? 'success' : 'fail';
  }
}

/**
 * ECPay支付回调
 * POST /api/tot-purchase/callback
 * 注意：ECPay使用form-urlencoded格式发送回调
 */
router.post('/callback', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    // 验证回调签名
    if (!verifyCallback(req.body)) {
      console.error('[TOT Purchase] ECPay回调签名验证失败');
      return res.status(400).send('Invalid signature');
    }

    const result = await handlePaymentCallback(PAYMENT_METHODS.IBON, req.body, res);
    res.status(result.status).send(result.response);
  } catch (error) {
    console.error('[TOT Purchase] 处理ECPay回调失败:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * 微信支付回调
 * POST /api/tot-purchase/callback/wechat
 * 注意：微信支付使用XML格式发送回调
 */
router.post('/callback/wechat', express.text({ type: 'application/xml' }), async (req, res) => {
  try {
    const result = await handlePaymentCallback(PAYMENT_METHODS.WECHAT, req.body, res);
    res.status(result.status).type('application/xml').send(result.response);
  } catch (error) {
    console.error('[TOT Purchase] 处理微信支付回调失败:', error);
    res.status(500).type('application/xml').send(generateWechatResponse(false, 'Internal server error'));
  }
});

/**
 * 支付宝支付回调
 * POST /api/tot-purchase/callback/alipay
 * 注意：支付宝使用form-urlencoded格式发送回调
 */
router.post('/callback/alipay', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const result = await handlePaymentCallback(PAYMENT_METHODS.ALIPAY, req.body, res);
    res.status(result.status).send(result.response);
  } catch (error) {
    console.error('[TOT Purchase] 处理支付宝回调失败:', error);
    res.status(500).send('fail');
  }
});

/**
 * 处理TOT转账
 */
async function processTOTTransfer(order) {
  try {
    // 更新状态为处理中
    order.status = ORDER_STATUS.PROCESSING;
    await put(NAMESPACES.TOT_PURCHASE_ORDERS, order.id, order);

    console.log(`[TOT Purchase] 开始转账TOT: ${order.totAmount} TOT 到 ${order.walletAddress}`);

    // 执行转账（使用tot合约的platform_transfer，免税）
    const transferResult = await platformTransfer(order.walletAddress, order.totAmount);

    // 更新订单状态为已完成
    order.status = ORDER_STATUS.COMPLETED;
    order.completedAt = Date.now();
    order.txHash = transferResult.txHash;
    order.transferResult = transferResult;

    await put(NAMESPACES.TOT_PURCHASE_ORDERS, order.id, order);

    console.log(`[TOT Purchase] 转账成功: ${order.id}, Tx: ${transferResult.txHash}`);
  } catch (error) {
    console.error(`[TOT Purchase] 转账失败: ${order.id}`, error);
    throw error;
  }
}

/**
 * 查询订单状态
 * GET /api/tot-purchase/order/:orderId
 */
router.get('/order/:orderId', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await get(NAMESPACES.TOT_PURCHASE_ORDERS, orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // 验证订单所有者
    if (order.userId !== req.user?.address && order.walletAddress !== req.user?.address) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: '无权访问此订单'
      });
    }

    // 检查订单是否过期
    if (order.status === ORDER_STATUS.PENDING && order.expiresAt && Date.now() > order.expiresAt) {
      order.status = ORDER_STATUS.EXPIRED;
      await put(NAMESPACES.TOT_PURCHASE_ORDERS, orderId, order);
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        twdAmount: order.twdAmount,
        totAmount: order.totAmount,
        rate: order.rate,
        status: order.status,
        walletAddress: order.walletAddress,
        txHash: order.txHash,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        completedAt: order.completedAt,
        expiresAt: order.expiresAt
      }
    });
  } catch (error) {
    console.error('查询订单失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order',
      message: error.message
    });
  }
});

/**
 * 获取当前汇率
 * GET /api/tot-purchase/exchange-rate
 */
router.get('/exchange-rate', async (req, res) => {
  try {
    const rateData = await getExchangeRate();

    res.json({
      success: true,
      data: {
        totPriceUsd: rateData.totPriceUsd,
        twdUsdRate: rateData.twdUsdRate,
        twdToTotRate: rateData.twdToTotRate,
        timestamp: rateData.timestamp,
        cached: rateData.cached
      }
    });
  } catch (error) {
    console.error('获取汇率失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get exchange rate',
      message: error.message
    });
  }
});

export default router;

