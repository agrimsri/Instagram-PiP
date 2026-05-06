// Instagram PiP — Popup Script

const enterBtn = document.getElementById("enter-btn");
const exitBtn = document.getElementById("exit-btn");
const pageStatus = document.getElementById("page-status");
const videoStatus = document.getElementById("video-status");
const pipStatus = document.getElementById("pip-status");
const messageEl = document.getElementById("message");
const msgText = document.getElementById("msg-text");
const enterSpinner = document.getElementById("enter-spinner");
const enterIcon = document.getElementById("enter-icon");
const tip = document.getElementById("tip");
const streamPicker = document.getElementById("stream-picker");
const streamList = document.getElementById("stream-list");

let selectedVideoIndex = null; // null = auto

function setStatus(el, type, label) {
  const dot = el.querySelector(".dot");
  const span = el.querySelector("span:last-child");
  dot.className = "dot " + type + (type === "green" ? " pulse" : "");
  span.textContent = label;
}

function showMessage(type, text) {
  messageEl.className = "message show " + type;
  msgText.textContent = text;
}

function hideMessage() {
  messageEl.className = "message";
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function renderStreamPicker(tab, videos) {
  if (!videos || videos.length <= 1) {
    streamPicker.style.display = "none";
    return;
  }

  streamPicker.style.display = "block";
  streamList.innerHTML = "";

  // "Auto" option
  const autoOpt = document.createElement("div");
  autoOpt.className = "stream-option" + (selectedVideoIndex === null ? " active" : "");
  autoOpt.innerHTML = `<span>🤖 Auto-detect (recommended)</span><span class="stream-meta">largest video</span>`;
  autoOpt.addEventListener("click", async () => {
    selectedVideoIndex = null;
    await chrome.tabs.sendMessage(tab.id, { action: "setVideoIndex", index: null });
    renderStreamPicker(tab, videos);
  });
  streamList.appendChild(autoOpt);

  videos.forEach((v, i) => {
    const isSmall = v.width < 200 && v.height < 200;
    const label = isSmall ? `📷 Stream ${i + 1} — your camera` : `👤 Stream ${i + 1} — friend's video`;
    const opt = document.createElement("div");
    opt.className = "stream-option" + (selectedVideoIndex === i ? " active" : "");
    opt.innerHTML = `<span>${label}</span><span class="stream-meta">${v.width}×${v.height}px</span>`;
    opt.addEventListener("click", async () => {
      selectedVideoIndex = i;
      await chrome.tabs.sendMessage(tab.id, { action: "setVideoIndex", index: i });
      renderStreamPicker(tab, videos);
      // Re-trigger PiP with new selection
      if (document.getElementById("pip-status").querySelector("span:last-child").textContent.includes("Active")) {
        enterBtn.click();
      }
    });
    streamList.appendChild(opt);
  });
}

async function checkStatus() {
  const tab = await getCurrentTab();
  const isInstagram = tab?.url?.includes("instagram.com");

  if (!isInstagram) {
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
    const result = await chrome.tabs.sendMessage(tab.id, { action: "getStatus" });

    if (result.playingCount > 0) {
      setStatus(videoStatus, "green", `${result.playingCount} stream${result.playingCount > 1 ? "s" : ""} active`);
      enterBtn.disabled = false;
      hideMessage();
      tip.style.display = "none";

      // Load stream picker if multiple videos
      if (result.videoCount > 1) {
        const videos = await chrome.tabs.sendMessage(tab.id, { action: "getVideos" });
        renderStreamPicker(tab, videos);
      } else {
        streamPicker.style.display = "none";
      }
    } else if (result.videoCount > 0) {
      setStatus(videoStatus, "grey", "Video found, not playing yet");
      enterBtn.disabled = true;
      showMessage("info", "A video element was found but isn't playing yet. Make sure your call is connected.");
      tip.style.display = "none";
    } else {
      setStatus(videoStatus, "grey", "No video detected");
      enterBtn.disabled = true;
      showMessage("info", "No video call detected. Start a video call on Instagram, then click the extension.");
    }

    if (result.pipActive) {
      setStatus(pipStatus, "green", "Active ✓");
      enterBtn.style.display = "none";
      exitBtn.style.display = "flex";
    } else {
      setStatus(pipStatus, "grey", "Inactive");
      enterBtn.style.display = "flex";
      exitBtn.style.display = "none";
    }
  } catch (e) {
    setStatus(videoStatus, "grey", "Waiting for page…");
    enterBtn.disabled = true;
    showMessage("info", "Page is loading. Try refreshing Instagram and reopening this extension.");
  }
}

enterBtn.addEventListener("click", async () => {
  const tab = await getCurrentTab();
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
      showMessage("success", "🎉 PiP is active! The call is now floating above your screen.");
      // Close popup so they can work
      setTimeout(() => window.close(), 1200);
    } else {
      enterBtn.disabled = false;
      enterIcon.style.display = "inline";
      enterSpinner.style.display = "none";
      document.getElementById("enter-label").textContent = "Float Video Call";

      if (result.reason === "no_video") {
        showMessage("error", "No active video stream found. Make sure your Instagram video call is connected and visible.");
      } else if (result.reason === "not_supported") {
        showMessage("error", "Picture-in-Picture is not supported in this browser. Please use Chrome.");
      } else {
        showMessage("error", "Couldn't activate PiP: " + result.reason);
      }
    }
  } catch (e) {
    enterBtn.disabled = false;
    enterIcon.style.display = "inline";
    enterSpinner.style.display = "none";
    document.getElementById("enter-label").textContent = "Float Video Call";
    showMessage("error", "Extension error. Try refreshing the Instagram page.");
  }
});

exitBtn.addEventListener("click", async () => {
  const tab = await getCurrentTab();
  await chrome.tabs.sendMessage(tab.id, { action: "exitPiP" });
  setStatus(pipStatus, "grey", "Inactive");
  exitBtn.style.display = "none";
  enterBtn.style.display = "flex";
  enterBtn.disabled = false;
  hideMessage();
  tip.style.display = "block";
});

// Init
checkStatus();
