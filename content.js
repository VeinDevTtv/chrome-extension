// Content script to extract information from the current page

// Function to get favicon URL from the page
function getFaviconFromPage() {
  // Try to find icon links in the document
  const iconSelectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
    'link[rel*="icon"]'
  ];
  
  for (const selector of iconSelectors) {
    const icon = document.querySelector(selector);
    if (icon && icon.href) {
      return icon.href;
    }
  }
  
  // If no specific icon found, try the default "/favicon.ico"
  return null;
}

// Send favicon URL to the background script
function sendFaviconToBackground() {
  const favicon = getFaviconFromPage();
  if (favicon) {
    chrome.runtime.sendMessage({
      action: 'setFavicon',
      faviconUrl: favicon,
      url: window.location.href,
      domain: window.location.hostname
    });
  }
}

// Listen for user activity to track idle state
function setupActivityListeners() {
  const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  
  activityEvents.forEach(eventType => {
    window.addEventListener(eventType, () => {
      chrome.runtime.sendMessage({ action: 'userActivity' });
    }, { passive: true });
  });
}

// Initialize content script
function initialize() {
  // Send favicon immediately
  sendFaviconToBackground();
  
  // Setup activity tracking
  setupActivityListeners();
  
  // Also setup a mutation observer to detect changes to the head
  // (for single-page apps that might update the favicon)
  const observer = new MutationObserver(() => {
    sendFaviconToBackground();
  });
  
  // Start observing the document head for changes to link elements
  if (document.head) {
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
      characterData: false
    });
  }
}

// Start the content script
initialize(); 