// 자물쇠 랜덤 (복권) 당첨 확률 테이블
const LOTTERY_TABLE = [
  { amount: 0,     weight: 60,  label: '꽝' },
  { amount: 100,   weight: 20,  label: '100원' },
  { amount: 500,   weight: 10,  label: '500원' },
  { amount: 1000,  weight: 7,   label: '1,000원' },
  { amount: 5000,  weight: 2.5, label: '5,000원' },
  { amount: 10000, weight: 0.5, label: '10,000원' },
];

// 이벤트 룰렛 당첨 확률 테이블
const ROULETTE_TABLE = [
  { amount: 50,    weight: 30, label: '50원',    color: '#FF6B6B' },
  { amount: 100,   weight: 25, label: '100원',   color: '#4ECDC4' },
  { amount: 200,   weight: 20, label: '200원',   color: '#45B7D1' },
  { amount: 500,   weight: 15, label: '500원',   color: '#96CEB4' },
  { amount: 1000,  weight: 7,  label: '1,000원', color: '#FFEAA7' },
  { amount: 3000,  weight: 2,  label: '3,000원', color: '#DDA0DD' },
  { amount: 5000,  weight: 0.8,label: '5,000원', color: '#FF69B4' },
  { amount: 10000, weight: 0.2,label: '10,000원',color: '#FFD700' },
];

function weightedRandom(table) {
  const totalWeight = table.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of table) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return table[0];
}

function playLottery() {
  return weightedRandom(LOTTERY_TABLE);
}

function playRoulette() {
  return weightedRandom(ROULETTE_TABLE);
}

module.exports = { LOTTERY_TABLE, ROULETTE_TABLE, playLottery, playRoulette };
