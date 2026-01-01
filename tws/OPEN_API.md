# 开放 API 文档 (Open API Documentation)

## 获取全人类命运共同体倒计时 (The Final Countdown)

此接口用于获取当前的倒计时信息，支持跨域访问 (CORS)，可供第三方网站或应用调用。

### 接口信息

- **URL**: `/api/open/countdown`
- **完整 URL (示例)**: `https://tws-dao.zeabur.app/api/open/countdown` (请替换为实际部署域名，本地测试为 `http://localhost:3001/api/open/countdown`)
- **方法**: `GET`
- **鉴权**: 无需鉴权 (Public)

### 请求参数

无

### 响应格式

响应内容为 JSON 对象。

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `success` | Boolean | 请求是否成功 |
| `data` | Object | 数据对象 |
| `data.targetTime` | String | 目标截止时间 (ISO 8601 格式) |
| `data.targetTimeMs` | Number | 目标截止时间戳 (毫秒) |
| `data.serverTime` | String | 服务器当前时间 (ISO 8601 格式) |
| `data.serverTimeMs` | Number | 服务器当前时间戳 (毫秒) |
| `data.remainingMs` | Number | 剩余时间 (毫秒) |
| `data.remainingSeconds` | Number | 剩余时间 (秒) |
| `data.isExpired` | Boolean | 是否已结束 (倒计时归零) |
| `meta` | Object | 元数据 |

#### 成功响应示例

```json
{
  "success": true,
  "data": {
    "targetTime": "2028-01-07T02:00:00.000Z",
    "targetTimeMs": 1830823200000,
    "serverTime": "2025-12-30T07:32:07.683Z",
    "serverTimeMs": 1767079927683,
    "remainingMs": 63743272317,
    "remainingSeconds": 63743272,
    "isExpired": false
  },
  "meta": {
    "api_version": "1.0.0",
    "documentation_url": "https://tws-dao.zeabur.app/docs"
  }
}
```

### 调用示例

#### curl

```bash
curl -X GET https://tws-dao.zeabur.app/api/open/countdown
```

#### JavaScript (Fetch API)

```javascript
fetch('https://tws-dao.zeabur.app/api/open/countdown')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('剩余时间(秒):', data.data.remainingSeconds);
      console.log('目标时间:', data.data.targetTime);
    }
  })
  .catch(error => console.error('Error:', error));
```

#### Python (Requests)

```python
import requests

response = requests.get('https://tws-dao.zeabur.app/api/open/countdown')
data = response.json()

if data['success']:
    print(f"剩余时间: {data['data']['remainingSeconds']} 秒")
```
