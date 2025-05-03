// Variables to track current tab info
let currentTab = null;
let startTimestamp = null;
const port = chrome.runtime.connectNative('com.discord.rich_presence_bridge');

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Discord Rich Presence extension installed');
  // Set default settings
  chrome.storage.sync.set({
    enabled: true,
    showTitle: true
  });
});

// Update the Discord Rich Presence when the active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (!await isExtensionEnabled()) return;
  updatePresence(activeInfo.tabId);
});

// Update the Discord Rich Presence when the URL of a tab changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!await isExtensionEnabled()) return;
  if (changeInfo.status === 'complete' && tab.active) {
    updatePresence(tabId);
  }
});

// Check if extension is enabled in storage
async function isExtensionEnabled() {
  const data = await chrome.storage.sync.get('enabled');
  return data.enabled !== false;
}

// Get tab info and send to the native messaging host
async function updatePresence(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    
    // Skip extension pages and internal browser pages
    if (!tab.url || tab.url.startsWith('chrome:') || tab.url.startsWith('chrome-extension:')) {
      return;
    }
    
    // Get domain from the URL
    const url = new URL(tab.url);
    const domain = url.hostname;
    
    // If we've moved to a new site, reset the timestamp
    if (!currentTab || getDomain(currentTab.url) !== domain) {
      startTimestamp = Date.now();
      currentTab = tab;
    }
    
    // Get settings
    const settings = await chrome.storage.sync.get(['showTitle']);
    
    // Prepare data to send to the native messaging host
    const data = {
      domain: domain,
      title: settings.showTitle ? tab.title : '',
      url: tab.url,
      faviconUrl: `https://www.google.com/s2/favicons?sz=64&domain=${domain}`,
      startTimestamp: startTimestamp
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

// Handle communication with the native messaging host
port.onMessage.addListener((message) => {
  console.log('Received message from native messaging host:', message);
});

port.onDisconnect.addListener(() => {
  console.log('Disconnected from native messaging host');
}); 