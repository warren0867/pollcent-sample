const crypto = require('crypto');
const axios = require('axios');

const ACCESS_KEY = process.env.COUPANG_ACCESS_KEY;
const SECRET_KEY = process.env.COUPANG_SECRET_KEY;
const SUB_ID = process.env.COUPANG_SUBID || 'pollcent';

// HMAC 서명 생성 (쿠팡 파트너스 API 인증)
function generateHmac(method, url, datetime) {
  const message = datetime + method + url;
  return crypto.createHmac('sha256', SECRET_KEY).update(message).digest('hex');
}

// 쿠팡 파트너스 딥링크 생성
async function createDeepLink(originalUrl) {
  const datetime = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const path = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink';
  const hmac = generateHmac('POST', path, datetime);

  try {
    const res = await axios.post(`https://api-gateway.coupang.com${path}`, {
      coupangUrls: [originalUrl],
      subId: SUB_ID,
    }, {
      headers: {
        'Authorization': `CEA algorithm=HmacSHA256, access-key=${ACCESS_KEY}, signed-date=${datetime}, signature=${hmac}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.data && res.data.data && res.data.data.length > 0) {
      return res.data.data[0].shortenUrl;
    }
    return null;
  } catch (err) {
    console.error('쿠팡 딥링크 생성 실패:', err.message);
    return null;
  }
}

// 포스트백 검증 (쿠팡에서 보내는 구매 알림)
function verifyPostback(query) {
  // 실제로는 쿠팡 포스트백 서명 검증 필요
  // 프로토타입에서는 필수 필드만 체크
  const required = ['orderId', 'orderAmount', 'subId'];
  for (const field of required) {
    if (!query[field]) return false;
  }
  return true;
}

module.exports = { createDeepLink, verifyPostback };
