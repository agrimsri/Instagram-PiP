const enterBtn     = document.getElementById("enter-btn");
const exitBtn      = document.getElementById("exit-btn");
const pageStatus   = document.getElementById("page-status");
const videoStatus  = document.getElementById("video-status");
const pipStatus    = document.getElementById("pip-status");
const messageEl    = document.getElementById("message");
const msgText      = document.getElementById("msg-text");
const enterSpinner = document.getElementById("enter-spinner");
const enterIcon    = document.getElementById("enter-icon");
const tip          = document.getElementById("tip");
const streamPicker = document.getElementById("stream-picker");
const streamList   = document.getElementById("stream-list");
const quickControls= document.getElementById("quick-controls");
const qcMic        = document.getElementById("qc-mic");
const qcCam        = document.getElementById("qc-cam");
const qcMicIcon    = document.getElementById("qc-mic-icon");
const qcCamIcon    = document.getElementById("qc-cam-icon");
const qcMicLbl     = document.getElementById("qc-mic-lbl");
const qcCamLbl     = document.getElementById("qc-cam-lbl");

let selectedVideoIndex = null;
let currentTab = null;

function setStatus(el, type, label) {
  el.querySelector(".dot").className = "dot " + type + (type === "green" ? " pulse" : "");
  el.querySelector("span:last-child").textContent = label;
}
function showMessage(type, text) { messageEl.className = "message show " + type; msgText.textContent = text; }
function hideMessage() { messageEl.className = "message"; }

function updateQuickControls(status) {
  if (!status.pipActive) { quickControls.classList.remove("show"); return; }
  quickControls.classList.add("show");

  const micOn = status.micState === "on";
  const micMuted = status.micState === "muted";
  qcMicIcon.textContent = micMuted ? "🔇" : "🎤";
  qcMicLbl.textContent  = micMuted ? "Muted" : (micOn ? "Mic On" : "Mic");
  qcMic.className = "qc-btn" + (micMuted ? " muted" : "");

  const camOff = status.camState === "off";
  const camOn  = status.camState === "on";
  qcCamIcon.textContent = camOff ? "🚫" : "📷";
  qcCamLbl.textContent  = camOff ? "Cam Off" : (camOn ? "Cam On" : "Camera");
  qcCam.className = "qc-btn" + (camOff ? " muted" : "");
}

async function checkStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (!tab?.url?.includes("instagram.com")) {
    setStatus(pageStatus, "red", "Not on Instagram");
    setStatus(videoStatus, "grey", "—");
    setStatus(pipStatus, "grey", "Inactive");
    enterBtn.disabled = true;
    showMessage("error", "Please navigate to Instagram and start a video call first.");
    tip.style.display = "none";
    return;
  }
  setStatus(pageStatus, "green", "instagram.com ✓");

  try {
    const status = await chrome.tabs.sendMessage(tab.id, { action: "getStatus" });

    if (status.playingCount > 0) {
      setStatus(videoStatus, "green", `${status.playingCount} stream${status.playingCount > 1 ? "s" : ""} active`);
      enterBtn.disabled = false;
      hideMessage();
      tip.style.display = "none";
      if (status.videoCount > 1) {
        const videos = await chrome.tabs.sendMessage(tab.id, { action: "getVideos" });
        renderStreamPicker(tab, videos);
      } else { streamPicker.style.display = "none"; }
    } else if (status.videoCount > 0) {
      setStatus(videoStatus, "grey", "Video found, not playing");
      enterBtn.disabled = true;
      showMessage("info", "Video found but not playing yet — wait for the call to connect.");
    } else {
      setStatus(videoStatus, "grey", "No video detected");
      enterBtn.disabled = true;
      showMessage("info", "No video call found. Start an Instagram video call first.");
    }

    if (status.pipActive) {
      setStatus(pipStatus, "green", "Active ✓");
      enterBtn.style.display = "none";
      exitBtn.style.display = "flex";
    } else {
      setStatus(pipStatus, "grey", "Inactive");
      enterBtn.style.display = "flex";
      exitBtn.style.display = "none";
    }

    updateQuickControls(status);

  } catch (e) {
    setStatus(videoStatus, "grey", "Waiting for page…");
    enterBtn.disabled = true;
    showMessage("info", "Page still loading. Try refreshing Instagram.");
  }
}

