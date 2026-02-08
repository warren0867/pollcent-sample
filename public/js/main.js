// 복권 사용
async function playLottery(ticketId) {
  const card = document.getElementById('ticket-' + ticketId);
  if (!card) return;

  try {
    const res = await fetch('/tickets/lottery/' + ticketId, { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      const front = card.querySelector('.ticket-front');
      if (front) {
        front.outerHTML = '<div class="ticket-result ' + (data.result.amount > 0 ? 'win' : 'lose') + '">' +
          (data.result.amount > 0 ? data.result.label + ' 당첨!' : '꽝') + '</div>';
      }
    } else {
      alert(data.error || '오류 발생');
    }
  } catch (err) {
    alert('네트워크 오류');
  }
}

// 복권 전체 사용
async function playAllLottery() {
  if (!confirm('모든 복권 티켓을 한번에 긁으시겠습니까?')) return;

  try {
    const res = await fetch('/tickets/lottery-all', { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      alert(data.count + '장 사용 완료!\n총 당첨금: ' + data.totalReward.toLocaleString() + '원');
      location.reload();
    }
  } catch (err) {
    alert('네트워크 오류');
  }
}

// 룰렛 사용
let rouletteSpinning = false;
async function playRoulette(ticketId) {
  if (rouletteSpinning) return;
  rouletteSpinning = true;

  try {
    const res = await fetch('/tickets/roulette/' + ticketId, { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      // 모달 표시
      const modal = document.getElementById('roulette-modal');
      const wheel = document.getElementById('roulette-wheel');
      const result = document.getElementById('roulette-result');

      modal.style.display = 'flex';
      result.textContent = '';

      // 룰렛 회전 애니메이션
      const rotation = 1440 + Math.random() * 360;
      wheel.style.transform = 'rotate(' + rotation + 'deg)';

      setTimeout(function () {
        result.textContent = data.result.label + ' 당첨!';
        // 티켓 카드 업데이트
        const card = document.getElementById('ticket-' + ticketId);
        if (card) card.remove();
        rouletteSpinning = false;
      }, 3200);
    } else {
      alert(data.error || '오류 발생');
      rouletteSpinning = false;
    }
  } catch (err) {
    alert('네트워크 오류');
    rouletteSpinning = false;
  }
}

function closeRoulette() {
  document.getElementById('roulette-modal').style.display = 'none';
  location.reload();
}

// 보상 교환
async function exchangeReward(rewardId) {
  try {
    const res = await fetch('/rewards/exchange/' + rewardId, { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      alert(data.amount.toLocaleString() + '원이 잔액에 추가되었습니다!');
      location.reload();
    } else {
      alert(data.error || '교환 실패');
    }
  } catch (err) {
    alert('네트워크 오류');
  }
}

// 전체 교환
async function exchangeAll() {
  if (!confirm('교환 가능한 모든 보상을 교환하시겠습니까?')) return;

  try {
    const res = await fetch('/rewards/exchange-all', { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      alert(data.count + '건 교환 완료!\n총 ' + data.totalAmount.toLocaleString() + '원');
      location.reload();
    }
  } catch (err) {
    alert('네트워크 오류');
  }
}
