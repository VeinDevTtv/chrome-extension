const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter your extension ID: ', (extensionId) => {
  if (!extensionId || extensionId.trim() === '') {
    console.log('Extension ID cannot be empty. Please run the script again with a valid ID.');
    rl.close();
    return;
  }

  extensionId = extensionId.trim();
  
  // Update manifests for Chrome, Edge, and Brave
  updateManifest('Google\\Chrome\\User Data\\NativeMessagingHosts\\com.discord.rich_presence_bridge.json', extensionId);
  updateManifest('Microsoft\\Edge\\User Data\\NativeMessagingHosts\\com.discord.rich_presence_bridge.json', extensionId);
  updateManifest('BraveSoftware\\Brave-Browser\\User Data\\NativeMessagingHosts\\com.discord.rich_presence_bridge.json', extensionId);

  console.log('\nAll manifests have been updated with your extension ID.');
  console.log('Please restart the bridge and your browser.');
  
  rl.close();
});

function updateManifest(relativePath, extensionId) {
  const manifestPath = path.join(process.env.LOCALAPPDATA, relativePath);
  
  try {
    if (fs.existsSync(manifestPath)) {
      let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      // Update allowed origins
      if (manifest.allowed_origins) {
        manifest.allowed_origins = manifest.allowed_origins.map(origin => {
          return origin.replace('<EXTENSION_ID>', extensionId)
                       .replace('YOUR_EXTENSION_ID_HERE', extensionId);
        });
      }
      
      // Write updated manifest
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`Updated manifest at: ${manifestPath}`);
    } else {
      console.log(`Manifest file not found at: ${manifestPath}`);
    }
  } catch (error) {
    console.error(`Error updating manifest at ${manifestPath}:`, error.message);
  }
} 