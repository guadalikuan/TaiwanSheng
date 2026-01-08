# TOT购买功能环境变量配置

## 必需的环境变量

### 支付方式说明

本功能支持三种支付方式：
1. **7-11 ibon** - 线下门店扫码支付（通过绿界科技ECPay）
2. **微信支付** - 线上扫码支付（微信支付官方API）
3. **支付宝** - 线上扫码支付（支付宝官方API）

### ECPay（绿界科技）配置

```bash
# 绿界科技商户ID
ECPAY_MERCHANT_ID=your_merchant_id

# 绿界科技Hash Key
ECPAY_HASH_KEY=your_hash_key

# 绿界科技Hash IV
ECPAY_HASH_IV=your_hash_iv

# 绿界科技API地址
# 测试环境: https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5
# 正式环境: https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5
ECPAY_API_URL=https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5

# 支付回调URL（可选，默认使用API_BASE_URL）
ECPAY_RETURN_URL=https://your-domain.com/api/tot-purchase/callback
ECPAY_ORDER_RESULT_URL=https://your-domain.com/api/tot-purchase/callback
```

### 汇率配置

```bash
# TWD/USD汇率（可选，默认0.032）
# 如果不设置，将使用默认值或从外部API获取
TWD_USD_RATE=0.032

# TWD/USD汇率API（可选）
# 如果提供，将从该API获取实时汇率
TWD_USD_API_URL=https://api.exchangerate-api.com/v4/latest/TWD
```

### Solana平台钱包配置

```bash
# 平台Solana钱包地址（用于转账TOT给用户）
PLATFORM_SOLANA_WALLET=your_platform_wallet_address

# 平台钱包私钥（JSON格式，需要加密存储）
# 注意：生产环境应该使用密钥管理服务，不要直接存储在环境变量中
PLATFORM_SOLANA_PRIVATE_KEY=["your","private","key","array"]
```

### 微信支付配置

```bash
# 微信支付AppID
WECHAT_APP_ID=your_wechat_app_id

# 微信支付商户号
WECHAT_MCH_ID=your_merchant_id

# 微信支付API密钥（用于签名）
WECHAT_API_KEY=your_api_key

# 微信支付API v3密钥（用于回调验证，可选）
WECHAT_API_V3_KEY=your_api_v3_key

# 微信支付证书路径（可选，如果使用证书）
WECHAT_CERT_PATH=path_to_cert.pem
WECHAT_KEY_PATH=path_to_key.pem

# 微信支付回调URL
WECHAT_NOTIFY_URL=https://your-domain.com/api/tot-purchase/callback/wechat

# 微信支付API地址（可选，默认正式环境）
WECHAT_API_BASE=https://api.mch.weixin.qq.com
```

### 支付宝配置

```bash
# 支付宝AppID
ALIPAY_APP_ID=your_alipay_app_id

# 支付宝应用私钥（RSA私钥，用于签名）
ALIPAY_PRIVATE_KEY=your_private_key

# 支付宝公钥（用于验证回调签名）
ALIPAY_PUBLIC_KEY=alipay_public_key

# 支付宝网关地址
# 正式环境: https://openapi.alipay.com/gateway.do
# 沙箱环境: https://openapi.alipaydev.com/gateway.do
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do

# 支付宝回调URL
ALIPAY_NOTIFY_URL=https://your-domain.com/api/tot-purchase/callback/alipay
```

### API基础URL配置

```bash
# API基础URL（用于生成回调URL）
API_BASE_URL=https://your-domain.com
```

## 配置步骤

1. **获取ECPay商户信息**（7-11 ibon支付）
   - 登录绿界科技商户后台
   - 获取商户ID、Hash Key、Hash IV
   - 配置支付回调URL为：`https://your-domain.com/api/tot-purchase/callback`

2. **获取微信支付商户信息**（微信支付）
   - 登录微信支付商户平台
   - 获取AppID、商户号、API密钥
   - 配置支付回调URL为：`https://your-domain.com/api/tot-purchase/callback/wechat`
   - 如需使用证书，下载证书并配置路径

3. **获取支付宝商户信息**（支付宝支付）
   - 登录支付宝开放平台
   - 创建应用并获取AppID
   - 生成RSA密钥对（应用私钥和支付宝公钥）
   - 配置支付回调URL为：`https://your-domain.com/api/tot-purchase/callback/alipay`

4. **配置平台钱包**
   - 确保平台钱包有足够的TOT余额用于转账
   - 确保平台钱包有足够的SOL用于支付交易费用和创建代币账户

