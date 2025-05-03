const DiscordRPC = require('discord-rpc');
const fs = require('fs');
const path = require('path');

// Discord Application Client ID - you need to create a Discord application at
// https://discord.com/developers/applications and use its client ID here
const CLIENT_ID = '123456789012345678'; // REPLACE WITH YOUR ACTUAL CLIENT ID

// Initialize RPC
const rpc = new DiscordRPC.Client({ transport: 'ipc' });
let connected = false;
let lastPresence = null;
let domainTimes = new Map();
let currentDomain = null;
let currentDomainStartTime = null;
let lastActivity = Date.now();
let isIdle = false;
let idleTimeout = 5 * 60 * 1000; // 5 minutes
let reconnectAttempt = 0;
let reconnectTimeout = null;

// Register Native Messaging protocol handlers
process.stdin.on('readable', () => {
  let input = [];
  let chunk;
  
  while ((chunk = process.stdin.read()) !== null) {
    input.push(chunk);
  }
  
  if (input.length > 0) {
    const buffer = Buffer.concat(input);
    const msgLen = buffer.readUInt32LE(0);
    const dataBuffer = buffer.slice(4, msgLen + 4);
    
    try {
      const json = JSON.parse(dataBuffer.toString());
      handleMessage(json);
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  }
});

// Handle messages from the Chrome extension
function handleMessage(message) {
  // Update last activity time
  lastActivity = Date.now();
  
  if (message.action === 'checkStatus') {
    sendMessage({ connected });
    return;
  }
  
  if (message.action === 'getStats') {
    sendStats();
    return;
  }
  
  if (message.action === 'setIdle') {
    isIdle = message.idle === true;
    if (isIdle) {
      setIdleStatus(message.lastSite);
    }
    return;
  }
  
  // Update Discord Rich Presence with the website info
  if (message.action === 'updatePresence' && message.domain) {
    // Track time spent on domains
    if (currentDomain && currentDomain !== message.domain) {
      const timeSpent = Date.now() - currentDomainStartTime;
      const totalTime = (domainTimes.get(currentDomain) || 0) + timeSpent;
      domainTimes.set(currentDomain, totalTime);
    }
    
    // Update current domain info
    currentDomain = message.domain;
    currentDomainStartTime = message.startTimestamp || Date.now();
    
    // Reset idle state
    isIdle = false;
    
    // Update the Rich Presence
    updatePresence(message);
  }
}

// Send message back to the Chrome extension
function sendMessage(message) {
  const json = JSON.stringify(message);
  const buffer = Buffer.from(json);
  
  const header = Buffer.alloc(4);
  header.writeUInt32LE(buffer.length, 0);
  
  process.stdout.write(Buffer.concat([header, buffer]));
}

// Send stats to the extension
function sendStats() {
  // Calculate time spent on current domain
  let currentDomainTime = 0;
  if (currentDomain && currentDomainStartTime) {
    currentDomainTime = Date.now() - currentDomainStartTime;
  }
  
  // Convert domain times to a regular object for serialization
  const domainTimesObj = {};
  domainTimes.forEach((value, key) => {
    domainTimesObj[key] = value;
  });
  
  // Add current domain time
  if (currentDomain) {
    domainTimesObj[currentDomain] = (domainTimesObj[currentDomain] || 0) + currentDomainTime;
  }
  
  sendMessage({
    stats: {
      currentDomainTime,
      domainTimes: domainTimesObj
    }
  });
}

// Set an idle status in Discord
function setIdleStatus(lastSite) {
  if (!connected) return;
  
  const presenceData = {
    details: 'Idle',
    state: lastSite ? `Last visited: ${lastSite}` : '',
    startTimestamp: Date.now() - (60 * 1000), // Show as idle for 1 minute
    largeImageKey: 'idle',
    largeImageText: 'Idle',
    smallImageKey: 'chrome',
    smallImageText: 'Chrome Browser',
    instance: false
  };
  
  // Only update if something changed
  if (JSON.stringify(presenceData) !== JSON.stringify(lastPresence)) {
    rpc.setActivity(presenceData)
      .then(() => {
        lastPresence = presenceData;
        console.log('Updated presence: Idle');
      })
      .catch(error => {
        console.error('Error updating presence:', error);
      });
  }
}

// Update Discord Rich Presence
function updatePresence(data) {
  if (!connected) {
    reconnectToDiscord();
    return;
  }
  
  const presenceData = {
    details: data.details || `Browsing ${data.domain}`,
    state: data.state || '',
    startTimestamp: data.startTimestamp || Date.now(),
    largeImageKey: data.largeImageKey || 'web_icon',
    largeImageText: data.largeImageText || data.domain,
    smallImageKey: data.smallImageKey || 'chrome',
    smallImageText: data.smallImageText || 'Chrome Browser',
    instance: false
  };
  
  // Only update if something changed
  if (JSON.stringify(presenceData) !== JSON.stringify(lastPresence)) {
    rpc.setActivity(presenceData)
      .then(() => {
        lastPresence = presenceData;
        console.log(`Updated presence: ${data.details}`);
      })
      .catch(error => {
        console.error('Error updating presence:', error);
        if (error.message.includes('connection closed') || error.message.includes('not connected')) {
          reconnectToDiscord();
        }
      });
  }
}

// Reconnect to Discord with exponential backoff
function reconnectToDiscord() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  
  // Exponential backoff (max 2 minutes)
  const backoff = Math.min(1000 * Math.pow(2, reconnectAttempt), 120000);
  console.log(`Attempting to reconnect to Discord in ${backoff}ms (attempt ${reconnectAttempt + 1})`);
  
  reconnectTimeout = setTimeout(() => {
    reconnectAttempt++;
    
    rpc.login({ clientId: CLIENT_ID })
      .then(() => {
        console.log('Reconnected to Discord');
        connected = true;
        reconnectAttempt = 0;
        sendMessage({ connected: true });
      })
      .catch(error => {
        console.error('Failed to reconnect to Discord:', error);
        reconnectToDiscord();
      });
  }, backoff);
}

