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
    const publishedAt = release.updated_at || release.published_at;
    
    // Find the dist.zip asset
    const zipAsset = release.assets.find(asset => asset.name === 'dist.zip');

    if (!zipAsset) {
      return res.json({
        updateAvailable: false,
        message: 'Latest release does not contain dist.zip asset.'
      });
    }

    const userDataPath = getUserDataPath();
    const metaPath = path.join(userDataPath, 'updates/update_meta.json');
    
    let updateAvailable = false;
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        // If the local saved publishedAt is equal to or newer than GitHub's publishedAt, then no update is available
        if (meta.publishedAt && new Date(meta.publishedAt) >= new Date(publishedAt)) {
          updateAvailable = false;
        } else {
          updateAvailable = true;
        }
      } catch (e) {
        updateAvailable = true;
      }
    } else {
      // If metaPath doesn't exist, we compare the GitHub release date with our baseline build date.
      // Baseline is set to June 6, 2026 13:45 UTC.
      const baselineDate = new Date('2026-06-06T13:45:00Z');
      if (new Date(publishedAt) > baselineDate) {
        updateAvailable = true;
      } else {
        updateAvailable = false;
      }
    }

    res.json({
      updateAvailable,
      latestVersion,
      currentVersion,
      downloadUrl: zipAsset.browser_download_url,
      releaseNotes: release.body || '',
      publishedAt: publishedAt
    });
  } catch (error) {
    console.error('Update check failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/update/download
router.post('/download', async (req, res) => {
  try {
    const { downloadUrl, publishedAt, latestVersion } = req.body;
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

    // OVERWRITE DATABASE: If the update contains a pos.db, copy it to the userData path
    const extractedDbPath = path.join(updatesDir, 'server', 'database', 'pos.db'); // Wait, pos.db is usually in server/database/pos.db or server/pos.db?
    // Let's check both
    const srcDb1 = path.join(updatesDir, 'server', 'pos.db');
    const srcDb2 = path.join(updatesDir, 'server', 'database', 'pos.db');
    const targetDb = path.join(userDataPath, 'pos.db');

    if (fs.existsSync(srcDb1)) {
      console.log('Found updated pos.db in server/. Overwriting local database...');
      fs.copyFileSync(srcDb1, targetDb);
      console.log('Local pos.db overwritten successfully.');
    } else if (fs.existsSync(srcDb2)) {
      console.log('Found updated pos.db in server/database/. Overwriting local database...');
      fs.copyFileSync(srcDb2, targetDb);
      console.log('Local pos.db overwritten successfully.');
    }

    // Save update metadata locally
    const metaPath = path.join(updatesDir, 'update_meta.json');
    const metaData = {
      publishedAt: publishedAt || new Date().toISOString(),
      version: latestVersion || 'latest',
      downloadedAt: new Date().toISOString()
    };
    fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2));
    console.log('Saved update metadata:', metaData);

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
    console.log('Relaunch request received. Closing servers and restarting...');
    
    // First, close WebSocket server clients
    if (req.app && req.app.get('wss_server')) {
      try {
        const wss = req.app.get('wss_server');
        wss.clients.forEach((client) => {
          client.terminate();
        });
        wss.close();
      } catch (err) {
        console.error('Error closing WebSocket server:', err);
      }
    }

    // Next, close HTTP server and connections
    if (req.app && req.app.get('http_server')) {
      try {
        const srv = req.app.get('http_server');
        if (typeof srv.closeAllConnections === 'function') {
          srv.closeAllConnections();
        }
        srv.close(() => {
          console.log('HTTP server closed successfully.');
        });
      } catch (err) {
        console.error('Error closing HTTP server:', err);
      }
    }

    res.json({ success: true, message: 'Relaunching Electron app...' });
    
    setTimeout(() => {
      electronApp.relaunch();
      electronApp.exit(0);
    }, 1200);
  } else {
    res.status(400).json({ error: 'Not running inside Electron, cannot restart' });
  }
});

// GET /api/update/mobile-bundle
router.get('/mobile-bundle', (req, res) => {
  const userDataPath = getUserDataPath();
  const bundlePath = path.join(userDataPath, 'updates/index.android.bundle');
  if (fs.existsSync(bundlePath)) {
    return res.sendFile(bundlePath);
  }
  // Fallback to local public/mobile bundle if it exists
  const localBundlePath = path.join(__dirname, '../public/mobile/index.android.bundle');
  if (fs.existsSync(localBundlePath)) {
    return res.sendFile(localBundlePath);
  }
  res.status(404).json({ error: 'No mobile bundle found on server' });
});

// GET /api/update/mobile-version
router.get('/mobile-version', (req, res) => {
  const userDataPath = getUserDataPath();
  const metaPath = path.join(userDataPath, 'updates/update_meta.json');
  let version = '1.0.0';
  let publishedAt = '';
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      version = meta.version || '1.0.0';
      publishedAt = meta.publishedAt || '';
    } catch (e) {}
  }
  res.json({ version, publishedAt });
});

module.exports = router;
