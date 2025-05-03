# Discord Rich Presence for Web

A Chrome extension that displays your current website as a Discord Rich Presence status with enhanced features.

## Features

### Basic Features
- Shows the website you're browsing as your Discord status
- Shows website favicon and site-specific icons
- Shows page title (optional)
- Shows how long you've been on the site

### Enhanced Features
- **Smart Website Recognition**: Automatically converts domains to friendly names (e.g., youtube.com → YouTube)
- **Better Title Handling**: Cleans titles to remove common suffixes like " - YouTube"
- **Improved Favicon Detection**: Gets favicons directly from websites with fallback to Google's service
- **Enhanced Rich Presence Visuals**: Custom activity messages based on domain (e.g., "Watching videos on YouTube")
- **Dark Mode UI**: Toggle between light and dark themes
- **Blacklist Support**: Hide specific websites from appearing in your Discord status
- **Browser Stats**: Track time spent on each website
- **Idle Detection**: Automatically sets status to idle when not active
- **Custom Templates**: Create your own Discord status format with variables
- **Multi-Browser Support**: Works with Chrome, Edge, Brave, and other Chromium browsers

## Setup Instructions

### 1. Set up the Chrome Extension

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension folder (the root folder of this repo)
5. Note the extension ID shown in the extension details

### 2. Set up the Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Note the "Application ID" (Client ID) in the General Information tab
4. Go to the "Rich Presence" tab
5. Add assets with these names:
   - `web_icon`: A general web browsing icon (required)
   - `chrome`: The Chrome browser logo for the small icon
   - `idle`: An icon to show when you're idle
   - Site-specific icons (optional): `youtube`, `google`, `github`, etc.

### 3. Set up the Bridge Application

1. Open the `bridge` folder in this repository
2. Edit `index.js` and replace the `CLIENT_ID` with your Discord Application ID
3. Install dependencies by running:
   ```
   npm install
   ```
4. Run the bridge application:
   ```
   npm start
   ```
   or use the included `start.bat` file
5. After you get your Chrome extension ID, edit the native messaging manifests:
   * The bridge automatically creates manifest files at:  
     `%LOCALAPPDATA%\Google\Chrome\User Data\NativeMessagingHosts\com.discord.rich_presence_bridge.json`
     `%LOCALAPPDATA%\Microsoft\Edge\User Data\NativeMessagingHosts\com.discord.rich_presence_bridge.json`
     `%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\NativeMessagingHosts\com.discord.rich_presence_bridge.json`
   * Replace `<EXTENSION_ID>` with your actual extension ID in each file

## Usage

1. Make sure the bridge application is running
2. Browse websites normally
3. The extension will automatically update your Discord status with the current website
4. Click the extension icon to access settings:
   - **General**: Enable/disable Rich Presence, show/hide page titles
   - **Privacy**: Add websites to blacklist (will not be shown in Discord)
   - **Advanced**: Create custom templates for your Discord status
   - **Stats**: View your browsing statistics and session times

### Customizing Your Status

You can create custom status templates using these variables:
- `{activity}`: The activity verb (e.g., "Browsing", "Watching")
- `{name}`: The friendly site name (e.g., "YouTube")
- `{domain}`: The full domain (e.g., "youtube.com")
- `{title}`: The page title

Example template: `{activity} {name} | {title}`

## Privacy

This extension processes all data locally on your machine and does not collect or store your browsing data. The only data sent to Discord is the domain name, favicon, and (optionally) the page title of websites you visit.

You can blacklist sensitive domains to prevent them from appearing in your Discord status.

## Troubleshooting

- **Discord status not updating?**  
  Make sure the bridge application is running and properly connected.
  The extension now has automatic reconnection logic if Discord connection is lost.
  
- **"Bridge app not running" error?**  
  Verify that you have properly set up the native messaging manifests with your correct extension ID.
  
- **Discord shows "Application not responding"?**  
  Ensure you've entered the correct Client ID and that your Discord application is properly configured.

- **Works in Chrome but not in other browsers?**  
  Make sure you've set up the native messaging manifests for each browser.

## License

MIT 