5. **设置环境变量**
   - 在`.env`文件中添加上述环境变量
   - 或在部署平台（如Zeabur、Render等）的环境变量设置中添加

6. **测试配置**
   - 使用各支付方式的测试/沙箱环境进行测试
   - 确认回调URL可以正常接收支付通知
   - 测试TOT转账功能

## 安全注意事项

1. **私钥安全**
   - 不要将私钥提交到代码仓库
   - 使用密钥管理服务（如AWS Secrets Manager、Azure Key Vault等）
   - 生产环境使用环境变量或密钥管理服务

2. **回调URL验证**
   - 确保回调URL使用HTTPS
   - 验证ECPay回调签名，防止伪造请求

3. **订单安全**
   - 验证订单金额和状态
   - 防止重复处理订单
   - 实现订单过期机制

## 测试环境配置示例

```bash
# 测试环境
# ECPay测试环境
ECPAY_MERCHANT_ID=2000132
ECPAY_HASH_KEY=5294y06JbISpM5x9
ECPAY_HASH_IV=v77hoKGq4kWxNNIS
ECPAY_API_URL=https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5

# 微信支付测试环境（使用沙箱）
WECHAT_APP_ID=your_test_app_id
WECHAT_MCH_ID=your_test_merchant_id
WECHAT_API_KEY=your_test_api_key
WECHAT_API_BASE=https://api.mch.weixin.qq.com

# 支付宝沙箱环境
ALIPAY_APP_ID=your_sandbox_app_id
ALIPAY_PRIVATE_KEY=your_sandbox_private_key
ALIPAY_PUBLIC_KEY=your_sandbox_public_key
ALIPAY_GATEWAY=https://openapi.alipaydev.com/gateway.do

# 通用配置
TWD_USD_RATE=0.032
API_BASE_URL=http://localhost:3001
```

## 生产环境配置示例

```bash
# 生产环境
# ECPay正式环境
ECPAY_MERCHANT_ID=your_production_merchant_id
ECPAY_HASH_KEY=your_production_hash_key
ECPAY_HASH_IV=your_production_hash_iv
ECPAY_API_URL=https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5

# 微信支付正式环境
WECHAT_APP_ID=your_production_app_id
WECHAT_MCH_ID=your_production_merchant_id
WECHAT_API_KEY=your_production_api_key
WECHAT_API_V3_KEY=your_production_api_v3_key
WECHAT_CERT_PATH=/path/to/cert.pem
WECHAT_KEY_PATH=/path/to/key.pem
WECHAT_API_BASE=https://api.mch.weixin.qq.com

# 支付宝正式环境
ALIPAY_APP_ID=your_production_app_id
ALIPAY_PRIVATE_KEY=your_production_private_key
ALIPAY_PUBLIC_KEY=your_production_public_key
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do

# 通用配置
TWD_USD_RATE=0.032
API_BASE_URL=https://your-domain.com
PLATFORM_SOLANA_WALLET=your_production_wallet
PLATFORM_SOLANA_PRIVATE_KEY=["encrypted","key","array"]
```

## 支付方式说明

### 7-11 ibon支付
- 适用于：台湾用户线下门店支付
- 支付流程：用户到7-11门店，使用ibon机器扫码支付
- 特点：支持现金支付，无需银行卡

### 微信支付
- 适用于：台湾用户使用微信支付
- 支付流程：用户使用微信扫码支付
- 特点：实时到账，支持TWD

### 支付宝
- 适用于：台湾用户使用支付宝
- 支付流程：用户使用支付宝扫码支付
- 特点：实时到账，支持TWD

## SDK和依赖说明

### 当前实现方式

当前实现使用**原生Node.js模块**（`crypto`、`https`），不需要安装额外的SDK包：
- ✅ 微信支付：使用原生`https`模块调用API，`crypto`模块生成签名
- ✅ 支付宝：使用原生`https`模块调用API，`crypto`模块进行RSA签名
- ✅ ECPay：使用原生`crypto`模块生成Hash签名

### 可选：使用官方SDK

如果需要使用官方SDK（提供更多功能和更好的错误处理），可以在`tws/server/package.json`中添加：

```json
{
  "dependencies": {
    "wechatpay-node-v3": "^1.0.0",
    "alipay-sdk": "^3.4.0"
  }
}
```

然后修改对应的服务文件使用SDK。当前实现已经提供了完整的接口，可以直接使用。

