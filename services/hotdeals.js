// 더미 핫딜 상품 데이터 (테스트용)
const HOTDEALS = [
  {
    id: 1,
    name: 'LG 스탠바이미 27인치',
    image: 'https://thumbnail7.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/2024/01/11/13/0/5e6ce0a0-0b60-4c58-b93e-1e9ff7aaf5e3.jpg',
    originalPrice: 1190000,
    currentPrice: 899000,
    discount: 24,
    badge: 'rocket',
    category: '전자/디지털',
    url: 'https://www.coupang.com/vp/products/7335498014',
  },
  {
    id: 2,
    name: '에어팟 프로 2세대 USB-C',
    image: 'https://thumbnail8.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/2023/09/21/17/0/cf2d1345-ba97-4a2c-a4e3-a9e0b0c5b5ef.jpg',
    originalPrice: 359000,
    currentPrice: 289000,
    discount: 19,
    badge: 'rocket',
    category: '전자/디지털',
    url: 'https://www.coupang.com/vp/products/7601553541',
  },
  {
    id: 3,
    name: '다이슨 V15 디텍트 무선청소기',
    image: 'https://thumbnail9.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/2023/04/27/15/8/dc1ef3a8-9b29-4cf6-9f38-8c32bae58e3e.jpg',
    originalPrice: 1290000,
    currentPrice: 899000,
    discount: 30,
    badge: 'hot',
    category: '생활/주방',
    url: 'https://www.coupang.com/vp/products/6497498498',
  },
  {
    id: 4,
    name: '삼성 갤럭시 버즈3 프로',
    image: 'https://thumbnail6.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/2024/07/15/14/4/f93fd6ec-5c4f-4b92-8f50-0e4e2a7a5d73.jpg',
    originalPrice: 359900,
    currentPrice: 279000,
    discount: 22,
    badge: 'rocket',
    category: '전자/디지털',
    url: 'https://www.coupang.com/vp/products/8040177674',
  },
  {
    id: 5,
    name: '나이키 에어포스1 07',
    image: 'https://thumbnail10.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/2022/10/26/10/0/1d0e6fb8-8a78-4b3e-b9b8-f5c1e1d9c3a5.jpg',
    originalPrice: 139000,
    currentPrice: 99900,
    discount: 28,
    badge: 'lowest',
    category: '패션/의류',
    url: 'https://www.coupang.com/vp/products/6023436854',
  },
  {
    id: 6,
    name: '샤오미 로봇청소기 X20 Pro',
    image: 'https://thumbnail7.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/2024/03/08/10/2/b1c1d0f4-2c7e-4f4d-96b8-d3e4f5a6b7c8.jpg',
    originalPrice: 899000,
    currentPrice: 599000,
    discount: 33,
    badge: 'hot',
    category: '생활/주방',
    url: 'https://www.coupang.com/vp/products/7812345678',
  },
  {
    id: 7,
    name: '포카리스웨트 1.5L 12개',
    image: 'https://thumbnail6.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/2023/06/12/11/3/a1b2c3d4-5e6f-7a8b-9c0d-e1f2a3b4c5d6.jpg',
    originalPrice: 28000,
    currentPrice: 25600,
    discount: 9,
    badge: 'rocket',
    category: '식품/음료',
    url: 'https://www.coupang.com/vp/products/1234567890',
  },
  {
    id: 8,
    name: '프로핏 스포츠 WPI 초콜릿 330ml x12',
    image: 'https://thumbnail8.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/2023/08/20/09/5/f1e2d3c4-b5a6-9788-0fed-cba987654321.jpg',
    originalPrice: 29000,
    currentPrice: 24900,
    discount: 14,
    badge: 'rocket',
    category: '식품/음료',
    url: 'https://www.coupang.com/vp/products/2345678901',
  },
];

function getHotdeals() {
  return HOTDEALS;
}

function getHotdealById(id) {
  return HOTDEALS.find(d => d.id === id);
}

module.exports = { getHotdeals, getHotdealById };
