const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');

let electronApp;
try {
  electronApp = require('electron').app;
} catch (e) {
  console.log('Running outside Electron context');
}

// Helper to get userData path
function getUserDataPath() {
  if (electronApp) {
    return electronApp.getPath('userData');
  }
  return path.join(__dirname, '../../');
}

// GET /api/update/check
router.get('/check', async (req, res) => {
  try {
    const currentVersion = req.query.version || '1.0.2';
    console.log(`Checking updates for current version: ${currentVersion}`);

    const response = await fetch('https://api.github.com/repos/Hammad55553/Zaiqa-Restaurant/releases/latest', {
      headers: {
        'User-Agent': 'Zaiqah-POS-Updater'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.json({ updateAvailable: false, message: 'No releases found on GitHub.' });
      }
      throw new Error(`GitHub API returned status ${response.status}`);
    }

    const release = await response.json();
    const latestVersion = release.tag_name.replace(/^v/, '');
    
    // Find the dist.zip asset
    const zipAsset = release.assets.find(asset => asset.name === 'dist.zip');

    if (!zipAsset) {
      return res.json({
        updateAvailable: false,
        message: 'Latest release does not contain dist.zip asset.'
      });
    }

    // Compare versions (simple comparison or semver)
    const updateAvailable = latestVersion !== currentVersion;

    res.json({
      updateAvailable,
      latestVersion,
      currentVersion,
      downloadUrl: zipAsset.browser_download_url,
      releaseNotes: release.body || '',
      publishedAt: release.published_at
    });
  } catch (error) {
    console.error('Update check failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/update/download
router.post('/download', async (req, res) => {
  try {
    const { downloadUrl } = req.body;
    if (!downloadUrl) {
      return res.status(400).json({ error: 'Download URL is required' });
    }

    const userDataPath = getUserDataPath();
    const updatesDir = path.join(userDataPath, 'updates');
    
    // Ensure updates folder exists
    if (!fs.existsSync(updatesDir)) {
      fs.mkdirSync(updatesDir, { recursive: true });
    }

    const tempZipPath = path.join(updatesDir, 'temp_update.zip');
    console.log(`Downloading update from ${downloadUrl} to ${tempZipPath}...`);

    // Download the ZIP file
    const response = await fetch(downloadUrl, {
      headers: { 'User-Agent': 'Zaiqah-POS-Updater' }
    });

    if (!response.ok) {
      throw new Error(`Failed to download update ZIP: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(tempZipPath, Buffer.from(arrayBuffer));
    console.log('Download complete. Extracting zip...');

    // Extract the ZIP file
    const zip = new AdmZip(tempZipPath);
    
    // Extract everything to updates directory
    zip.extractAllTo(updatesDir, true);
    console.log('Extraction complete.');

    // Clean up temporary zip
    fs.unlinkSync(tempZipPath);

    res.json({ success: true, message: 'Update downloaded and extracted successfully.' });
  } catch (error) {
    console.error('Update download/extract failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/update/restart
router.post('/restart', (req, res) => {
  if (electronApp) {
    res.json({ success: true, message: 'Relaunching Electron app...' });
    setTimeout(() => {
      electronApp.relaunch();
      electronApp.exit(0);
    }, 1000);
  } else {
    res.status(400).json({ error: 'Not running inside Electron, cannot restart' });
  }
});

module.exports = router;
