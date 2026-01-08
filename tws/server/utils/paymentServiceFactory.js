/**
 * 支付服务工厂
 * 统一支付接口抽象，根据支付方式返回对应的支付服务实例
 */

import { createIbonOrder, parseCallback as parseECPayCallback, isPaymentSuccess as isECPaySuccess } from './ecpayService.js';
import { createNativeOrder, parseCallback as parseWechatCallback, isPaymentSuccess as isWechatSuccess } from './wechatPayService.js';
import { createQrCodeOrder, parseCallback as parseAlipayCallback, isPaymentSuccess as isAlipaySuccess } from './alipayService.js';

// 支付方式常量
export const PAYMENT_METHODS = {
  IBON: 'ibon',      // 7-11 ibon
  WECHAT: 'wechat',  // 微信支付
  ALIPAY: 'alipay'   // 支付宝
};

/**
 * 支付服务接口抽象
 */
class PaymentService {
  /**
   * 创建支付订单
   * @param {Object} orderData - 订单数据
   * @returns {Promise<Object>} 支付订单信息
   */
  async createOrder(orderData) {
    throw new Error('createOrder must be implemented');
  }

  /**
   * 解析支付回调
   * @param {Object|string} callbackData - 回调数据
   * @returns {Object} 解析后的订单信息
   */
  parseCallback(callbackData) {
    throw new Error('parseCallback must be implemented');
  }

  /**
   * 检查支付是否成功
   * @param {Object} callbackData - 回调数据
   * @returns {boolean} 是否支付成功
   */
  isPaymentSuccess(callbackData) {
    throw new Error('isPaymentSuccess must be implemented');
  }
}

/**
 * ECPay支付服务实现
 */
class ECPayService extends PaymentService {
  async createOrder(orderData) {
    const result = createIbonOrder({
      MerchantTradeNo: orderData.outTradeNo,
      TotalAmount: orderData.totalAmount,
      TradeDesc: orderData.description || 'TOT游戏点卡购买',
      ItemName: orderData.subject || 'TOT游戏点卡'
    });

    return {
      success: true,
      qrCodeUrl: null, // ECPay ibon不需要二维码URL，需要提交表单
      qrCode: null,
      formData: result.formData,
      apiUrl: result.apiUrl,
      paymentMethod: PAYMENT_METHODS.IBON
    };
  }

  parseCallback(callbackData) {
    return parseECPayCallback(callbackData);
  }

  isPaymentSuccess(callbackData) {
    return isECPaySuccess(callbackData);
  }
}

/**
 * 微信支付服务实现
 */
class WechatPayService extends PaymentService {
  async createOrder(orderData) {
    const result = await createNativeOrder({
      outTradeNo: orderData.outTradeNo,
      totalAmount: orderData.totalAmount,
      description: orderData.description || 'TOT游戏点卡购买'
    });

    return {
      success: result.success,
      qrCodeUrl: result.codeUrl, // 微信支付二维码URL
      qrCode: result.codeUrl,
      formData: null,
      apiUrl: null,
      paymentMethod: PAYMENT_METHODS.WECHAT
    };
  }

  parseCallback(callbackData) {
    return parseWechatCallback(callbackData);
  }

  isPaymentSuccess(callbackData) {
    return isWechatSuccess(callbackData);
  }
}

/**
 * 支付宝支付服务实现
 */
class AlipayService extends PaymentService {
  async createOrder(orderData) {
    const result = await createQrCodeOrder({
      outTradeNo: orderData.outTradeNo,
      totalAmount: orderData.totalAmount,
      subject: orderData.subject || 'TOT游戏点卡购买'
    });

    return {
      success: result.success,
      qrCodeUrl: null,
      qrCode: result.qrCode, // 支付宝二维码内容
      formData: null,
      apiUrl: null,
      paymentMethod: PAYMENT_METHODS.ALIPAY
    };
  }

  parseCallback(callbackData) {
    return parseAlipayCallback(callbackData);
  }

  isPaymentSuccess(callbackData) {
    return isAlipaySuccess(callbackData);
  }
}

/**
 * 支付服务工厂
 */
class PaymentServiceFactory {
  /**
   * 根据支付方式获取支付服务实例
   * @param {string} paymentMethod - 支付方式 (ibon/wechat/alipay)
   * @returns {PaymentService} 支付服务实例
   */
  static getService(paymentMethod) {
    switch (paymentMethod) {
      case PAYMENT_METHODS.IBON:
        return new ECPayService();
      case PAYMENT_METHODS.WECHAT:
        return new WechatPayService();
      case PAYMENT_METHODS.ALIPAY:
        return new AlipayService();
      default:
        throw new Error(`不支持的支付方式: ${paymentMethod}`);
    }
  }

  /**
   * 验证支付方式是否有效
   * @param {string} paymentMethod - 支付方式
   * @returns {boolean} 是否有效
   */
  static isValidPaymentMethod(paymentMethod) {
    return Object.values(PAYMENT_METHODS).includes(paymentMethod);
  }
}

export default PaymentServiceFactory;
export { PaymentService };

