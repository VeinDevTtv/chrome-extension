document.addEventListener('DOMContentLoaded', function() {
  const enableToggle = document.getElementById('enableToggle');
  const showTitleToggle = document.getElementById('showTitleToggle');
  const statusText = document.getElementById('statusText');
  
  // Load saved settings
  chrome.storage.sync.get(['enabled', 'showTitle'], function(data) {
    enableToggle.checked = data.enabled !== false;
    showTitleToggle.checked = data.showTitle !== false;
    
    updateStatus();
  });
  
  // Save settings when toggled
  enableToggle.addEventListener('change', function() {
    chrome.storage.sync.set({ enabled: enableToggle.checked });
    updateStatus();
  });
  
  showTitleToggle.addEventListener('change', function() {
    chrome.storage.sync.set({ showTitle: showTitleToggle.checked });
  });
  
  function updateStatus() {
    if (enableToggle.checked) {
      try {
        const port = chrome.runtime.connectNative('com.discord.rich_presence_bridge');
        
        port.onMessage.addListener(function(message) {
          if (message && message.connected) {
            statusText.textContent = 'Connected to Discord';
            statusText.style.backgroundColor = '#e8fff3';
            statusText.style.color = '#2e7d32';
          } else {
            statusText.textContent = 'Bridge app is running, Discord disconnected';
            statusText.style.backgroundColor = '#fff8e1';
            statusText.style.color = '#ff8f00';
          }
        });
        
        port.onDisconnect.addListener(function() {
          statusText.textContent = 'Bridge app not running';
          statusText.style.backgroundColor = '#ffebee';
          statusText.style.color = '#c62828';
        });
        
        port.postMessage({ action: 'checkStatus' });
        
      } catch (e) {
        statusText.textContent = 'Bridge app not running';
        statusText.style.backgroundColor = '#ffebee';
        statusText.style.color = '#c62828';
      }
    } else {
      statusText.textContent = 'Rich Presence is disabled';
      statusText.style.backgroundColor = '#f0f0f0';
      statusText.style.color = '#888';
    }
  }
}); 