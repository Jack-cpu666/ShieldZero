document.addEventListener('DOMContentLoaded', function () {
    const powerSwitch = document.getElementById('powerSwitch');
    const statusLabel = document.getElementById('statusLabel');

    const whitelistBtn = document.getElementById('whitelistBtn');
    const whitelistText = document.getElementById('whitelistText');
    const whitelistIcon = document.getElementById('whitelistIcon');
    const zapBtn = document.getElementById('zapBtn');
    const siteNameEl = document.getElementById('siteName');

    let currentDomain = "";

    // 1. Get current state and domain
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs[0]) return;

        try {
            const url = new URL(tabs[0].url);
            currentDomain = url.hostname;
            if (siteNameEl) siteNameEl.textContent = currentDomain;

            // Check if whitelisted using background check or storage
            chrome.storage.local.get(['whitelistedItems'], function (result) {
                const list = result.whitelistedItems || [];
                updateWhitelistUI(list.includes(currentDomain));
            });
        } catch (e) {
            if (siteNameEl) siteNameEl.textContent = "System Page";
            if (whitelistBtn) whitelistBtn.disabled = true;
            if (zapBtn) zapBtn.disabled = true;
        }
    });

    chrome.storage.local.get(['enabled'], function (result) {
        const isEnabled = result.enabled !== undefined ? result.enabled : true;
        updateUI(isEnabled);
    });

    // 2. Handle Global Toggle
    powerSwitch.addEventListener('change', function () {
        const isEnabled = powerSwitch.checked;
        updateUI(isEnabled);
        chrome.runtime.sendMessage({ action: "toggle", value: isEnabled });
    });

    // 3. Handle Whitelist Toggle
    if (whitelistBtn) whitelistBtn.addEventListener('click', function () {
        chrome.runtime.sendMessage({
            action: "toggleWhitelist",
            domain: currentDomain
        }, (response) => {
            updateWhitelistUI(response.isWhitelisted);
        });
    });

    // 4. Handle Zap Button
    if (zapBtn) zapBtn.addEventListener('click', function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "startZapper" });
            window.close(); // Close popup so user can click
        });
    });

    function updateUI(isEnabled) {
        powerSwitch.checked = isEnabled;
        if (isEnabled) {
            statusLabel.textContent = "PROTECTED";
            statusLabel.style.color = "#4CAF50";
        } else {
            statusLabel.textContent = "DISABLED";
            statusLabel.style.color = "#999";
        }
    }

    function updateWhitelistUI(isWhitelisted) {
        if (!whitelistBtn) return;
        if (isWhitelisted) {
            whitelistBtn.style.background = "#ffebee";
            whitelistBtn.style.borderColor = "#ffcdd2";
            whitelistBtn.style.color = "#c62828";
            whitelistText.textContent = "Blocking Disabled";
            whitelistIcon.textContent = "⚠️";
        } else {
            whitelistBtn.style.background = "#fff";
            whitelistBtn.style.borderColor = "#ddd";
            whitelistBtn.style.color = "#333";
            whitelistText.textContent = "Allow Ads";
            whitelistIcon.textContent = "🛡️";
        }
    }

    // 3. Poll for stats
    function fetchStats() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const tab = tabs[0];
            // Safety check: ensure tab exists and is a valid web page
            if (!tab || !tab.id || !tab.url) return;

            // Skip system pages, chrome://, and edge://
            if (tab.url.startsWith('chrome://') ||
                tab.url.startsWith('edge://') ||
                tab.url.startsWith('about:') ||
                (!tab.url.startsWith('http'))) {
                const countEl = document.getElementById('blockCount');
                if (countEl) countEl.textContent = "Active on Web Pages";
                return;
            }

            try {
                chrome.tabs.sendMessage(tab.id, { action: "getStats" }, function (response) {
                    // EXPLICITLY check and void the error to tell Chrome "I handled this"
                    if (chrome.runtime.lastError) {
                        void chrome.runtime.lastError;
                        return; // Content script likely missing (zombie tab)
                    }

                    if (response && response.count !== undefined) {
                        const countEl = document.getElementById('blockCount');
                        if (countEl) countEl.textContent = response.count + " on this page";
                    }
                });
            } catch (e) {
                // Ignore immediate errors
            }
        });
    }

    // Update stats every second while popup is open
    fetchStats();
    setInterval(fetchStats, 1000);
});
