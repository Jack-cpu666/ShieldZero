# Shield Pro - Advanced Ad Blocker

**Shield Pro** is a powerful, lightweight, and modern ad blocker extension built for Chrome and Edge using Manifest V3. It features aggressive ad blocking, YouTube optimization, and advanced user controls like Whitelisting and an Element Zapper.

![Shield Pro Icon](extension/icons/icon128.png)

## 🚀 Features

*   **🛡️ Network Level Blocking**: Uses `declarativeNetRequest` to block ads and trackers at the network level before they load.
*   **📺 YouTube Optimization (Pro)**: 
    *   Aggressively skips video ads (mutes & fast-forwards effectively instantly).
    *   Hides banner overlays and promoted content.
*   **⚡ Element Zapper**: thorough "Point & Click" mode to remove any unwanted element from a page permanently.
*   **✅ Whitelisting**: Support your favorite content creators by allowing ads on specific sites with a single click.
*   **📊 Live Stats**: See exactly how many ads are blocked on the current page in real-time.
*   **🔒 Privacy Focused**: Runs entirely on your device. No data collection.

## 📦 Installation

Since this is a developer extension, you install it via "Developer Mode":

1.  Open your browser and navigate to `chrome://extensions` (or `edge://extensions`).
2.  Enable **Developer Mode** (toggle in the top-right corner).
3.  Click **Load unpacked**.
4.  Select the `extension` folder inside this project directory:
    *   `.../ad blocker/extension`
5.  The **Shield Pro** icon should appear in your toolbar. Pin it for easy access!

## 🎮 Usage

Click the **Shield Pro** icon in your toolbar to open the control panel:

*   **Global Toggle**: Turn the entire blocker On or Off.
*   **Allow Ads (Whitelist)**: Click to disable blocking *only* for the current website.
*   **Zap Element**: Click to enter "Zap Mode". Then click any element on the webpage to delete it. Press `Esc` to cancel.
*   **Stats**: View the number of ads blocked on the current tab.

## 🛠️ Technical Details

*   **Manifest Version**: V3
*   **Permissions**: `declarativeNetRequest`, `storage`, `activeTab`, `scripting`
*   **Core Logic**: 
    *   `rules.json`: Static blocking rules (16,000+ basic rules + dynamic updates).
    *   `content.js`: page manipulation, YouTube skipping, and zapper logic.
    *   `background.js`: Service worker for managing state and dynamic rules.

## 📂 Project Structure

```
ad blocker/
├── extension/
│   ├── icons/              # Extension icons
│   ├── background.js       # Service worker (MV3)
│   ├── content.js          # Page script (Cosmetic filtering & YT)
│   ├── generated-styles.css # Global CSS hiding rules
│   ├── manifest.json       # Extension configuration
│   ├── popup.html          # UI Layout
│   ├── popup.js            # UI Logic
│   └── rules.json          # Network blocking rules
├── install_adblocker.py    # Automation script for shortcuts
└── README.md               # This file
```

## 📝 version History

*   **v1.8**: Fixed popup encoding issues.
*   **v1.7**: Improved error handling for stats polling.
*   **v1.5**: Added Whitelisting and Element Zapper.
*   **v1.3**: Aggressive YouTube skipping (50ms interval).
*   **v1.0**: Initial release with blocking rules.
