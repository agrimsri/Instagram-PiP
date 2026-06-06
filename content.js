// Instagram PiP — Content Script

let pipWindow = null;
let manualVideoIndex = null;

// ─── Find Instagram's own call control buttons ────────────────────────────────
// Instead of hacking MediaStream tracks (unreliable), we click Instagram's
// own buttons so their state machine handles everything correctly.

function findMicButton() {
  // Instagram labels these buttons with aria-label in various languages
  const selectors = [
    '[aria-label*="mute" i]',
    '[aria-label*="unmute" i]',
    '[aria-label*="microphone" i]',
    '[aria-label*="audio" i]',
    '[aria-label*="mic" i]',
    '[title*="mute" i]',
    '[title*="microphone" i]',
  ];
  for (const sel of selectors) {
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      // Must be a clickable element inside a call UI (not a menu item etc)
      if (el.tagName === "BUTTON" || el.role === "button" || el.tagName === "DIV") {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return el;
      }
    }
  }
  return null;
}

function findCamButton() {
  const selectors = [
    '[aria-label*="camera" i]',
    '[aria-label*="video" i]',
    '[aria-label*="cam" i]',
    '[title*="camera" i]',
    '[title*="video" i]',
  ];
  for (const sel of selectors) {
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      if (el.tagName === "BUTTON" || el.role === "button" || el.tagName === "DIV") {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return el;
      }
    }
  }
  return null;
}

// Read current mic/cam state from aria-pressed, aria-checked, or aria-label text
function getMicState() {
  const btn = findMicButton();
  if (!btn) return null;
  // aria-pressed="true" usually means it IS active (not muted)
  if (btn.getAttribute("aria-pressed") !== null)
    return btn.getAttribute("aria-pressed") !== "true" ? "muted" : "on";
  if (btn.getAttribute("aria-checked") !== null)
    return btn.getAttribute("aria-checked") !== "true" ? "muted" : "on";
  // Fall back to label sniffing
  const label = (btn.getAttribute("aria-label") || btn.getAttribute("title") || "").toLowerCase();
  if (label.includes("unmute")) return "muted";
  if (label.includes("mute"))   return "on";
  return "unknown";
}

function getCamState() {
  const btn = findCamButton();
  if (!btn) return null;
  if (btn.getAttribute("aria-pressed") !== null)
    return btn.getAttribute("aria-pressed") !== "true" ? "off" : "on";
  if (btn.getAttribute("aria-checked") !== null)
    return btn.getAttribute("aria-checked") !== "true" ? "off" : "on";
  const label = (btn.getAttribute("aria-label") || btn.getAttribute("title") || "").toLowerCase();
  if (label.includes("turn on")) return "off";
  if (label.includes("turn off") || label.includes("stop")) return "on";
  return "unknown";
}

function clickMic() {
  const btn = findMicButton();
  if (btn) { btn.click(); return true; }
  return false;
}

function clickCam() {
  const btn = findCamButton();
  if (btn) { btn.click(); return true; }
  return false;
}

// ─── Video detection ──────────────────────────────────────────────────────────

function getAllVideos() {
  return Array.from(document.querySelectorAll("video"));
}

