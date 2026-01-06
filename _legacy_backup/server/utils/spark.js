import crypto from 'crypto';
import WebSocket from 'ws';

/**
 * 科大讯飞星火大模型 API 客户端
 */
class SparkClient {
  constructor(config) {
    this.appId = config.appId;
    this.apiSecret = config.apiSecret;
    this.apiKey = config.apiKey;
    this.url = config.url || 'wss://spark-api.xf-yun.com/v4.0/chat';
    this.domain = config.domain || '4.0Ultra'; // Spark Ultra-32K 对应 4.0Ultra 或 generalv4
  }

  /**
   * 生成鉴权 URL
   */
  getAuthUrl() {
    const urlObj = new URL(this.url);
    const host = urlObj.host;
    const path = urlObj.pathname;
    const date = new Date().toUTCString();

    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
    
    const signatureSha = crypto
      .createHmac('sha256', this.apiSecret)
      .update(signatureOrigin)
      .digest('base64');

    const authorizationOrigin = `api_key="${this.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureSha}"`;
    const authorization = Buffer.from(authorizationOrigin).toString('base64');

    const authUrl = `${this.url}?authorization=${authorization}&date=${encodeURI(date)}&host=${host}`;
    return authUrl;
  }

  /**
   * 发送聊天请求
   * @param {Array} messages - 消息列表 [{role: 'user', content: '...'}]
   * @param {number} temperature - 温度
   * @returns {Promise<string>} - AI 回复
   */
  async chat(messages, temperature = 0.5) {
    return new Promise((resolve, reject) => {
      const authUrl = this.getAuthUrl();
      const ws = new WebSocket(authUrl);
      let fullResponse = '';

      ws.on('open', () => {
        const params = {
          header: {
            app_id: this.appId,
            uid: 'tws-oracle-system'
          },
          parameter: {
            chat: {
              domain: this.domain,
              temperature: temperature,
              max_tokens: 2048
            }
          },
          payload: {
            message: {
              text: messages
            }
          }
        };
        ws.send(JSON.stringify(params));
      });

      ws.on('message', (data) => {
        try {
          const response = JSON.parse(data);
          
          if (response.header.code !== 0) {
            console.error(`Spark API Error: ${response.header.code} - ${response.header.message}`);
            ws.close();
            return reject(new Error(response.header.message));
          }

          if (response.header.code === 0) {
            const content = response.payload.choices.text[0].content;
            fullResponse += content;

            if (response.header.status === 2) {
              ws.close();
              resolve(fullResponse);
            }
          }
        } catch (error) {
          console.error('Spark API Parse Error:', error);
          ws.close();
          reject(error);
        }
      });

      ws.on('error', (error) => {
        console.error('Spark WebSocket Error:', error);
        reject(error);
      });
      
      ws.on('close', (code, reason) => {
        // 如果非正常关闭且未resolve
        if (code !== 1000 && fullResponse === '') {
           // console.log('WebSocket closed:', code, reason.toString());
        }
      });
    });
  }
}

export default SparkClient;
