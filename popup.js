document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const enableToggle = document.getElementById('enableToggle');
  const showTitleToggle = document.getElementById('showTitleToggle');
  const statusText = document.getElementById('statusText');
  const darkModeToggle = document.getElementById('darkModeToggle');
  const blacklistInput = document.getElementById('blacklistInput');
  const addBlacklistButton = document.getElementById('addBlacklistButton');
  const blacklistContainer = document.getElementById('blacklistContainer');
  const useCustomTemplateToggle = document.getElementById('useCustomTemplateToggle');
  const customTemplateInput = document.getElementById('customTemplateInput');
  const sessionTimeElement = document.getElementById('sessionTime');
  const domainTimeElement = document.getElementById('domainTime');
  const domainStatsElement = document.getElementById('domainStats');
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  let port = null;
  let isConnected = false;
  let checkConnectionInterval = null;
  let domainTimes = {};
  let sessionStartTime = Date.now();
  let statsUpdateInterval = null;
  
  // Load saved settings
  chrome.storage.sync.get([
    'enabled', 
    'showTitle', 
    'blacklist', 
    'darkMode', 
    'customTemplate', 
    'useCustomTemplate'
  ], function(data) {
    // General settings
    enableToggle.checked = data.enabled !== false;
    showTitleToggle.checked = data.showTitle !== false;
    
    // Dark mode
    darkModeToggle.checked = data.darkMode === true;
    if (data.darkMode) {
      document.body.classList.add('dark-mode');
    }
    
    // Advanced settings
    useCustomTemplateToggle.checked = data.useCustomTemplate === true;
    customTemplateInput.value = data.customTemplate || '{activity} {name}';
    customTemplateInput.disabled = !data.useCustomTemplate;
    
    // Blacklist
    renderBlacklist(data.blacklist || []);
    
    // Start connection check
    updateStatus();
    startStats();
  });
  
  // Save settings when toggled
  enableToggle.addEventListener('change', function() {
    chrome.storage.sync.set({ enabled: enableToggle.checked });
    updateStatus();
  });
  
  showTitleToggle.addEventListener('change', function() {
    chrome.storage.sync.set({ showTitle: showTitleToggle.checked });
  });
  
  darkModeToggle.addEventListener('change', function() {
    const darkMode = darkModeToggle.checked;
    chrome.storage.sync.set({ darkMode: darkMode });
    
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  });
  
  useCustomTemplateToggle.addEventListener('change', function() {
    const useCustomTemplate = useCustomTemplateToggle.checked;
    chrome.storage.sync.set({ useCustomTemplate: useCustomTemplate });
    customTemplateInput.disabled = !useCustomTemplate;
  });
  
  customTemplateInput.addEventListener('input', function() {
    chrome.storage.sync.set({ customTemplate: customTemplateInput.value });
  });
  
  // Add domain to blacklist
  addBlacklistButton.addEventListener('click', function() {
    const domain = blacklistInput.value.trim();
    
    if (domain) {
      chrome.storage.sync.get('blacklist', function(data) {
        const blacklist = data.blacklist || [];
        
        // Check if domain is already in blacklist
        if (!blacklist.includes(domain)) {
          blacklist.push(domain);
          chrome.storage.sync.set({ blacklist: blacklist });
          renderBlacklist(blacklist);
          blacklistInput.value = '';
        }
      });
    }
  });
  
  // Remove domain from blacklist
  blacklistContainer.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON') {
      const domain = e.target.dataset.domain;
      
      chrome.storage.sync.get('blacklist', function(data) {
        const blacklist = data.blacklist || [];
        const index = blacklist.indexOf(domain);
        
        if (index !== -1) {
          blacklist.splice(index, 1);
          chrome.storage.sync.set({ blacklist: blacklist });
          renderBlacklist(blacklist);
        }
      });
    }
  });
  
  // Tab navigation
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      this.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Render blacklist in UI
  function renderBlacklist(blacklist) {
    blacklistContainer.innerHTML = '';
    
    if (!blacklist || blacklist.length === 0) {
      blacklistContainer.innerHTML = '<div class="small-text" style="text-align: center; padding: 10px;">No domains blacklisted.</div>';
      return;
    }
    
    blacklist.forEach(function(domain) {
      const item = document.createElement('div');
      item.className = 'blacklist-item';
      
      const domainText = document.createElement('span');
      domainText.textContent = domain;
      
      const removeButton = document.createElement('button');
      removeButton.textContent = 'Remove';
      removeButton.dataset.domain = domain;
      
      item.appendChild(domainText);
      item.appendChild(removeButton);
      blacklistContainer.appendChild(item);
    });
  }
  
  // Connect to native messaging host
  function connectToNativeHost() {
    try {
      port = chrome.runtime.connectNative('com.discord.rich_presence_bridge');
      
      port.onMessage.addListener(function(message) {
        if (message && message.connected !== undefined) {
          isConnected = message.connected;
          
          if (isConnected) {
            statusText.textContent = 'Connected to Discord';
            statusText.className = 'status success';
          } else {
            statusText.textContent = 'Bridge app is running, Discord disconnected';
            statusText.className = 'status warning';
          }
        }
        
        // Update stats if we get stats data
        if (message && message.stats) {
          updateStatsDisplay(message.stats);
        }
      });
      
      port.onDisconnect.addListener(function() {
        isConnected = false;
        port = null;
        statusText.textContent = 'Bridge app not running';
        statusText.className = 'status error';
      });
      
      // Request status update and stats
      port.postMessage({ action: 'checkStatus' });
      port.postMessage({ action: 'getStats' });
      
      return true;
    } catch (e) {
      console.error('Failed to connect:', e);
      isConnected = false;
      port = null;
      statusText.textContent = 'Bridge app not running';
      statusText.className = 'status error';
      
      return false;
    }
  }
  
  // Update connection status
  function updateStatus() {
    if (enableToggle.checked) {
      if (!port) {
        connectToNativeHost();
      } else {
        port.postMessage({ action: 'checkStatus' });
      }
      
      // Set up periodic check if not already running
      if (!checkConnectionInterval) {
        checkConnectionInterval = setInterval(function() {
          if (!port) {
            connectToNativeHost();
          } else {
            port.postMessage({ action: 'checkStatus' });
          }
        }, 5000);
      }
    } else {
      statusText.textContent = 'Rich Presence is disabled';
      statusText.className = 'status';
      
      // Clear interval if exists
      if (checkConnectionInterval) {
        clearInterval(checkConnectionInterval);
        checkConnectionInterval = null;
      }
    }
  }
  
  // Format time for display (HH:MM:SS)
  function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    return [h, m, s]
      .map(v => v < 10 ? '0' + v : v)
      .join(':');
  }
  
  // Start updating stats
  function startStats() {
    // Request stats now
    if (port) {
      port.postMessage({ action: 'getStats' });
    }
    
    // Update session time immediately
    updateSessionTime();
    
    // Set up interval to update session time every second
    statsUpdateInterval = setInterval(function() {
      updateSessionTime();
      
      // Request updated stats every 5 seconds
      if (port && document.getElementById('stats').classList.contains('active')) {
        port.postMessage({ action: 'getStats' });
      }
    }, 1000);
  }
  
  // Update the session time display
  function updateSessionTime() {
    const sessionTime = Date.now() - sessionStartTime;
    sessionTimeElement.textContent = formatTime(sessionTime);
  }
  
  // Update the stats display
  function updateStatsDisplay(stats) {
    // Update domain time
    if (stats.currentDomainTime) {
      domainTimeElement.textContent = formatTime(stats.currentDomainTime);
    }
    
    // Update domain stats
    if (stats.domainTimes && Object.keys(stats.domainTimes).length > 0) {
      domainStatsElement.innerHTML = '';
      
      // Sort domains by time spent (descending)
      const domains = Object.entries(stats.domainTimes).sort((a, b) => b[1] - a[1]);
      
      // Display top 5 domains
      domains.slice(0, 5).forEach(([domain, time]) => {
        const item = document.createElement('div');
        item.className = 'domain-item';
        
        const domainText = document.createElement('div');
        
        // Try to get a friendly name
        let friendlyName = domain;
        if (window.siteUtils && window.siteUtils.getFriendlyName) {
          friendlyName = window.siteUtils.getFriendlyName(domain);
        }
        
        domainText.textContent = friendlyName;
        
        const timeText = document.createElement('div');
        timeText.textContent = formatTime(time);
        
        item.appendChild(domainText);
        item.appendChild(timeText);
        domainStatsElement.appendChild(item);
      });
    } else {
      domainStatsElement.innerHTML = '<div class="small-text" style="text-align: center; padding: 10px;">No domain statistics available yet.</div>';
    }
  }
}); 