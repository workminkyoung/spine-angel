// background.js
// === 알림 주기(분) ===
const DEFAULT_NOTIFY_INTERVAL_MINUTES = 30; // 기본 알림 간격 (분 단위)

// 알림에 사용할 이미지 경로 (manifest에 등록된 경로 기준)
const NOTIFY_IMAGE = 'images/tempImg_x1.png';

// 알림 텍스트
const NOTIFY_TITLE = '척추요정 알림';
const NOTIFY_BTN_TEXT = '자세완벽!';

// 랜덤 tip을 받아오는 함수
async function getRandomTip() {
  try {
    const res = await fetch('https://spine-angel-default-rtdb.firebaseio.com/tip.json');
    const tipArray = await res.json();
    if (Array.isArray(tipArray) && tipArray.length > 0) {
      let tip = tipArray[Math.floor(Math.random() * tipArray.length)];
      // \n을 실제 줄바꿈으로 변환
      tip = tip.replace(/\\n/g, '\n');
      return tip;
    }
  } catch (e) {
    // 실패 시 기본 메시지
  }
  return '허리를 펴세요!';
}

// 알림 생성 함수 (랜덤 tip 사용)
async function showPostureNotification() {
  const tip = await getRandomTip();
  chrome.notifications.create({
    type: 'basic',
    iconUrl: NOTIFY_IMAGE,
    title: NOTIFY_TITLE,
    message: tip,
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

function showWindowsNotificationGuide() {
  chrome.notifications.create('windows-notification-guide', {
    type: 'basic',
    iconUrl: NOTIFY_IMAGE,
    title: 'Windows 알림 설정 확인',
    message: '알림이 표시되지 않으면\nWindows 설정 > 시스템 > 알림에서\nChrome 알림을 켜주세요.',
    priority: 2,
    buttons: [
      { title: '설정 열기' }
    ]
  });
}

chrome.notifications.onButtonClicked.addListener((notifId, buttonIndex) => {
  if (notifId === 'windows-notification-guide' && buttonIndex === 0) {
    chrome.tabs.create({ url: chrome.runtime.getURL('guide.html') });
  }
  chrome.notifications.clear(notifId);
});

// 확장 설치/업데이트 시 안내 팝업 표시
chrome.runtime.onInstalled.addListener(() => {
  showWindowsNotificationGuide();
  console.log('확장 프로그램 설치됨/업데이트됨. 알람 예약 시도.');
  // showPostureNotification(); // 설치 직후 1회 알림 제거
  scheduleAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  // 브라우저 시작 시에는 더 이상 Windows 알림 가이드를 표시하지 않음
  // showWindowsNotificationGuide(); 
  console.log('브라우저 시작됨. 알람 예약 시도.');
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
    console.log('기타 메시지 수신 (처리되지 않음):', request);
    // 필요하다면 여기서 다른 타입의 메시지를 처리하거나, sendResponse({})로 채널을 닫을 수 있습니다.
    // 현재는 정의되지 않은 메시지에 대해 특별한 응답을 하지 않으므로, false 또는 아무것도 반환하지 않아 채널이 닫히도록 합니다.
    // sendResponse를 호출하지 않고 true를 반환하면 채널이 계속 열려있을 수 있으므로 주의해야 합니다.
    // 명시적으로 처리하지 않는 메시지에 대해서는 false를 반환하거나 아무것도 반환하지 않는 것이 안전합니다.
    return false; 
  }
}); 