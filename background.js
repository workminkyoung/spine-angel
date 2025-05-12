// background.js
// === 알림 주기(분) ===
// 테스트용: 1분(60초)마다 알림. 실제 배포시 원하는 분 단위로 변경하세요.
const NOTIFY_INTERVAL_MINUTES = 1; // <-- 알림 주기(분) 변경 변수

// 알림에 사용할 이미지 경로 (manifest에 등록된 경로 기준)
const NOTIFY_IMAGE = 'images/tempImg.png';

// 알림 텍스트
const NOTIFY_TITLE = '척추요정 알림';
const NOTIFY_MESSAGE = '집중해서 근무한지 50분이 지났어요!\n자세를 고치고 허리한번 피시죠! 허리피자 웃음피자 포테이토피자~~';
const NOTIFY_BTN_TEXT = '자세완벽!';

// 알림 생성 함수
function showPostureNotification() {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: NOTIFY_IMAGE,
    title: NOTIFY_TITLE,
    message: NOTIFY_MESSAGE,
    buttons: [ { title: NOTIFY_BTN_TEXT } ],
    priority: 2
  });
  // 마지막 알림 시각을 storage에 저장 (popup에서 카운트다운에 사용)
  chrome.storage.local.set({ lastNotified: Date.now() });
}

// 알림 버튼 클릭 시 알림 닫기
chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
  chrome.notifications.clear(notifId);
});
// 알림 클릭 시 알림 닫기
chrome.notifications.onClicked.addListener((notifId) => {
  chrome.notifications.clear(notifId);
});

// === chrome.alarms API로 알림 예약 ===
// 알람 예약 함수
function scheduleAlarm() {
  chrome.alarms.create('postureAlarm', { periodInMinutes: NOTIFY_INTERVAL_MINUTES });
}

// 알람 발생 시 알림 띄우기
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'postureAlarm') {
    showPostureNotification();
  }
});

// 확장 설치/리로드 시 알람 예약 및 즉시 알림
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed! 알림 예약 및 즉시 알림');
  showPostureNotification(); // 설치 직후 1회 알림
  scheduleAlarm();
});

// 브라우저 시작/확장 활성화 시에도 알람 예약 보장
scheduleAlarm();

// (옵션) 추후 storage에서 알림 주기 읽어와 반영하려면 chrome.storage.local.get 등 추가 가능

// 기존 메시지 리스너 유지
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in background:', request);
  return true;
}); 