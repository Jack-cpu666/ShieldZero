// Global variable to track state
let isEnabled = true;
let blockedCount = 0;

function incrementStats() {
    blockedCount++;
    // Notify background to update badge
    chrome.runtime.sendMessage({
        action: "updateBadge",
        count: blockedCount
    });
}

// 1. Initial State Check
chrome.storage.local.get(['enabled', 'whitelistedItems'], function (result) {
    if (result.enabled !== undefined) isEnabled = result.enabled;

    // Check if current site is whitelisted
    if (result.whitelistedItems && result.whitelistedItems.includes(window.location.hostname)) {
        console.log("Shield Pro: specific site whitelist active.");
        isEnabled = false;
    }

    if (isEnabled) {
        initAdBlocker();
    }
});

// Zapper Variables
let zapperActive = false;
let lastHighlightedElement = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getStats") {
        sendResponse({ count: blockedCount });
    }

    // Start Zapper Mode
    if (request.action === "startZapper") {
        enableZapper();
    }
});

function enableZapper() {
    zapperActive = true;
    document.body.style.cursor = "crosshair";

    // Add overlay/listeners
    document.addEventListener('mouseover', zapperHover, true);
    document.addEventListener('click', zapperClick, true);
    document.addEventListener('keydown', zapperEsc, true);

    // Create a toast
    showZapperToast("Zap Mode Active: Click request to remove. ESC to cancel.");
}

function zapperHover(e) {
    if (!zapperActive) return;
    e.stopPropagation();
    e.preventDefault();

    if (lastHighlightedElement) {
        lastHighlightedElement.style.outline = "";
        lastHighlightedElement.style.backgroundColor = "";
    }

    lastHighlightedElement = e.target;
    e.target.style.outline = "2px solid #ef5350";
    e.target.style.backgroundColor = "rgba(239, 83, 80, 0.2)";
}

function zapperClick(e) {
    if (!zapperActive) return;
    e.stopPropagation();
    e.preventDefault();

    const target = e.target;
    // Zap it!
    target.remove();
    incrementStats();

    // Exit mode
    disableZapper();
}

function zapperEsc(e) {
    if (e.key === "Escape") disableZapper();
}

function disableZapper() {
    zapperActive = false;
    document.body.style.cursor = "default";
    document.removeEventListener('mouseover', zapperHover, true);
    document.removeEventListener('click', zapperClick, true);
    document.removeEventListener('keydown', zapperEsc, true);

    if (lastHighlightedElement) {
        lastHighlightedElement.style.outline = "";
        lastHighlightedElement.style.backgroundColor = "";
    }
    hideZapperToast();
}

function showZapperToast(msg) {
    const toast = document.createElement('div');
    toast.id = "shield-pro-toast";
    toast.style.position = "fixed";
    toast.style.top = "20px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.background = "#333";
    toast.style.color = "#fff";
    toast.style.padding = "10px 20px";
    toast.style.borderRadius = "30px";
    toast.style.zIndex = "9999999";
    toast.style.fontFamily = "sans-serif";
    toast.style.fontWeight = "bold";
    toast.innerText = msg;
    document.body.appendChild(toast);
}

function hideZapperToast() {
    const t = document.getElementById('shield-pro-toast');
    if (t) t.remove();
}

// 2. Listen for changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.enabled) {
        isEnabled = changes.enabled.newValue;
        if (isEnabled) {
            initAdBlocker();
        } else {
            // Reload page to restore ads? 
            // Often easiest, but for now we just stop the intervals
            location.reload();
        }
    }
});

function initAdBlocker() {
    console.log("AdBlocker: Active");
    runCosmeticWebRemoval();

    // Check if we are on YouTube
    if (window.location.hostname.includes('youtube.com')) {
        initYouTubeSkipper();
    }
}

// --- GENERAL WEBSITE BLOCKING ---
const adSelectors = [
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="googlesyndication.com"]',
    'div[id*="google_ads"]',
    'div[class*="ad-banner"]',
    'div[class*="ad_banner"]',
    '.adsbygoogle',
    '#sidebar-ad',
    '[id^="div-gpt-ad"]',
    '.ad-container',
    '.ytd-ad-slot-renderer', // YT generic
    '.ytd-promoted-sparkles-web-renderer', // YT generic
    'ytd-promoted-sparkles-web-renderer'
];

function runCosmeticWebRemoval() {
    if (!isEnabled) return;

    adSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            if (el.style.display !== 'none') {
                el.style.display = 'none !important';
                incrementStats();
            }
        });
    });
}

// Observer for dynamic content (General)
const observer = new MutationObserver((mutations) => {
    if (!isEnabled) return;
    runCosmeticWebRemoval();
});
observer.observe(document.body, { childList: true, subtree: true });


// --- YOUTUBE SPECIFIC LOGIC ---
function initYouTubeSkipper() {
    console.log("Shield Pro: YouTube Mode Active (Aggressive)");

    // Scan every 50ms - aggressive!
    setInterval(() => {
        if (!isEnabled) return;

        const video = document.querySelector('video');
        const player = document.querySelector('.html5-video-player');

        // Check if an ad is actually playing
        const isAdShowing = player?.classList.contains('ad-showing') ||
            player?.classList.contains('ad-interrupting') ||
            document.querySelector('.ad-showing');

        if (isAdShowing && video) {

            // 1. Mute immediately
            video.muted = true;

            // 2. Skip to the end (best way to kill the ad vs speed up)
            if (isFinite(video.duration)) {
                video.currentTime = video.duration;
            } else {
                video.currentTime = 10000; // Fallback
            }

            // 3. Speed up just in case
            video.playbackRate = 16;

            // 4. click ALL possible skip buttons
            const skipButtons = document.querySelectorAll(
                '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .videoAdUiSkipButton, .ytp-ad-text'
            );
            skipButtons.forEach(btn => {
                if (btn) btn.click();
            });
        }

        // 5. Nuke overlay ads (the banner ones at the bottom)
        const overlays = document.querySelectorAll(
            '.ytp-ad-overlay-container, .ytp-ad-text-overlay, .ytp-ad-image-overlay, .ytp-ad-module > *'
        );
        overlays.forEach(el => {
            if (el && !el.classList.contains('ytp-storyboard-framepreview-img')) {
                el.style.display = 'none';
            }
        });

    }, 50);
}
