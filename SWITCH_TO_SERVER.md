# 🔌 Switch to Server Mode - Quick Guide

## When You Get Your API Credentials

### 1️⃣ Open this file:
```
js/constants.js
```

### 2️⃣ Find this section (line ~77):
```javascript
export const API_CONFIG = {
  mode: "LOCAL",  // ← CHANGE THIS TO "SERVER"
  baseUrl: "https://api.transcension.io",  // ← UPDATE IF NEEDED
  apiKey: null,  // ← ADD YOUR API KEY HERE
  enableDebugLogs: true
};
```

### 3️⃣ Update it to:
```javascript
export const API_CONFIG = {
  mode: "SERVER",  // ← Changed!
  baseUrl: "https://api.transcension.io",  // ← Or whatever URL they give you
  apiKey: "your-actual-api-key-12345",  // ← Your real API key
  enableDebugLogs: true
};
```

### 4️⃣ Save and refresh!

That's it! Your game now connects to the Transcension server! 🎉

---

## Test It Works

Open browser console (F12) and look for:
```
✅ API Adapter switched to SERVER mode
✅ Game created: game-abc123
```

If you see errors, check:
- [ ] API key is correct
- [ ] Base URL is correct
- [ ] You have internet connection
- [ ] API is online

---

## Switch Back to LOCAL

Just change it back:
```javascript
mode: "LOCAL",
```

Easy! You can switch anytime.

---

## Need Help?

See `API_INTEGRATION_GUIDE.md` for full documentation.
