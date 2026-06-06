# Desktop App Build Plan

## Architecture
- Electron wraps the existing web app
- Express server starts automatically inside Electron
- Single installer (.exe Windows / .dmg Mac)
- SQLite database saved in user's AppData folder
- System tray icon + auto-start on boot option

## Steps
1. Modify web/src/config.js to support env variables
2. Create desktop/ folder with Electron entry
3. Install electron + electron-builder
4. Build web + package everything
