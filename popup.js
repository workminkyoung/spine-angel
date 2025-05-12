// popup.js
// 팝업의 주요 UI/UX 기능을 구조화하여 관리합니다.

console.log("Popup script loaded!");

document.addEventListener('DOMContentLoaded', () => {
    console.log("Popup script initialized.");

    // === DOM 셀렉터 상수 ===
    const $mainView = document.getElementById('mainView'); // 메인 소개 화면 wrapper
    const $header = document.querySelector('.header-section'); // 상단 헤더
    const $settingsPanel = document.getElementById('settingsPanel'); // 설정 패널
    const $toggleSettings = document.getElementById('toggleSettings'); // 설정 진입 버튼
    const $githubBtn = document.getElementById('githubBtn'); // 깃허브 이동 버튼
    const $interval = document.getElementById('interval'); // 알림 간격 입력
    const $dropdownBtn = document.getElementById('showDropdown'); // 드롭다운 버튼
    const $dropdown = document.getElementById('intervalDropdown'); // 드롭다운 메뉴
    const $saveBtn = document.getElementById('saveInterval'); // 저장 버튼
    const $options = $dropdown ? $dropdown.querySelectorAll('a') : []; // 드롭다운 옵션
    const $intervalForm = document.getElementById('intervalForm'); // 폼 전체

    // === UI 토글 함수 ===
    // 설정 패널만 보이게
    function showSettingsPanel() {
        if ($header) $header.style.display = 'none';
        if ($settingsPanel) $settingsPanel.style.display = 'block';
    }
    // 메인 화면만 보이게
    function hideSettingsPanel() {
        if ($header) $header.style.display = 'block';
        if ($settingsPanel) $settingsPanel.style.display = 'none';
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

    // --- 드롭다운 동작 ---
    if ($dropdownBtn && $dropdown) {
        $dropdownBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            $dropdown.classList.toggle('show');
        });
    }
    if ($options && $interval && $dropdown) {
        $options.forEach(option => {
            option.addEventListener('click', (event) => {
                event.stopPropagation();
                $interval.value = option.getAttribute('data-value');
                $dropdown.classList.remove('show');
            });
        });
    }
    document.addEventListener('click', (event) => {
        if ($dropdownBtn && $dropdown && $dropdown.classList.contains('show')) {
            if (!$dropdownBtn.contains(event.target) && !$dropdown.contains(event.target)) {
                $dropdown.classList.remove('show');
            }
        }
    });

    // --- 알림 간격 저장 및 로드 ---
    function loadInterval() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get('notificationInterval', (data) => {
                if ($interval) $interval.value = data?.notificationInterval || 30;
            });
        } else {
            if ($interval) $interval.value = 30;
        }
    }
    function saveInterval(e) {
        e.preventDefault();
        const value = parseInt($interval.value);
        if (!isNaN(value) && value > 0) {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ 'notificationInterval': value }, () => {
                    if (chrome.runtime.lastError) {
                        alert('Error saving interval: ' + chrome.runtime.lastError.message);
                        return;
                    }
                    window.close();
                });
            } else {
                alert('Error: Unable to save settings due to storage unavailability.');
            }
        } else {
            alert('유효한 분 단위 숫자를 입력해주세요.');
        }
    }

    // --- 폼 제출 이벤트 (저장) ---
    if ($intervalForm) {
        $intervalForm.addEventListener('submit', saveInterval);
    } else if ($saveBtn && $interval) {
        // 혹시 폼이 없을 때를 위한 fallback
        $saveBtn.addEventListener('click', saveInterval);
    }

    // --- 최초 알림 간격 값 로드 ---
    loadInterval();

    // ====== 알림 카운트다운 타이머 ======
    // 백그라운드에서 알림 발생 시 chrome.storage.local.set({lastNotified: Date.now()})로 갱신 필요
    const COUNTDOWN_ID = 'countdownTimer';
    const COUNTDOWN_INTERVAL_MINUTES = 1; // background.js의 NOTIFY_INTERVAL_MINUTES와 동일하게 맞춰야 함
    let countdownInterval = null;

    function pad(n) { return n < 10 ? '0' + n : n; }

    function updateCountdownUI(remainMs) {
        const $timer = document.getElementById(COUNTDOWN_ID);
        if (!$timer) return;
        if (remainMs <= 0) {
            $timer.textContent = '00:00';
        } else {
            const min = Math.floor(remainMs / 60000);
            const sec = Math.floor((remainMs % 60000) / 1000);
            $timer.textContent = pad(min) + ':' + pad(sec);
        }
    }

    function startCountdownTimer() {
        if (countdownInterval) clearInterval(countdownInterval);
        let remainMs = COUNTDOWN_INTERVAL_MINUTES * 60 * 1000;
        // storage에서 lastNotified 읽기
        chrome.storage.local.get('lastNotified', (data) => {
            let last = data && data.lastNotified ? data.lastNotified : null;
            let now = Date.now();
            if (last && now - last < COUNTDOWN_INTERVAL_MINUTES * 60 * 1000) {
                remainMs = COUNTDOWN_INTERVAL_MINUTES * 60 * 1000 - (now - last);
            }
            updateCountdownUI(remainMs);
            countdownInterval = setInterval(() => {
                remainMs -= 1000;
                if (remainMs <= 0) {
                    updateCountdownUI(0);
                    clearInterval(countdownInterval);
                } else {
                    updateCountdownUI(remainMs);
                }
            }, 1000);
        });
    }

    // 메인 뷰가 보일 때만 타이머 시작
    if ($mainView && $mainView.style.display !== 'none') {
        startCountdownTimer();
    }
    // 설정창에서 메인으로 돌아올 때도 타이머 재시작
    if ($toggleSettings && $settingsPanel && $header) {
        // 기존 showSettingsPanel 함수에 hideSettingsPanel도 구현되어 있음
        // hideSettingsPanel이 호출될 때 startCountdownTimer() 호출 필요
        // 아래처럼 hideSettingsPanel을 오버라이드
        const origHideSettingsPanel = hideSettingsPanel;
        hideSettingsPanel = function() {
            if ($header) $header.style.display = 'block';
            if ($settingsPanel) $settingsPanel.style.display = 'none';
            startCountdownTimer();
        };
    }
}); 