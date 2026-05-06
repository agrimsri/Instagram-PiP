// Instagram PiP — Content Script
// Listens for messages from the popup and activates Picture-in-Picture

let pipActive = false;
let manualVideoIndex = null; // null = auto, number = user-chosen index

// Find the best video element (the remote video stream in a call)
function findCallVideo() {
  const videos = Array.from(document.querySelectorAll("video"));

  if (videos.length === 0) return null;

  // If user manually selected a video, use that
  if (manualVideoIndex !== null && videos[manualVideoIndex]) {
    return videos[manualVideoIndex];
  }

  const scored = videos.map((v) => {
    let score = 0;

    // ── Rendered size on screen (most important signal) ──────────────
    // Your friend's video fills the whole call area.
    // Your own camera is a tiny corner overlay — much smaller on screen.
    const rect = v.getBoundingClientRect();
    const renderedArea = rect.width * rect.height;
    score += renderedArea * 0.05; // dominant weight

    // ── Must be playing and have data ────────────────────────────────
    if (!v.paused) score += 200;
    if (v.readyState >= 2) score += 100;

    // ── Intrinsic video resolution ───────────────────────────────────
    score += (v.videoWidth * v.videoHeight) / 5000;

    // ── Penalise tiny corner-overlay videos (local camera preview) ───
    // Instagram's local camera preview is typically < 200×200 on screen
    if (rect.width < 200 && rect.height < 200) score -= 800;

    // ── Penalise videos that are fully or mostly off-screen ──────────
    const onScreen =
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0;
    if (!onScreen) score -= 500;

    return { v, score, renderedArea, rect };
  });

  // Debug: log all candidates so we can see what's being picked
  console.log(
    "[InstagramPiP] Video candidates:",
    scored.map((s) => ({
      src: s.v.src?.slice(0, 60) || "(blob/stream)",
      score: Math.round(s.score),
      rendered: `${Math.round(s.rect.width)}×${Math.round(s.rect.height)}`,
      intrinsic: `${s.v.videoWidth}×${s.v.videoHeight}`,
      paused: s.v.paused,
      muted: s.v.muted,
    }))
  );

  scored.sort((a, b) => b.score - a.score);
  return scored[0].v;
}

async function enterPiP() {
  const video = findCallVideo();

  if (!video) {
    return { success: false, reason: "no_video" };
  }

  if (!document.pictureInPictureEnabled) {
    return { success: false, reason: "not_supported" };
  }

  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    }
    // Instagram blocks PiP with this attribute — remove it first
    video.removeAttribute("disablePictureInPicture");
    video.disablePictureInPicture = false;
    await video.requestPictureInPicture();
    pipActive = true;

    video.addEventListener("leavepictureinpicture", () => {
      pipActive = false;
    }, { once: true });

    return { success: true };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

async function exitPiP() {
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    }
    pipActive = false;
    return { success: true };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

function getStatus() {
  const videos = Array.from(document.querySelectorAll("video"));
  const playingVideos = videos.filter((v) => !v.paused && v.readyState >= 2);
  return {
    hasVideo: playingVideos.length > 0,
    pipActive: !!document.pictureInPictureElement,
    videoCount: videos.length,
    playingCount: playingVideos.length,
  };
}

function getVideos() {
  const videos = Array.from(document.querySelectorAll("video"));
  return videos.map((v, i) => {
    const rect = v.getBoundingClientRect();
    return {
      index: i,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      intrinsicW: v.videoWidth,
      intrinsicH: v.videoHeight,
      paused: v.paused,
      muted: v.muted,
    };
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "enterPiP") {
    enterPiP().then(sendResponse);
    return true;
  }
  if (msg.action === "exitPiP") {
    exitPiP().then(sendResponse);
    return true;
  }
  if (msg.action === "getStatus") {
    sendResponse(getStatus());
  }
  if (msg.action === "getVideos") {
    sendResponse(getVideos());
  }
  if (msg.action === "setVideoIndex") {
    manualVideoIndex = msg.index;
    sendResponse({ success: true });
  }
});
