// Load utilities
importScripts('utils.js');

// Variables to track current tab info
let currentTab = null;
let startTimestamp = null;
let port = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let sessionStartTime = Date.now();
let domainTimes = new Map(); // Track time spent on each domain
let isDiscordConnected = false;
let lastUpdateTime = Date.now();

// Connect to the native messaging host
function connectToNativeHost() {
  try {
    port = chrome.runtime.connectNative('com.discord.rich_presence_bridge');
    
    port.onMessage.addListener(handleNativeMessage);
    
    port.onDisconnect.addListener(() => {
      console.log('Disconnected from native messaging host', chrome.runtime.lastError);
      isDiscordConnected = false;
      scheduleReconnect();
    });
    
    // Send a ping to check if we're connected
    port.postMessage({ action: 'checkStatus' });
    
    reconnectAttempts = 0;
  } catch (error) {
    console.error('Failed to connect to native messaging host:', error);
    scheduleReconnect();
  }
}

// Schedule a reconnection attempt
function scheduleReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  
  // Exponential backoff for reconnect (max 2 minutes)
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 120000);
  console.log(`Scheduling reconnect in ${delay}ms`);
  
  reconnectTimer = setTimeout(() => {
    reconnectAttempts++;
    connectToNativeHost();
  }, delay);
}

// Handle messages from the native messaging host
function handleNativeMessage(message) {
  console.log('Received message from native messaging host:', message);
  
  if (message.connected !== undefined) {
    isDiscordConnected = message.connected;
  }
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Discord Rich Presence extension installed');
  // Set default settings
  chrome.storage.sync.set({
    enabled: true,
    showTitle: true,
    blacklist: [],
    darkMode: false,
    customTemplate: "{activity} {name}",
    useCustomTemplate: false
  });
  
  // Connect to native messaging host
  connectToNativeHost();
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'setFavicon' && sender.tab) {
    const domain = message.domain;
    if (domain) {
      siteUtils.cacheFaviconFromPage(domain, message.faviconUrl);
      
      // If this is for the current tab, update the presence
      if (currentTab && currentTab.id === sender.tab.id) {
        updatePresence(sender.tab.id);
      }
    }
  }
  
  if (message.action === 'userActivity') {
    siteUtils.updateActivity();
    
    // Check if we need to update the presence due to coming back from idle
    if (siteUtils.isIdle) {
      updatePresence(currentTab?.id);
    }
  }
});

// Update the Discord Rich Presence when the active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (!await isExtensionEnabled()) return;
  siteUtils.updateActivity(); // User is active
  updatePresence(activeInfo.tabId);
});

// Update the Discord Rich Presence when the URL of a tab changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!await isExtensionEnabled()) return;
  if (changeInfo.status === 'complete' && tab.active) {
    siteUtils.updateActivity(); // User is active
    updatePresence(tabId);
  }
});

// Check if extension is enabled in storage
async function isExtensionEnabled() {
  const data = await chrome.storage.sync.get('enabled');
  return data.enabled !== false;
}

// Track idle state using Chrome's idle API
chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === 'active') {
    siteUtils.updateActivity();
    if (await isExtensionEnabled() && currentTab) {
      updatePresence(currentTab.id);
    }
  } else if (state === 'idle' || state === 'locked') {
    // If idle or locked, update the presence to reflect this
    if (await isExtensionEnabled() && port && isDiscordConnected) {
      port.postMessage({
        action: 'setIdle',
        idle: true,
        lastSite: currentTab ? getDomain(currentTab.url) : null
      });
    }
  }
});

// Check for idle state periodically
setInterval(async () => {
  if (await isExtensionEnabled() && siteUtils.checkIdle()) {
    if (port && isDiscordConnected) {
      port.postMessage({
        action: 'setIdle',
        idle: true,
        lastSite: currentTab ? getDomain(currentTab.url) : null
      });
    }
  }
}, 60000); // Check every minute

// Get tab info and send to the native messaging host
async function updatePresence(tabId) {
  try {
    // Make sure we're connected to the native host
    if (!port) {
      connectToNativeHost();
      return;
    }
    
    const tab = await chrome.tabs.get(tabId);
    
    // Skip extension pages and internal browser pages
    if (!tab.url || tab.url.startsWith('chrome:') || tab.url.startsWith('chrome-extension:')) {
      return;
    }
    
    // Get domain from the URL
    const url = new URL(tab.url);
    const domain = url.hostname;
    
    // Check if domain is blacklisted
    const settings = await chrome.storage.sync.get(['blacklist', 'showTitle', 'customTemplate', 'useCustomTemplate']);
    if (siteUtils.isDomainBlacklisted(domain, settings.blacklist)) {
      console.log(`Domain ${domain} is blacklisted, not updating presence`);
      return;
    }
    
    // If we've moved to a new site, update timing info
    if (!currentTab || getDomain(currentTab.url) !== domain) {
      // Track time spent on previous domain
      if (currentTab) {
        const previousDomain = getDomain(currentTab.url);
        const previousTime = domainTimes.get(previousDomain) || 0;
        const timeSpent = Date.now() - lastUpdateTime;
        domainTimes.set(previousDomain, previousTime + timeSpent);
      }
      
      startTimestamp = Date.now();
      currentTab = tab;
      lastUpdateTime = Date.now();
    }
    
    // Get friendly name of the website
    const friendlyName = siteUtils.getFriendlyName(domain);
    
    // Format the activity message
    const activityMessage = siteUtils.formatActivityMessage(domain, friendlyName);
    
    // Format the state text (usually the page title)
    const stateText = settings.showTitle ? siteUtils.formatStateText(tab.title, tab.url) : '';
    
    // Get asset map for Discord Rich Presence
    const assetMap = siteUtils.getAssetMap();
    
    // Determine which asset to use for the large image
    let largeImageKey = 'web_icon'; // Default
    if (assetMap[domain]) {
      largeImageKey = assetMap[domain];
    }
    
    // Custom template handling
    let details = activityMessage;
    let state = stateText;
    
    if (settings.useCustomTemplate && settings.customTemplate) {
      const template = settings.customTemplate;
      details = template
        .replace('{activity}', activityMessage.split(' ')[0]) // First word of activity
        .replace('{name}', friendlyName)
        .replace('{domain}', domain);
      
      // If the template doesn't use the title, we'll put it in the state
      if (!template.includes('{title}') && stateText) {
        state = stateText;
      } else {
        state = template.includes('{title}') ? template.replace('{title}', stateText) : '';
      }
    }
    
    // Calculate total session time
    const totalSessionTime = Date.now() - sessionStartTime;
    
    // Calculate time on current domain
    const currentDomainTime = Date.now() - startTimestamp;
    
    // Prepare data to send to the native messaging host
    const data = {
      action: 'updatePresence',
      domain: domain,
      url: tab.url,
      details: details,
      state: state,
      startTimestamp: startTimestamp,
      largeImageKey: largeImageKey,
      largeImageText: domain,
      smallImageKey: 'chrome', // Chrome logo
      smallImageText: 'Chrome Browser',
      sessionTime: totalSessionTime,
      domainTime: currentDomainTime
    };
    
    // Send data to the native messaging host
    port.postMessage(data);
  } catch (error) {
    console.error('Error updating presence:', error);
  }
}

// Helper function to extract domain from URL
function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return '';
  }
}

// Connect when the extension starts
connectToNativeHost(); 