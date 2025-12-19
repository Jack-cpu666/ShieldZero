// Initialize default state
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ enabled: true });
    // Enable the blocking ruleset by default
    chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: ['ruleset_1']
    });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggle") {
        const isEnabled = request.value;

        // Update storage
        chrome.storage.local.set({ enabled: isEnabled });

        // Toggle the network blocking rules
        if (isEnabled) {
            chrome.declarativeNetRequest.updateEnabledRulesets({
                enableRulesetIds: ['ruleset_1']
            });
            // Also enable content script logic programmatically if needed? 
            // Actually content script listens to storage changes too.
        } else {
            chrome.declarativeNetRequest.updateEnabledRulesets({
                disableRulesetIds: ['ruleset_1']
            });
        }

        // Re-inject content script or reload tab? 
        // Reloading the active tab is usually best for immediate effect
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.reload(tabs[0].id);
            }
        });

        sendResponse({ status: "done" });
    }

    // Handle Whitelist
    if (request.action === "toggleWhitelist") {
        const domain = request.domain;

        chrome.storage.local.get(['whitelistedItems'], function (result) {
            let list = result.whitelistedItems || [];

            if (list.includes(domain)) {
                // Remove from whitelist (Re-enable blocking)
                list = list.filter(d => d !== domain);

                // Update Dynamic Rules: Remove Allow rules
                updateAllowRules(list);

            } else {
                // Add to whitelist (Disable blocking)
                list.push(domain);
                updateAllowRules(list);
            }

            chrome.storage.local.set({ whitelistedItems: list });

            // Reload tab to apply
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].id) chrome.tabs.reload(tabs[0].id);
            });

            sendResponse({ isWhitelisted: list.includes(domain) });
        });

        return true; // async response
    }
    // Handle badge updates
    if (request.action === "updateBadge") {
        if (sender.tab) {
            chrome.action.setBadgeText({
                text: request.count.toString(),
                tabId: sender.tab.id
            });
            chrome.action.setBadgeBackgroundColor({
                color: "#4CAF50",
                tabId: sender.tab.id
            });
        }
    }
});

function updateAllowRules(whitelist) {
    // 1. Calculate IDs to remove (clearing previous allow rules)
    // In a real app we'd track IDs. Here we just assume IDs 1000+ are for whitelist.

    // First, get existing dynamic rules to find what to remove
    chrome.declarativeNetRequest.getDynamicRules(rules => {
        const removeRuleIds = rules.map(r => r.id);

        const addRules = whitelist.map((domain, index) => ({
            "id": 1000 + index,
            "priority": 9999, // High priority to override block rules
            "action": { "type": "allow" },
            "condition": {
                "urlFilter": `||${domain}^`,
                "resourceTypes": ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"]
            }
        }));

        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: removeRuleIds,
            addRules: addRules
        });
    });
}