async function renderStreamPicker(tab, videos) {
  if (!videos || videos.length <= 1) { streamPicker.style.display = "none"; return; }
  streamPicker.style.display = "block";
  streamList.innerHTML = "";

  const autoOpt = document.createElement("div");
  autoOpt.className = "stream-option" + (selectedVideoIndex === null ? " active" : "");
  autoOpt.innerHTML = `<span>🤖 Auto-detect</span><span class="stream-meta">largest video</span>`;
  autoOpt.addEventListener("click", async () => {
    selectedVideoIndex = null;
    await chrome.tabs.sendMessage(tab.id, { action: "setVideoIndex", index: null });
    renderStreamPicker(tab, videos);
  });
  streamList.appendChild(autoOpt);

  videos.forEach((v, i) => {
    const isSmall = v.width < 200 && v.height < 200;
    const label = isSmall ? `📷 Stream ${i+1} — your camera` : `👤 Stream ${i+1} — friend's video`;
    const opt = document.createElement("div");
    opt.className = "stream-option" + (selectedVideoIndex === i ? " active" : "");
    opt.innerHTML = `<span>${label}</span><span class="stream-meta">${v.width}×${v.height}px</span>`;
    opt.addEventListener("click", async () => {
      selectedVideoIndex = i;
      await chrome.tabs.sendMessage(tab.id, { action: "setVideoIndex", index: i });
      renderStreamPicker(tab, videos);
    });
    streamList.appendChild(opt);
  });
}

// Mic/cam toggles in the popup — send message to content script which clicks Instagram's button
qcMic.addEventListener("click", async () => {
  if (!currentTab) return;
  await chrome.tabs.sendMessage(currentTab.id, { action: "toggleMic" });
  setTimeout(checkStatus, 400);
});
qcCam.addEventListener("click", async () => {
  if (!currentTab) return;
  await chrome.tabs.sendMessage(currentTab.id, { action: "toggleCam" });
  setTimeout(checkStatus, 400);
});

enterBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  enterBtn.disabled = true;
  enterIcon.style.display = "none";
  enterSpinner.style.display = "block";
  document.getElementById("enter-label").textContent = "Activating…";
  hideMessage();

  try {
    const result = await chrome.tabs.sendMessage(tab.id, { action: "enterPiP" });
    if (result.success) {
      setStatus(pipStatus, "green", "Active ✓");
      enterBtn.style.display = "none";
      exitBtn.style.display = "flex";
      showMessage("success", "🎉 Floating! Mic & camera buttons are inside the window.");
      await checkStatus();
      if (result.mode === "document") setTimeout(() => window.close(), 1400);
    } else {
      enterBtn.disabled = false;
      enterIcon.style.display = "inline";
      enterSpinner.style.display = "none";
      document.getElementById("enter-label").textContent = "Float Video Call";
      showMessage("error", result.reason === "no_video"
        ? "No active video stream found. Make sure the call is connected."
        : "Couldn't activate PiP: " + result.reason);
    }
  } catch (e) {
    enterBtn.disabled = false;
    enterIcon.style.display = "inline";
    enterSpinner.style.display = "none";
    document.getElementById("enter-label").textContent = "Float Video Call";
    showMessage("error", "Extension error. Try refreshing Instagram.");
  }
});

exitBtn.addEventListener("click", async () => {
  if (!currentTab) return;
  await chrome.tabs.sendMessage(currentTab.id, { action: "exitPiP" });
  setStatus(pipStatus, "grey", "Inactive");
  exitBtn.style.display = "none";
  enterBtn.style.display = "flex";
  enterBtn.disabled = false;
  quickControls.classList.remove("show");
  hideMessage();
  tip.style.display = "block";
});

checkStatus();
