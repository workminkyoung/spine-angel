// 5초 후 자동 닫힘
setTimeout(() => window.close(), 5000);

document.addEventListener('DOMContentLoaded', () => {
  // 메시지 분기 처리
  const params = new URLSearchParams(window.location.search);
  if (params.get('msg') === 'tooShort') {
    const msgDiv = document.querySelector('.toast-message');
    if (msgDiv) {
      msgDiv.innerHTML = '알림 간격은 1분 미만으로 설정할 수 없습니다.';
    }
  }
}); 