# 🔧 WebSocket Connection Debug Guide

## 🎯 The Good News
Your WebSocket **IS WORKING**! The chat service logs show:
```
INFO:     ('127.0.0.1', 56896) - "WebSocket /ws" [accepted]
INFO:     connection open
INFO:     connection closed
```

This means WebSocket connections are being accepted. The issue is likely frontend-related.

## 🔍 Step-by-Step Debugging

### Step 1: Verify Chat Service
The chat service is running correctly on port 8000. ✅

### Step 2: Check Frontend Environment Variables

1. **Restart your frontend completely**:
   ```bash
   # If frontend is running, stop it (Ctrl+C)
   cd apps/web
   npm run dev  # or pnpm dev
   ```

2. **Check browser console** (F12 → Console):
   - Look for: `WebSocket URL: ws://127.0.0.1:8000/ws`
   - If you see a different URL, there's an env variable issue

### Step 3: Manual Browser Test

1. **Open**: http://127.0.0.1:8000/docs
   - Should show FastAPI documentation ✅

2. **Go to**: http://localhost:3000/assistant
   - Check if button shows "Send" instead of "Connecting..."

### Step 4: Browser Console Debugging

Open browser console (F12) and look for:

**✅ Expected logs:**
```
WebSocket URL: ws://127.0.0.1:8000/ws
WebSocket connected successfully
```

**❌ Problem indicators:**
```
WebSocket error: ...
Failed to connect to: ws://127.0.0.1:8000/ws
```

## 🛠️ Quick Fixes

### Fix 1: Clear Browser Cache
- Press `Ctrl+Shift+R` (hard refresh)
- Or open Developer Tools → Application → Storage → Clear site data

### Fix 2: Verify Environment Variables
Create `.env.local` in `apps/web/` with:
```bash
NEXT_PUBLIC_CHAT_WS=ws://127.0.0.1:8000/ws
```

### Fix 3: Restart Everything
```bash
# Terminal 1: Chat Service
cd services/chat
python app.py

# Terminal 2: Agno Service  
cd services/agno
python main.py

# Terminal 3: Frontend
cd apps/web
npm run dev
```

## 🧪 Manual WebSocket Test

If you want to test WebSocket manually:

1. **Open browser console** at localhost:3000
2. **Paste this code**:
   ```javascript
   const ws = new WebSocket('ws://127.0.0.1:8000/ws');
   ws.onopen = () => console.log('✅ WebSocket connected!');
   ws.onerror = (e) => console.log('❌ WebSocket error:', e);
   ws.onmessage = (e) => console.log('📨 Message:', e.data);
   
   // Send test message
   ws.onopen = () => {
     console.log('✅ Connected, sending test...');
     ws.send(JSON.stringify({
       user_id: 'test',
       conversation_id: 'test',
       query: 'Hello test',
       file_id: null
     }));
   };
   ```

3. **Expected result**: You should see connection success and Agno status messages

## 🎯 Most Likely Solution

**The WebSocket IS working**. The issue is probably:

1. **Frontend not restarted** after env changes
2. **Browser caching** old configuration  
3. **Environment variable** not loaded properly

**Try this sequence**:
1. Stop frontend (Ctrl+C)
2. Hard refresh browser (Ctrl+Shift+R)
3. Restart frontend: `cd apps/web && npm run dev`
4. Go to localhost:3000/assistant
5. Should now show "Send" button

## 📞 Need More Help?

If still not working, share:
1. Browser console logs (F12)
2. What the button shows ("Connecting..." vs "Send")
3. Any error messages in browser console

Your WebSocket backend is working perfectly! 🎉