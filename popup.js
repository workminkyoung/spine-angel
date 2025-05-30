// popup.js
// 팝업의 주요 UI/UX 기능을 구조화하여 관리합니다.

document.addEventListener('DOMContentLoaded', () => {
    // console.log("Popup script initialized (DOMContentLoaded, 알림용 버전).");

    // === DOM 셀렉터 상수 ===
    const $mainView = document.getElementById('mainView'); // 메인 소개 화면 wrapper
    const $header = document.querySelector('.header-section'); // 상단 헤더
    const $settingsPanel = document.getElementById('settingsPanel'); // 설정 패널
    const $toggleSettings = document.getElementById('toggleSettings'); // 설정 진입 버튼
    const $githubBtn = document.getElementById('githubBtn'); // 깃허브 이동 버튼
    // 새로운 시간/분/초 입력 필드
    const $intervalHours = document.getElementById('intervalHours');
    const $intervalMinutes = document.getElementById('intervalMinutes');
    const $intervalSeconds = document.getElementById('intervalSeconds');
    const $workStartTime = document.getElementById('workStartTime'); // 출근 시간
    const $workEndTime = document.getElementById('workEndTime'); // 퇴근 시간
    const $saveBtn = document.getElementById('saveInterval'); // 저장 버튼
    const $intervalForm = document.getElementById('intervalForm'); // 폼 전체
    const $countdownTimer = document.getElementById('countdownTimer'); // Countdown timer UI element
    const $devModeToggle = document.getElementById('devModeToggle');
    const $homeBtn = document.getElementById('homeBtn'); // 홈 버튼
    const $homeModal = document.getElementById('homeModal'); // 홈 모달
    const $notificationHelpLink = document.getElementById('notificationHelpLink');
    const $notificationHelpLinkRow = document.querySelector('.notification-help-link-row'); // 링크 컨테이너
    // const $firebaseMessageDiv = document.getElementById('firebaseMessage'); // 더 이상 사용하지 않음

    let devMode = false;
    if ($devModeToggle) {
        $devModeToggle.addEventListener('change', (e) => {
            devMode = e.target.checked;
            saveDevMode(devMode);
        });
    }

    // === UI 토글 함수 ===
    // 설정 패널만 보이게
    function showSettingsPanel() {
        if ($header) $header.style.display = 'none';
        if ($settingsPanel) $settingsPanel.style.display = 'block';
        if ($notificationHelpLinkRow) $notificationHelpLinkRow.style.display = 'none'; // 링크 숨기기
        if (countdownInterval) clearInterval(countdownInterval); // 설정창 열면 메인뷰 타이머 중지
        loadDevMode(); // 설정 패널 열 때마다 개발자 모드 상태 반영
        loadWorkTimes(); // 설정 패널 열 때 출퇴근 시간 로드
    }
    // 메인 화면만 보이게
    function hideSettingsPanel() {
        if ($header) $header.style.display = 'block';
        if ($settingsPanel) $settingsPanel.style.display = 'none';
        if ($notificationHelpLinkRow) $notificationHelpLinkRow.style.display = 'block'; // 링크 보이기
        startCountdownTimer(); // 메인뷰로 돌아오면 타이머 다시 시작
        // fetchFirebaseMessage(); // 팁 메시지 더 이상 불필요
    }

    // === 이벤트 바인딩 ===
    if ($toggleSettings) {
        $toggleSettings.addEventListener('click', showSettingsPanel);
    }
    if ($githubBtn) {
        $githubBtn.addEventListener('click', () => {
            window.open('https://github.com/workminkyoung/spine-angel', '_blank');
        });
    }

    // === 알림 간격 및 출퇴근 시간 저장 및 로드 ===
    const DEFAULT_INTERVAL_MINUTES = 30; // 기본 알림 간격 (분 단위)
    const DEFAULT_WORK_START_TIME = "09:00"; // 기본 출근 시간
    const DEFAULT_WORK_END_TIME = "18:00"; // 기본 퇴근 시간

    function loadInterval() {
        chrome.storage.local.get('notificationInterval', (data) => {
            let totalMinutes = data?.notificationInterval || DEFAULT_INTERVAL_MINUTES;
            if (typeof totalMinutes !== 'number' || isNaN(totalMinutes)) {
                totalMinutes = DEFAULT_INTERVAL_MINUTES;
            }

            const hours = Math.floor(totalMinutes / 60);
            const minutes = Math.floor(totalMinutes % 60);
            const seconds = Math.round((totalMinutes * 60) % 60); // 분의 소수점 이하를 초로 변환

            if ($intervalHours) $intervalHours.value = hours;
            if ($intervalMinutes) $intervalMinutes.value = minutes;
            if ($intervalSeconds) $intervalSeconds.value = seconds;
        });
    }

    function loadWorkTimes() {
        chrome.storage.local.get(['workStartTime', 'workEndTime'], (data) => {
            if ($workStartTime) {
                $workStartTime.value = data?.workStartTime || DEFAULT_WORK_START_TIME;
            }
            if ($workEndTime) {
                $workEndTime.value = data?.workEndTime || DEFAULT_WORK_END_TIME;
            }
        });
    }

    function showWebToast(msg) {
        const toast = document.getElementById('webToast');
        if (!toast) return;
        toast.textContent = msg;
        toast.style.display = 'block';
        clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(() => {
            toast.style.display = 'none';
        }, 5000);
    }

    function showIntervalErrorMsg(msg) {
        const errDiv = document.getElementById('intervalErrorMsg');
        if (!errDiv) return;
        errDiv.textContent = msg;
        errDiv.style.display = 'block';
        clearTimeout(errDiv._hideTimer);
        errDiv._hideTimer = setTimeout(() => {
            errDiv.style.display = 'none';
        }, 5000);
    }

    function saveInterval(e) {
        e.preventDefault();
        const hours = parseInt($intervalHours.value) || 0;
        const minutes = parseInt($intervalMinutes.value) || 0;
        const seconds = parseInt($intervalSeconds.value) || 0;
        const workStartTime = $workStartTime ? $workStartTime.value : DEFAULT_WORK_START_TIME;
        const workEndTime = $workEndTime ? $workEndTime.value : DEFAULT_WORK_END_TIME;

        if (hours < 0 || minutes < 0 || seconds < 0 || minutes > 59 || seconds > 59) {
            alert('유효한 시간, 분, 초를 입력해주세요.');
            return;
        }

        // 출퇴근 시간 유효성 검사 (선택 사항이지만 추가하면 좋음)
        if (workStartTime && workEndTime && workStartTime >= workEndTime) {
            showIntervalErrorMsg('출근 시간은 퇴근 시간보다 빨라야 합니다.');
            return;
        }

        const totalMinutes = hours * 60 + minutes + seconds / 60;

        // 개발자 모드가 아닐 때만 1분 미만 제한
        if (!devMode && totalMinutes < 1) {
            chrome.storage.local.set({ 
                'notificationInterval': DEFAULT_INTERVAL_MINUTES,
                'lastNotified': Date.now(),
                'workStartTime': workStartTime,
                'workEndTime': workEndTime
            }, () => {
                showIntervalErrorMsg('알림 간격은 1분 미만으로 설정할 수 없습니다.');
            });
            return;
        }

        chrome.storage.local.set({ 
            'notificationInterval': totalMinutes,
            'lastNotified': Date.now(), // 카운트다운 기준을 현재로 설정하여 즉시 초기화
            'workStartTime': workStartTime,
            'workEndTime': workEndTime
        }, () => {
            if (chrome.runtime.lastError) {
                // console.warn("메시지 전송 실패 (background 서비스워커 비활성 상태일 수 있음)");
            }
             // console.log(response?.status || "메시지 응답 없음");
            hideSettingsPanel(); // 저장 후 메인 화면으로 돌아가면서 카운트다운 재시작
        });
    }

    // --- 폼 제출 이벤트 (저장) ---
    if ($intervalForm) {
        $intervalForm.addEventListener('submit', saveInterval);
    } else if ($saveBtn && $intervalHours && $intervalMinutes && $intervalSeconds) {
        // 혹시 폼이 없을 때를 위한 fallback
        $saveBtn.addEventListener('click', () => {
            const hours = parseInt($intervalHours.value) || 0;
            const minutes = parseInt($intervalMinutes.value) || 0;
            const seconds = parseInt($intervalSeconds.value) || 0;
            const workStartTime = $workStartTime ? $workStartTime.value : DEFAULT_WORK_START_TIME;
            const workEndTime = $workEndTime ? $workEndTime.value : DEFAULT_WORK_END_TIME;

            if (hours < 0 || minutes < 0 || seconds < 0 || minutes > 59 || seconds > 59) {
                alert('유효한 시간, 분, 초를 입력해주세요.');
                return;
            }

            // 출퇴근 시간 유효성 검사 (선택 사항이지만 추가하면 좋음)
            if (workStartTime && workEndTime && workStartTime >= workEndTime) {
                showIntervalErrorMsg('출근 시간은 퇴근 시간보다 빨라야 합니다.');
                return;
            }

            const totalMinutes = hours * 60 + minutes + seconds / 60;

            if (totalMinutes < 1) {
                chrome.storage.local.set({ 
                    'notificationInterval': DEFAULT_INTERVAL_MINUTES,
                    'lastNotified': Date.now(),
                    // 'workStartTime': $workStartTime ? $workStartTime.value : DEFAULT_WORK_START_TIME, // Fallback에도 추가
                    // 'workEndTime': $workEndTime ? $workEndTime.value : DEFAULT_WORK_END_TIME
                }, () => {
                    showIntervalErrorMsg('알림 간격은 1분 미만으로 설정할 수 없습니다.');
                });
                return;
            }

            chrome.storage.local.set({ 
                'notificationInterval': totalMinutes,
                'lastNotified': Date.now(), // 카운트다운 기준을 현재로 설정하여 즉시 초기화
                // 'workStartTime': $workStartTime ? $workStartTime.value : DEFAULT_WORK_START_TIME, // Fallback에도 추가
                // 'workEndTime': $workEndTime ? $workEndTime.value : DEFAULT_WORK_END_TIME
            }, () => {
                if (chrome.runtime.lastError) {
                    // console.warn("메시지 전송 실패 (background 서비스워커 비활성 상태일 수 있음)");
                }
                 // console.log(response?.status || "메시지 응답 없음");
                hideSettingsPanel(); // 저장 후 메인 화면으로 돌아가면서 카운트다운 재시작
            });
        });
    }

    // === 알림 카운트다운 타이머 ===
    let countdownInterval = null;
    function pad(n) { return n < 10 ? '0' + n : n; }

    function updateCountdownUI(remainMs) {
        if (!$countdownTimer) return;
        if (remainMs <= 0) {
            $countdownTimer.textContent = '00:00';
        } else {
            const totalSeconds = Math.floor(remainMs / 1000);
            const min = Math.floor(totalSeconds / 60);
            const sec = totalSeconds % 60;
            $countdownTimer.textContent = pad(min) + ':' + pad(sec);
        }
    }

    function startCountdownTimer() {
        if (countdownInterval) clearInterval(countdownInterval);
        chrome.storage.local.get(['notificationInterval', 'lastNotified'], (data) => {
            const intervalToUse = data?.notificationInterval || DEFAULT_INTERVAL_MINUTES;
            const fullIntervalMs = intervalToUse * 60 * 1000;
            let remainMs = fullIntervalMs;
            
            const lastNotified = data?.lastNotified;
            const now = Date.now();

            if (lastNotified && (now - lastNotified < fullIntervalMs)) {
                remainMs = fullIntervalMs - (now - lastNotified);
            }

            updateCountdownUI(remainMs);
            countdownInterval = setInterval(() => {
                remainMs -= 1000;
                if (remainMs < 0) { // 0보다 작아질 경우를 대비해 < 0 으로 변경
                    updateCountdownUI(0);
                    clearInterval(countdownInterval);
                    // Optionally, fetch new lastNotified time or re-evaluate
                } else {
                    updateCountdownUI(remainMs);
                }
            }, 1000);
        });
    }

    // 개발자 모드 상태를 저장/로드
    function loadDevMode() {
        chrome.storage.local.get('devMode', (data) => {
            if ($devModeToggle) {
                $devModeToggle.checked = !!data.devMode;
                devMode = !!data.devMode;
            }
        });
    }
    function saveDevMode(val) {
        chrome.storage.local.set({ devMode: !!val });
    }

    // === 홈 모달 열기/닫기 ===
    if ($homeBtn && $homeModal) {
        $homeBtn.addEventListener('click', () => {
            $homeModal.innerHTML = `
                <button class="close-modal-btn" title="닫기">&times;</button>
                <div style="text-align:center;">
                    <h2>홈 모달</h2>
                    <p>여기에 원하는 홈 관련 내용을 넣으세요.</p>
                </div>
            `;
            $homeModal.style.display = 'flex';
            // 닫기 버튼 이벤트
            $homeModal.querySelector('.close-modal-btn').onclick = () => {
                $homeModal.style.display = 'none';
            };
        });
    }

    // === 초기화 ===
    loadInterval(); // 팝업 로드시 저장된 알림 간격 가져오기
    loadWorkTimes(); // 팝업 로드시 저장된 출퇴근 시간 가져오기
    loadDevMode(); // 개발자 모드 상태 로드
    hideSettingsPanel(); // 초기에는 메인 화면을 보여줌
    startCountdownTimer(); // 팝업이 열릴 때 카운트다운 시작 또는 재개

    // "알람이 안뜨시나요?" 링크 클릭 시 로컬 guide.html 열기
    if ($notificationHelpLink) {
        $notificationHelpLink.addEventListener('click', (event) => {
            event.preventDefault(); // 기본 동작 방지
            chrome.tabs.create({ url: chrome.runtime.getURL('guide.html') });
        });
    }
}); 