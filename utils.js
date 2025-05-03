// Domain-to-friendly-name mapping
const domainMap = {
  'youtube.com': 'YouTube',
  'www.youtube.com': 'YouTube',
  'github.com': 'GitHub',
  'www.github.com': 'GitHub',
  'mail.google.com': 'Gmail',
  'drive.google.com': 'Google Drive',
  'docs.google.com': 'Google Docs',
  'sheets.google.com': 'Google Sheets',
  'slides.google.com': 'Google Slides',
  'chat.openai.com': 'ChatGPT',
  'google.com': 'Google',
  'www.google.com': 'Google',
  'twitter.com': 'Twitter',
  'x.com': 'Twitter', 
  'facebook.com': 'Facebook',
  'www.facebook.com': 'Facebook',
  'instagram.com': 'Instagram',
  'www.instagram.com': 'Instagram',
  'reddit.com': 'Reddit',
  'www.reddit.com': 'Reddit',
  'netflix.com': 'Netflix',
  'www.netflix.com': 'Netflix',
  'amazon.com': 'Amazon',
  'www.amazon.com': 'Amazon',
  'twitch.tv': 'Twitch',
  'www.twitch.tv': 'Twitch',
  'linkedin.com': 'LinkedIn',
  'www.linkedin.com': 'LinkedIn',
  'stackoverflow.com': 'Stack Overflow',
  'discord.com': 'Discord',
  'www.discord.com': 'Discord',
  'developer.mozilla.org': 'MDN Docs',
  'wikipedia.org': 'Wikipedia',
  'en.wikipedia.org': 'Wikipedia',
  // Add more domains as needed
};

// Map domain to friendly name
function getFriendlyName(domain) {
  // Check direct match
  if (domainMap[domain]) {
    return domainMap[domain];
  }
  
  // Check for subdomains
  for (const [key, value] of Object.entries(domainMap)) {
    if (domain.endsWith(`.${key}`)) {
      return value;
    }
  }
  
  // Default: capitalize first letter of domain without TLD
  const parts = domain.split('.');
  if (parts.length >= 2) {
    const name = parts[parts.length - 2]; // Get the part before the TLD
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  
  // Fallback: just capitalize first letter
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

// Clean page title by removing common suffixes
function cleanTitle(title, domain) {
  if (!title) return '';
  
  // Common suffixes to remove based on domain
  const suffixMap = {
    'youtube.com': [' - YouTube'],
    'www.youtube.com': [' - YouTube'],
    'github.com': [' · GitHub', ' - GitHub'],
    'stackoverflow.com': [' - Stack Overflow'],
    'developer.mozilla.org': [' | MDN', ' - MDN Web Docs'],
    'discord.com': [' | Discord'],
    'reddit.com': [' : r/', ' : u/', ' - Reddit'],
    'www.reddit.com': [' : r/', ' : u/', ' - Reddit'],
    // Add more domain-specific patterns
  };
  
  let cleanedTitle = title;
  
  // If we have specific suffixes for this domain, remove them
  if (suffixMap[domain]) {
    for (const suffix of suffixMap[domain]) {
      if (cleanedTitle.endsWith(suffix)) {
        cleanedTitle = cleanedTitle.slice(0, -suffix.length);
        break;
      }
    }
  }
  
  // Generic cleaning for all domains
  // Remove common suffixes like " - Google Chrome"
  cleanedTitle = cleanedTitle.replace(/ - Google Chrome$/, '');
  cleanedTitle = cleanedTitle.replace(/ - Chrome Web Store$/, '');
  
  return cleanedTitle;
}

// Format a title suitable for Discord Rich Presence state
function formatStateText(title, url) {
  if (!title) return '';
  
  // Extract domain from URL
  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch (e) {
    return title;
  }
  
  // Clean the title
  const cleanedTitle = cleanTitle(title, domain);
  
  // Truncate if too long (Discord has a 128 character limit)
  if (cleanedTitle.length > 120) {
    return cleanedTitle.substring(0, 117) + '...';
  }
  
  return cleanedTitle;
}

// Format activity message based on domain
function formatActivityMessage(domain, friendlyName) {
  // Custom messages for specific domains
  const activityMap = {
    'youtube.com': 'Watching videos on',
    'www.youtube.com': 'Watching videos on',
    'netflix.com': 'Streaming on',
    'www.netflix.com': 'Streaming on',
    'twitch.tv': 'Watching streams on',
    'www.twitch.tv': 'Watching streams on',
    'github.com': 'Working on code at',
    'www.github.com': 'Working on code at',
    'stackoverflow.com': 'Seeking answers on',
    'developer.mozilla.org': 'Reading docs on',
    'mail.google.com': 'Checking emails on',
    'docs.google.com': 'Working on documents at',
    'amazon.com': 'Shopping on',
    'www.amazon.com': 'Shopping on',
    // Add more custom activities
  };
  
  if (activityMap[domain]) {
    return `${activityMap[domain]} ${friendlyName}`;
  }
  
  // Default message
  return `Browsing ${friendlyName}`;
}

// Get favicon cache for storing favicons
const faviconCache = new Map();

// Get favicon URL for a domain
async function getFaviconUrl(domain, pageUrl) {
  // Check if favicon is in cache
  if (faviconCache.has(domain)) {
    return faviconCache.get(domain);
  }
  
  // Try to get favicon from page first (this will be attempted in background.js)
  // Default fallback to Google favicon service
  const fallbackUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
  
  // Store in cache
  faviconCache.set(domain, fallbackUrl);
  
  return fallbackUrl;
}

// Cache favicon from page
function cacheFaviconFromPage(domain, faviconUrl) {
  if (domain && faviconUrl) {
    faviconCache.set(domain, faviconUrl);
  }
}

// Get a mapping of domains to Discord asset names
function getAssetMap() {
  return {
    'youtube.com': 'youtube',
    'www.youtube.com': 'youtube',
    'github.com': 'github',
    'www.github.com': 'github',
    'google.com': 'google',
    'www.google.com': 'google',
    'twitter.com': 'twitter',
    'x.com': 'twitter',
    'facebook.com': 'facebook',
    'www.facebook.com': 'facebook',
    'reddit.com': 'reddit',
    'www.reddit.com': 'reddit',
    'netflix.com': 'netflix',
    'www.netflix.com': 'netflix',
    'twitch.tv': 'twitch',
    'www.twitch.tv': 'twitch',
    'discord.com': 'discord',
    'www.discord.com': 'discord',
    'stackoverflow.com': 'stackoverflow',
    'developer.mozilla.org': 'mdn',
    // Add more domains as needed
  };
}

// Check if domain is blacklisted
function isDomainBlacklisted(domain, blacklist) {
  if (!blacklist || !Array.isArray(blacklist) || blacklist.length === 0) {
    return false;
  }
  
  return blacklist.some(item => domain === item || domain.endsWith(`.${item}`));
}

// Detect idle state
let lastActivity = Date.now();
let isIdle = false;
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function updateActivity() {
  lastActivity = Date.now();
  isIdle = false;
}

function checkIdle() {
  if (Date.now() - lastActivity > IDLE_TIMEOUT && !isIdle) {
    isIdle = true;
    return true;
  }
  return false;
}

// Export functions
window.siteUtils = {
  getFriendlyName,
  cleanTitle,
  formatStateText,
  formatActivityMessage,
  getFaviconUrl,
  cacheFaviconFromPage,
  getAssetMap,
  isDomainBlacklisted,
  updateActivity,
  checkIdle,
  faviconCache
}; 