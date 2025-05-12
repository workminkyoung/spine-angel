// background.js
// === 알림 주기(분) ===
const DEFAULT_NOTIFY_INTERVAL_MINUTES = 30; // 기본 알림 간격 (분 단위)

// 알림에 사용할 이미지 경로 (manifest에 등록된 경로 기준)
const NOTIFY_IMAGE = 'images/tempImg_x1.png';

// 알림 텍스트
const NOTIFY_TITLE = '척추요정 알림';
const NOTIFY_MESSAGE = '집중해서 근무한지 설정된 시간이 지났어요!\n자세를 고치고 허리한번 피시죠! 허리피자 웃음피자 포테이토피자~~';
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
  chrome.storage.local.set({ lastNotified: Date.now() });
}

// 알림 버튼/클릭 시 닫기
chrome.notifications.onButtonClicked.addListener((notifId) => chrome.notifications.clear(notifId));
chrome.notifications.onClicked.addListener((notifId) => chrome.notifications.clear(notifId));

// === chrome.alarms API로 알림 예약 ===
const ALARM_NAME = 'postureAlarm';

async function scheduleAlarm() {
  const result = await chrome.storage.local.get('notificationInterval');
  const intervalMinutes = result?.notificationInterval || DEFAULT_NOTIFY_INTERVAL_MINUTES;
  
  await chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: intervalMinutes });
  chrome.storage.local.set({ lastNotified: Date.now() });
  console.log(`알람이 ${intervalMinutes}분 주기로 예약되었으며, lastNotified가 갱신되었습니다.`);
}

// 알람 발생 시 알림 띄우기
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    showPostureNotification();
  }
});

// 확장 설치/리로드 또는 브라우저 시작 시 알람 예약
chrome.runtime.onInstalled.addListener(() => {
  console.log('확장 프로그램 설치됨/업데이트됨. 알람 예약 시도.');
  showPostureNotification(); // 설치 직후 1회 알림 (선택 사항)
  scheduleAlarm();
});

// 서비스 워커 시작 시 (브라우저 시작 포함) 알람 예약
// onInstalled가 브라우저 업데이트 시에도 발생하므로, onStartup은 중복될 수 있지만 명시적으로 추가
chrome.runtime.onStartup.addListener(() => {
    console.log("브라우저 시작됨. 알람 예약 시도.");
    scheduleAlarm();
});

// popup.js로부터 알람 재설정 메시지 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'rescheduleAlarm') {
    console.log('알람 재설정 요청 받음');
    scheduleAlarm().then(() => {
        sendResponse({ status: 'Alarm rescheduled' });
    }).catch(error => {
        console.error("알람 재설정 중 오류:", error);
        sendResponse({ status: 'Failed to reschedule alarm', error: error.message });
    });
    return true; // 비동기 응답을 위해 true 반환
  } else {
    console.log('기타 메시지 수신:', request);
  }
});

// 기존 메시지 리스너 유지
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in background:', request);
  return true;
}); 