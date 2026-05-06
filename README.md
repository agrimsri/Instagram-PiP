# 📺 Instagram PiP — Float Your Video Calls

> *Because minimising your call every 5 seconds to check your other tab is not a personality trait.*

---

## 😤 The Problem (you know exactly what this feels like)

You're on a video call with your friend on Instagram. It's going great. You're laughing, catching up, living your best life.

Then suddenly — you need to do something else. Check an email. Look something up. Open a doc. Copy-paste that link they just mentioned.

So what do you do? You **minimise the call** and now you're just... talking into the void. You can't see their face anymore. You don't know if they're reacting. You don't know if they're *also* on their phone not paying attention. The vibe is gone. You're basically just on a phone call now. Tragic.

Instagram has no built-in way to shrink the call into a floating mini window while you work. So you're stuck choosing between **watching your friend** or **using your computer**. Not both.

Until now. 😎

---

## ✨ What This Extension Does

**Instagram PiP** pops your friend's video out into a tiny floating window that **sticks on top of every other window on your screen** — Chrome, VS Code, Notion, your 47 open tabs, everything.

It's called **Picture-in-Picture**, and your browser already supports it natively. Instagram just... deliberately blocks it. (rude.) This extension quietly removes that block and activates PiP with one click.

Here's what you get:

- 🪟 **A floating mini window** that stays on top of everything you do
- 🖱️ **Drag it anywhere** — corner, side, wherever it's not in your way
- 📐 **Resize it** to whatever size feels right
- 🎯 **Smart stream detection** — picks your friend's video, not your own camera
- 🔄 **Manual stream picker** — if it grabs the wrong feed, you can switch in one click
- ✅ Works entirely in your browser, no installs, no accounts, no nonsense

---

## 🚀 Setup (takes about 60 seconds, promise)

### Step 1 — Download the extension

Grab the `instagram-pip-extension.zip` file and **unzip it** somewhere you won't accidentally delete it (your Desktop works fine, or make a folder called `My Extensions` or something).

You should end up with a folder called `instagram-pip-extension` containing these files:
```
instagram-pip-extension/
├── manifest.json
├── content.js
├── popup.html
├── popup.js
└── icons/
    ├── icon48.png
    └── icon128.png
```

### Step 2 — Open Chrome Extensions

Open Chrome and go to:
```
chrome://extensions
```

Or: **Menu (⋮) → More Tools → Extensions**

### Step 3 — Turn on Developer Mode

In the top-right corner of the Extensions page, toggle **"Developer mode"** ON.

> Don't worry, this doesn't do anything sketchy. It just lets Chrome load extensions from your local files instead of the Chrome Web Store.

### Step 4 — Load the extension

Click **"Load unpacked"** (appears after you enable Developer Mode) and select the `instagram-pip-extension` **folder** (not the zip, the unzipped folder).

### Step 5 — Pin it to your toolbar (optional but recommended)

Click the puzzle piece 🧩 icon in Chrome's toolbar → find **Instagram PiP** → click the 📌 pin icon. Now the 📺 icon will always be visible in your toolbar.

---

## 🎬 How to Use It

1. Go to **instagram.com** and start a video call with your friend
2. Once the call is connected and you can see them, click the **📺 icon** in your Chrome toolbar
3. Hit **"Float Video Call"**
4. Your friend's video pops out into a floating mini window 🎉
5. Click anywhere else, open other apps, do your thing — the window follows you everywhere
6. To close it, either click **✕** inside the PiP window, or reopen the extension and hit **"Close PiP Window"**

**Seeing your own camera instead of your friend?** Open the extension popup — you'll see a stream picker listing all detected video feeds with their sizes. Your camera is the small one (e.g. `120×90px`), your friend's is the big one (e.g. `960×540px`). Just click the right one!

---

## 🛠️ Updating the Extension

If you download a new version of the extension files:

1. Replace the files in your `instagram-pip-extension` folder
2. Go to `chrome://extensions`
3. Find **Instagram PiP** and click the **↻ refresh icon**

That's it — no need to reinstall from scratch.

---

## ❓ FAQ

**Why doesn't Instagram just have this built in?**
Great question. No idea. They want you fully locked into the app, probably. Anyway, we fixed it.

**Is this safe?**
Yep. The extension only runs on `instagram.com`, has no internet access of its own, doesn't collect any data, and the entire source code is sitting right there in the folder — you can read every line of it.

**Will this break my Instagram?**
Nope. It only removes a single attribute (`disablePictureInPicture`) from the video element temporarily when you click the button. Refreshing the page puts everything back to normal.

**It stopped working after an Instagram update!**
Instagram occasionally changes how their video calls are structured. If PiP stops working, try the manual stream picker in the popup — it lists every video element on the page so you can try them one by one.

**Does this work on Instagram DMs / Stories / Reels too?**
It'll try! The extension looks for any playing video on the page. It works best with video calls but you can experiment.

---

## 🧑‍💻 Built With

- Chrome's native [Picture-in-Picture API](https://developer.mozilla.org/en-US/docs/Web/API/Picture-in-Picture_API)
- Chrome Extension Manifest V3
- A deep frustration with unnecessary UX limitations

---

*Made with ☕ and mild irritation at Instagram's life choices.*