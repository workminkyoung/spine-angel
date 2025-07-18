// background.js
// === 알림 주기(분) ===
const DEFAULT_NOTIFY_INTERVAL_MINUTES = 30; // 기본 알림 간격 (분 단위)

// 알림에 사용할 이미지 경로 (manifest에 등록된 경로 기준)
const NOTIFY_IMAGE = 'images/tempImg_x1.png';

// 알림 텍스트
const NOTIFY_TITLE = '척추요정 알림';
const NOTIFY_BTN_TEXT = '자세완벽!';

// 랜덤 tip을 받아오는 함수
async function getRandomTip(isOvertime = false) {
  try {
    // 전체 JSON 데이터를 가져오기 위해 .json으로 변경
    const res = await fetch('https://spine-angel-default-rtdb.firebaseio.com/.json');
    const data = await res.json();
    
    console.log("Firebase 데이터:", data); // 디버깅용
    console.log("isOvertime:", isOvertime); // 디버깅용
    console.log("data.overtime 존재:", !!data.overtime); // 디버깅용
    console.log("data.tip 존재:", !!data.tip); // 디버깅용
    
    if (data.overtime) {
      console.log("overtime 배열 길이:", data.overtime.length);
      console.log("overtime 배열 내용:", data.overtime);
    }
    
    // 6시 이후 야근 시간대인 경우 overtime 메시지 사용
    if (isOvertime && data.overtime && Array.isArray(data.overtime) && data.overtime.length > 0) {
      console.log("overtime 배열 사용"); // 디버깅용
      let tip = data.overtime[Math.floor(Math.random() * data.overtime.length)];
      tip = tip.replace(/\\n/g, '\n');
      console.log("선택된 overtime 메시지:", tip);
      return tip;
    }
    
    // 일반 시간대인 경우 tip 배열 사용
    if (data.tip && Array.isArray(data.tip) && data.tip.length > 0) {
      console.log("tip 배열 사용"); // 디버깅용
      let tip = data.tip[Math.floor(Math.random() * data.tip.length)];
      tip = tip.replace(/\\n/g, '\n');
      console.log("선택된 tip 메시지:", tip);
      return tip;
    }
  } catch (e) {
    console.error("Failed to fetch random tip:", e);
  }
  return '허리를 펴세요!';
}

// 알림 생성 함수 (랜덤 tip 사용)
async function showPostureNotification() {
  // 출퇴근 시간대 체크 추가
  const {
    workStartTime = "09:00",
    workEndTime = "18:00"
  } = await chrome.storage.local.get(["workStartTime", "workEndTime"]);

  // 현재 시각을 HH:MM으로 구함
  const now = new Date();
  const nowHM = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = workStartTime.split(":").map(Number);
  const [endH, endM] = workEndTime.split(":").map(Number);
  const startHM = startH * 60 + startM;
  const endHM = endH * 60 + endM;

  // 출근~퇴근 시간대가 아니면 알림 X
  if (!(nowHM >= startHM && nowHM < endHM)) {
    // console.log("근무시간 외, 알림 미출력");
    return;
  }

  // 6시(18시) 이후인지 확인
  const isOvertime = now.getHours() >= 18;
  
  const tip = await getRandomTip(isOvertime);
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
  // console.log(`알람이 ${intervalMinutes}분 주기로 예약되었으며, lastNotified가 갱신되었습니다.`); // 제거
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
  // console.log('확장 프로그램 설치됨/업데이트됨. 알람 예약 시도.'); // 제거
  // showPostureNotification(); // 설치 직후 1회 알림 제거
  scheduleAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  // 브라우저 시작 시에는 더 이상 Windows 알림 가이드를 표시하지 않음
  // showWindowsNotificationGuide(); 
  // console.log('브라우저 시작됨. 알람 예약 시도.'); // 제거
  scheduleAlarm();
});

// popup.js로부터 알람 재설정 메시지 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'rescheduleAlarm') {
    // console.log('알람 재설정 요청 받음'); // 제거
    scheduleAlarm().then(() => {
        sendResponse({ status: 'Alarm rescheduled' });
    }).catch(error => {
        console.error("알람 재설정 중 오류:", error);
        sendResponse({ status: 'Failed to reschedule alarm', error: error.message });
    });
    return true; // 비동기 응답을 위해 true 반환
  } else {
    // console.log('기타 메시지 수신 (처리되지 않음):', request); // 제거
    // 필요하다면 여기서 다른 타입의 메시지를 처리하거나, sendResponse({})로 채널을 닫을 수 있습니다.
    // 현재는 정의되지 않은 메시지에 대해 특별한 응답을 하지 않으므로, false 또는 아무것도 반환하지 않아 채널이 닫히도록 합니다.
    // sendResponse를 호출하지 않고 true를 반환하면 채널이 계속 열려있을 수 있으므로 주의해야 합니다.
    // 명시적으로 처리하지 않는 메시지에 대해서는 false를 반환하거나 아무것도 반환하지 않는 것이 안전합니다.
    return false; 
  }
}); 