// Register Native Messaging manifest in the Chrome extension directory
function registerNativeMessaging() {
  const manifestPath = path.join(
    process.env.LOCALAPPDATA,
    'Google\\Chrome\\User Data\\NativeMessagingHosts\\com.discord.rich_presence_bridge.json'
  );
  
  // Also register for other Chromium browsers
  const edgeManifestPath = path.join(
    process.env.LOCALAPPDATA,
    'Microsoft\\Edge\\User Data\\NativeMessagingHosts\\com.discord.rich_presence_bridge.json'
  );
  
  const braveManifestPath = path.join(
    process.env.LOCALAPPDATA,
    'BraveSoftware\\Brave-Browser\\User Data\\NativeMessagingHosts\\com.discord.rich_presence_bridge.json'
  );
  
  const manifest = {
    name: 'com.discord.rich_presence_bridge',
    description: 'Bridge between Chrome extension and Discord Rich Presence',
    path: process.execPath,
    type: 'stdio',
    allowed_origins: [
      'chrome-extension://<EXTENSION_ID>/',
      'edge-extension://<EXTENSION_ID>/',
      'brave-extension://<EXTENSION_ID>/'
    ]
  };
  
  try {
    // Create Chrome manifest
    const chromeDir = path.dirname(manifestPath);
    if (!fs.existsSync(chromeDir)) {
      fs.mkdirSync(chromeDir, { recursive: true });
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('Native messaging manifest registered for Chrome at:', manifestPath);
    
    // Create Edge manifest
    try {
      const edgeDir = path.dirname(edgeManifestPath);
      if (!fs.existsSync(edgeDir)) {
        fs.mkdirSync(edgeDir, { recursive: true });
      }
      fs.writeFileSync(edgeManifestPath, JSON.stringify(manifest, null, 2));
      console.log('Native messaging manifest registered for Edge at:', edgeManifestPath);
    } catch (e) {
      console.log('Could not register for Edge:', e.message);
    }
    
    // Create Brave manifest
    try {
      const braveDir = path.dirname(braveManifestPath);
      if (!fs.existsSync(braveDir)) {
        fs.mkdirSync(braveDir, { recursive: true });
      }
      fs.writeFileSync(braveManifestPath, JSON.stringify(manifest, null, 2));
      console.log('Native messaging manifest registered for Brave at:', braveManifestPath);
    } catch (e) {
      console.log('Could not register for Brave:', e.message);
    }
    
    console.log('NOTE: You need to replace <EXTENSION_ID> in the manifests with your actual extension ID');
  } catch (e) {
    console.error('Failed to register native messaging manifest:', e);
  }
}

// Check if we're idle and update the status
function checkIdle() {
  if (!isIdle && Date.now() - lastActivity > idleTimeout) {
    isIdle = true;
    setIdleStatus(currentDomain);
    console.log('Detected idle state');
  }
}

// Run idle check every minute
setInterval(checkIdle, 60000);

// Connect to Discord
rpc.on('ready', () => {
  console.log('Connected to Discord!');
  connected = true;
  
  // Reset reconnect attempts
  reconnectAttempt = 0;
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  // Send initial status update
  sendMessage({ connected: true });
});

// Log in to Discord
rpc.login({ clientId: CLIENT_ID })
  .then(() => {
    console.log('Logged in to Discord');
  })
  .catch(error => {
    console.error('Failed to connect to Discord:', error);
    reconnectToDiscord();
  });

// Handle process exit
process.on('exit', () => {
  if (connected) {
    try {
      rpc.clearActivity();
    } catch (e) {
      // Ignore errors on exit
    }
  }
});

// Handle unexpected errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  
  // Try to reconnect to Discord if appropriate
  if (err.message.includes('Discord') || err.message.includes('connection')) {
    reconnectToDiscord();
  }
});

// Register the native messaging manifest
registerNativeMessaging();

console.log('Discord Rich Presence Bridge started');
console.log('Waiting for Chrome extension messages...'); 