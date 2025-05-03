const fs = require('fs');
const path = require('path');

// Create manifest for Brave
const manifestPath = path.join(process.env.LOCALAPPDATA, 'BraveSoftware\\Brave-Browser\\User Data\\NativeMessagingHosts\\com.discord.rich_presence_bridge.json');
const manifest = {
  name: 'com.discord.rich_presence_bridge',
  description: 'Bridge between Chrome extension and Discord Rich Presence',
  path: process.execPath,
  type: 'stdio',
  allowed_origins: [
    'chrome-extension://<EXTENSION_ID>/',
    'brave-extension://<EXTENSION_ID>/'
  ]
};

// Create manifest directory if it doesn't exist
const dir = path.dirname(manifestPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Write manifest file
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('Native messaging manifest for Brave created at:');
console.log(manifestPath);
console.log('\nPlease replace <EXTENSION_ID> with your actual extension ID in the manifest file.'); 