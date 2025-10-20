# CuBiC - Quick Start Guide

## The Problem
You're seeing this error:
```
ERROR: Failed to fetch dynamically imported module: file:///C:/Users/Doombotino/Desktop/CuBiC/js/constants.js
```

**Why?** ES6 modules require an HTTP server due to browser security (CORS). You can't just open `index.html` directly.

## Quick Solutions

### Option 1: Use the Batch File (Easiest)
1. **Double-click** `start-server.bat`
2. It will auto-detect Python or Node.js and start a server
3. Open your browser to: **http://localhost:8000**
4. Press `Ctrl+C` in the terminal to stop

### Option 2: Python (if installed)
```bash
# Open Command Prompt in the CuBiC folder, then run:
python -m http.server 8000

# Or try:
py -m http.server 8000

# Then open: http://localhost:8000
```

### Option 3: Node.js (if installed)
```bash
# Open Command Prompt in the CuBiC folder, then run:
npx http-server -p 8000

# Then open: http://localhost:8000
```

### Option 4: VS Code Live Server
1. Open the `CuBiC` folder in VS Code
2. Install the "Live Server" extension (by Ritwick Dey)
3. Right-click `index.html` → "Open with Live Server"
4. Game will open automatically

### Option 5: Online Hosting
Upload the entire `CuBiC` folder to:
- **GitHub Pages** (free)
- **Netlify** (free)
- **Vercel** (free)

## Verification

Once the server is running, you should see:
- ✅ Menu with three buttons: PC Mode, Mobile Mode, VR Mode
- ✅ No console errors
- ✅ Version shows "v5.0 - Refactored"

## Troubleshooting

### "Python is not recognized"
- Install Python: https://www.python.org/downloads/
- During install, check "Add Python to PATH"

### "Node is not recognized"
- Install Node.js: https://nodejs.org/
- Restart your terminal after installing

### Still not working?
Try the standalone version:
1. Open `existing_game.html` directly (no server needed)
2. This is your original game - works but isn't refactored

## What's Different?

| Original | Refactored |
|----------|------------|
| ❌ Can open directly | ✅ Needs HTTP server |
| ❌ 955 lines in one file | ✅ Split into 9 modules |
| ❌ Hard to maintain | ✅ Easy to maintain |
| ✅ Works immediately | ⚠️ Requires setup |

Both versions have **identical functionality** - the refactored version is just better organized!
