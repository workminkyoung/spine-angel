// popup.js
console.log("Popup script loaded!");

document.addEventListener('DOMContentLoaded', function() {
    console.log("Popup script initialized.");

    var interval = document.getElementById('interval');
    var dropdownBtn = document.getElementById('showDropdown');
    var dropdown = document.getElementById('intervalDropdown');
    var saveBtn = document.getElementById('saveInterval');
    var options = document.querySelectorAll('#intervalDropdown a');
    
    if (!interval) console.error('Interval input not found!');
    if (!dropdownBtn) console.error('Dropdown button (#showDropdown) not found!');
    if (!dropdown) console.error('Dropdown menu (#intervalDropdown) not found!');
    if (!saveBtn) console.error('Save button not found!');

    if (dropdownBtn && dropdown) {
        dropdownBtn.addEventListener('click', function(event) {
            console.log("Dropdown button clicked.");
            event.stopPropagation();
            dropdown.classList.toggle('show');
            console.log("Dropdown classList:", dropdown.classList.toString());
        });
    }
    
    if (options && interval && dropdown) {
        options.forEach(function(option) {
            option.addEventListener('click', function(event) {
                console.log("Dropdown option clicked:", this.getAttribute('data-value'));
                event.stopPropagation();
                interval.value = this.getAttribute('data-value');
                dropdown.classList.remove('show');
                console.log("Dropdown hidden, classList:", dropdown.classList.toString());
            });
        });
    }
    
    document.addEventListener('click', function(event) {
        if (dropdownBtn && dropdown && dropdown.classList.contains('show')) {
            let isClickInsideButton = dropdownBtn.contains(event.target);
            let isClickInsideMenu = dropdown.contains(event.target);

            if (!isClickInsideButton && !isClickInsideMenu) {
                console.log("Clicked outside, hiding dropdown.");
                dropdown.classList.remove('show');
                console.log("Dropdown hidden by outside click, classList:", dropdown.classList.toString());
            }
        }
    });
    
    // Check if Chrome API and storage are available
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        console.log("chrome.storage.local is available.");
        chrome.storage.local.get('notificationInterval', function(data) {
            if (interval) {
                if (data && data.notificationInterval) { // Check if data itself is defined
                    interval.value = data.notificationInterval;
                    console.log("Loaded interval from storage:", data.notificationInterval);
                } else {
                    interval.value = 30; // Default value
                    console.log("Set default interval: 30. Data from storage:", data);
                }
            }
        });
    } else {
        console.error("chrome.storage.local is NOT available.");
        // Fallback or error handling if storage is not available
        if (interval) {
            interval.value = 30; // Default value if storage fails
            console.log("Storage API not available. Set default interval: 30");
        }
    }
    
    if (saveBtn && interval) {
        saveBtn.addEventListener('click', function() {
            var value = parseInt(interval.value);
            if (!isNaN(value) && value > 0) {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.set({ 'notificationInterval': value }, function() {
                        if (chrome.runtime.lastError) {
                            console.error("Error setting storage:", chrome.runtime.lastError.message);
                            alert("Error saving interval: " + chrome.runtime.lastError.message);
                            return;
                        }
                        console.log('알림 간격이 ' + value + '분으로 저장되었습니다.');
                        window.close();
                    });
                } else {
                    console.error("Cannot save: chrome.storage.local is NOT available.");
                    alert("Error: Unable to save settings due to storage unavailability.");
                }
            } else {
                alert('유효한 분 단위 숫자를 입력해주세요.');
            }
        });
    }
}); 