function findRemoteVideo() {
  const videos = getAllVideos();
  if (videos.length === 0) return null;
  if (manualVideoIndex !== null && videos[manualVideoIndex]) return videos[manualVideoIndex];

  const scored = videos.map((v) => {
    const rect = v.getBoundingClientRect();
    let score = 0;
    score += (rect.width * rect.height) * 0.05;
    if (!v.paused) score += 200;
    if (v.readyState >= 2) score += 100;
    score += (v.videoWidth * v.videoHeight) / 5000;
    if (rect.width < 200 && rect.height < 200) score -= 800;
    const onScreen = rect.top < window.innerHeight && rect.bottom > 0 &&
                     rect.left < window.innerWidth  && rect.right  > 0;
    if (!onScreen) score -= 500;
    return { v, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].v;
}

// ─── Document PiP ────────────────────────────────────────────────────────────

async function enterPiP() {
  const remoteVideo = findRemoteVideo();
  if (!remoteVideo) return { success: false, reason: "no_video" };

  if (window.documentPictureInPicture) return await enterDocumentPiP(remoteVideo);

  if (!document.pictureInPictureEnabled) return { success: false, reason: "not_supported" };
  return await enterPlainPiP(remoteVideo);
}

async function enterDocumentPiP(remoteVideo) {
  try {
    if (pipWindow && !pipWindow.closed) pipWindow.close();

    const aspect = remoteVideo.videoWidth && remoteVideo.videoHeight
      ? remoteVideo.videoWidth / remoteVideo.videoHeight : 16 / 9;
    const pipW = 400;
    const pipH = Math.round(pipW / aspect);

    pipWindow = await window.documentPictureInPicture.requestWindow({ width: pipW, height: pipH });
    buildPiPUI(pipWindow, remoteVideo);
    pipWindow.addEventListener("pagehide", () => { pipWindow = null; });
    return { success: true, mode: "document" };
  } catch (err) {
    return await enterPlainPiP(remoteVideo);
  }
}

// ─── Find Instagram's end call button ────────────────────────────────────────
function findEndCallButton() {
  const selectors = [
    '[aria-label*="end" i]',
    '[aria-label*="leave" i]',
    '[aria-label*="hang up" i]',
    '[aria-label*="hangup" i]',
    '[title*="end call" i]',
    '[title*="leave" i]',
  ];
  for (const sel of selectors) {
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      if (el.tagName === "BUTTON" || el.role === "button" || el.tagName === "DIV") {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return el;
      }
    }
  }
  return null;
}

function clickEndCall() {
  const btn = findEndCallButton();
  if (btn) { btn.click(); return true; }
  return false;
}

// ─── PiP UI ───────────────────────────────────────────────────────────────────

function buildPiPUI(win, remoteVideo) {
  const doc = win.document;

  doc.head.innerHTML = `<meta charset="UTF-8"/><style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      width: 100%; height: 100%;
      background: #000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      overflow: hidden;
      position: relative;
    }

    /* Video fills the entire window */
    #pip-video {
      position: absolute;
      inset: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      display: block;
      background: #111;
    }

    /* Controls overlay — hidden by default, slides up on hover */
    #controls {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 18px 16px 20px;
      background: linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 70%, transparent 100%);
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.22s ease, transform 0.22s ease;
      pointer-events: none;
      z-index: 10;
    }

    /* Show on hover */
    body:hover #controls {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    /* Keep visible while interacting with buttons */
    #controls:focus-within {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .btn-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
    }

    .ctrl-btn {
      width: 46px; height: 46px;
      border-radius: 50%; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
      transition: transform 0.15s, background 0.15s, box-shadow 0.15s;
      outline: none;
      backdrop-filter: blur(8px);
    }
    .ctrl-btn:hover  { transform: scale(1.12); }
    .ctrl-btn:active { transform: scale(0.93); }

    .ctrl-btn.on      { background: rgba(255,255,255,0.18); }
    .ctrl-btn.off     { background: rgba(239,68,68,0.85); box-shadow: 0 0 16px rgba(239,68,68,0.5); }
    .ctrl-btn.unknown { background: rgba(255,255,255,0.12); }

    .ctrl-btn.end {
      background: rgba(239,68,68,0.9);
      width: 50px; height: 50px;
      font-size: 18px;
      box-shadow: 0 0 20px rgba(239,68,68,0.4);
    }
    .ctrl-btn.end:hover { background: rgb(239,68,68); box-shadow: 0 0 28px rgba(239,68,68,0.7); }

    .lbl {
      font-size: 10px;
      color: rgba(255,255,255,0.6);
      letter-spacing: 0.3px;
      white-space: nowrap;
      text-shadow: 0 1px 3px rgba(0,0,0,0.8);
    }
    .lbl.muted { color: rgba(248,113,113,0.95); }

    /* Toast */
    #toast {
      position: absolute;
      bottom: 90px; left: 50%;
      transform: translateX(-50%);
      background: rgba(239,68,68,0.92);
      color: #fff; padding: 5px 14px;
      border-radius: 20px; font-size: 11px;
      display: none; white-space: nowrap; z-index: 99;
      pointer-events: none;
    }
  </style>`;

  doc.body.innerHTML = `
    <video id="pip-video" autoplay playsinline></video>
    <div id="controls">
      <div class="btn-wrap">
        <button class="ctrl-btn unknown" id="btn-mic" title="Toggle microphone">🎤</button>
        <span class="lbl" id="lbl-mic">Mic</span>
      </div>
      <div class="btn-wrap">
        <button class="ctrl-btn unknown" id="btn-cam" title="Toggle camera">📷</button>
        <span class="lbl" id="lbl-cam">Camera</span>
      </div>
      <div class="btn-wrap">
        <button class="ctrl-btn end" id="btn-end" title="End call">📵</button>
        <span class="lbl">End Call</span>
      </div>
    </div>
    <div id="toast"></div>`;

  // Mirror remote stream into PiP video
  const pipVideo = doc.getElementById("pip-video");
  if (remoteVideo.srcObject) {
    pipVideo.srcObject = remoteVideo.srcObject;
  } else {
    try { pipVideo.srcObject = remoteVideo.captureStream(); }
    catch { pipVideo.src = remoteVideo.src; }
  }

  const btnMic = doc.getElementById("btn-mic");
  const btnCam = doc.getElementById("btn-cam");
  const lblMic = doc.getElementById("lbl-mic");
  const lblCam = doc.getElementById("lbl-cam");
  const toast  = doc.getElementById("toast");

  function showToast(msg) {
    toast.textContent = msg;
    toast.style.display = "block";
    setTimeout(() => { toast.style.display = "none"; }, 2500);
  }

  function syncControls() {
    const micState = getMicState();
    const camState = getCamState();

    if (micState === "muted") {
      btnMic.textContent = "🔇"; btnMic.className = "ctrl-btn off";
      lblMic.textContent = "Muted"; lblMic.className = "lbl muted";
    } else if (micState === "on") {
      btnMic.textContent = "🎤"; btnMic.className = "ctrl-btn on";
      lblMic.textContent = "Mic On"; lblMic.className = "lbl";
    } else {
      btnMic.textContent = "🎤"; btnMic.className = "ctrl-btn unknown";
      lblMic.textContent = "Mic"; lblMic.className = "lbl";
    }

    if (camState === "off") {
      btnCam.textContent = "🚫"; btnCam.className = "ctrl-btn off";
      lblCam.textContent = "Cam Off"; lblCam.className = "lbl muted";
    } else if (camState === "on") {
      btnCam.textContent = "📷"; btnCam.className = "ctrl-btn on";
      lblCam.textContent = "Cam On"; lblCam.className = "lbl";
    } else {
      btnCam.textContent = "📷"; btnCam.className = "ctrl-btn unknown";
      lblCam.textContent = "Camera"; lblCam.className = "lbl";
    }
  }

  btnMic.addEventListener("click", () => {
    const ok = clickMic();
    if (!ok) showToast("Mic button not found on page");
    setTimeout(syncControls, 300);
  });

  btnCam.addEventListener("click", () => {
    const ok = clickCam();
    if (!ok) showToast("Camera button not found on page");
    setTimeout(syncControls, 300);
  });

  doc.getElementById("btn-end").addEventListener("click", () => {
    const ok = clickEndCall();
    if (!ok) showToast("End call button not found — hang up manually");
    win.close();
  });

  syncControls();
  const interval = win.setInterval(syncControls, 1500);
  win.addEventListener("pagehide", () => win.clearInterval(interval));
}

// ─── Plain video PiP fallback ─────────────────────────────────────────────────
async function enterPlainPiP(video) {
  try {
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    video.removeAttribute("disablePictureInPicture");
    video.disablePictureInPicture = false;
    await video.requestPictureInPicture();
    return { success: true, mode: "plain" };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

// ─── Exit ─────────────────────────────────────────────────────────────────────
async function exitPiP() {
  try {
    if (pipWindow && !pipWindow.closed) { pipWindow.close(); pipWindow = null; }
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    return { success: true };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

// ─── Status ──────────────────────────────────────────────────────────────────
function getStatus() {
  const videos = getAllVideos();
  const playing = videos.filter(v => !v.paused && v.readyState >= 2);
  return {
    hasVideo: playing.length > 0,
    pipActive: (pipWindow && !pipWindow.closed) || !!document.pictureInPictureElement,
    videoCount: videos.length,
    playingCount: playing.length,
    micState: getMicState(),
    camState: getCamState(),
    hasMicBtn: !!findMicButton(),
    hasCamBtn: !!findCamButton(),
  };
}

function getVideos() {
  return getAllVideos().map((v, i) => {
    const rect = v.getBoundingClientRect();
    return { index: i, width: Math.round(rect.width), height: Math.round(rect.height),
             intrinsicW: v.videoWidth, intrinsicH: v.videoHeight, paused: v.paused, muted: v.muted };
  });
}

// ─── Messages ─────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "enterPiP")      { enterPiP().then(sendResponse); return true; }
  if (msg.action === "exitPiP")       { exitPiP().then(sendResponse);  return true; }
  if (msg.action === "getStatus")     { sendResponse(getStatus()); }
  if (msg.action === "getVideos")     { sendResponse(getVideos()); }
  if (msg.action === "toggleMic")     { sendResponse({ ok: clickMic() }); }
  if (msg.action === "toggleCam")     { sendResponse({ ok: clickCam() }); }
  if (msg.action === "setVideoIndex") { manualVideoIndex = msg.index; sendResponse({ success: true }); }
});
