const elements = {
  videoInput: document.querySelector("#videoInput"),
  extractBtn: document.querySelector("#extractBtn"),
  previewVideo: document.querySelector("#previewVideo"),
  captureCanvas: document.querySelector("#captureCanvas"),
  formatSupport: document.querySelector("#formatSupport"),
  statusWrap: document.querySelector("#statusWrap"),
  statusAlert: document.querySelector("#statusAlert"),
  statusText: document.querySelector("#statusText"),
  firstFrameImg: document.querySelector("#firstFrameImg"),
  lastFrameImg: document.querySelector("#lastFrameImg"),
  firstFramePlaceholder: document.querySelector("#firstFramePlaceholder"),
  lastFramePlaceholder: document.querySelector("#lastFramePlaceholder"),
  downloadFirstBtn: document.querySelector("#downloadFirstBtn"),
  downloadLastBtn: document.querySelector("#downloadLastBtn"),
  downloadZipBtn: document.querySelector("#downloadZipBtn"),
};

const state = {
  videoUrl: "",
  firstBlob: null,
  lastBlob: null,
  firstPreviewUrl: "",
  lastPreviewUrl: "",
};

const FORMAT_PROBES = [
  { label: "MP4(H.264/AAC)", mime: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"' },
  { label: "WebM(VP8/Vorbis)", mime: 'video/webm; codecs="vp8, vorbis"' },
  { label: "WebM(VP9/Opus)", mime: 'video/webm; codecs="vp9, opus"' },
  { label: "Ogg(Theora/Vorbis)", mime: 'video/ogg; codecs="theora, vorbis"' },
  { label: "QuickTime(MOV)", mime: "video/quicktime" },
  { label: "MPEG-TS", mime: "video/mp2t" },
];

function init() {
  renderFormatSupport();
  bindEvents();
  setStatus("请选择一个视频文件开始处理。", "info");
}

function bindEvents() {
  elements.videoInput.addEventListener("change", handleFileSelect);
  elements.extractBtn.addEventListener("click", extractFrames);
  elements.downloadFirstBtn.addEventListener("click", () => downloadSingle("first"));
  elements.downloadLastBtn.addEventListener("click", () => downloadSingle("last"));
  elements.downloadZipBtn.addEventListener("click", downloadZip);
}

function renderFormatSupport() {
  const detector = document.createElement("video");
  const html = FORMAT_PROBES.map((item) => {
    const supportLevel = detector.canPlayType(item.mime);
    const supportText = supportLevel === "probably" ? "高" : supportLevel === "maybe" ? "中" : "低";
    const badgeClass = supportLevel === "" ? "badge-ghost" : supportLevel === "probably" ? "badge-success" : "badge-warning";
    return `<span class="badge ${badgeClass}">${item.label}: ${supportText}</span>`;
  }).join("");
  elements.formatSupport.innerHTML = html;
}

function handleFileSelect(event) {
  const file = event.target.files && event.target.files[0];
  clearOutputFrames();

  if (!file) {
    setStatus("未选择文件。", "warning");
    elements.extractBtn.disabled = true;
    return;
  }

  if (!file.type.startsWith("video/")) {
    setStatus("该文件不是视频，请重新选择。", "error");
    elements.extractBtn.disabled = true;
    return;
  }

  clearVideoUrl();
  state.videoUrl = URL.createObjectURL(file);

  elements.previewVideo.src = state.videoUrl;
  elements.previewVideo.classList.remove("hidden");
  elements.extractBtn.disabled = false;
  setStatus("视频已加载，点击“提取首尾帧”。", "success");
}

async function extractFrames() {
  if (!elements.previewVideo.src) {
    setStatus("请先上传视频文件。", "warning");
    return;
  }

  setUiBusy(true);
  setStatus("正在提取首帧与尾帧，请稍候...", "info", true);

  try {
    await ensureMetadata(elements.previewVideo);

    const duration = Number.isFinite(elements.previewVideo.duration) ? elements.previewVideo.duration : 0;
    if (duration <= 0) {
      throw new Error("视频时长异常，无法提取帧。");
    }

    const firstBlob = await captureFrameAt(0);

    const epsilon = Math.min(0.05, duration / 10);
    const tailTime = Math.max(duration - epsilon, 0);
    const lastBlob = await captureFrameAt(tailTime);

    setExtractedFrames(firstBlob, lastBlob);
    setStatus("提取完成，可下载单图或 ZIP。", "success");
  } catch (error) {
    setStatus(error.message || "提取失败，请更换视频后重试。", "error");
  } finally {
    setUiBusy(false);
  }
}

function ensureMetadata(video) {
  return new Promise((resolve, reject) => {
    if (video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0) {
      resolve();
      return;
    }

    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
    };

    const onLoaded = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("视频元数据读取失败。"));
    };

    video.addEventListener("loadedmetadata", onLoaded, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

async function captureFrameAt(targetTime) {
  const video = elements.previewVideo;

  if (video.videoWidth === 0 || video.videoHeight === 0) {
    throw new Error("视频帧尺寸无效。");
  }

  await seekVideoTo(video, targetTime);

  const canvas = elements.captureCanvas;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 初始化失败。");
  }

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvasToPngBlob(canvas);
}

function seekVideoTo(video, targetTime) {
  return new Promise((resolve, reject) => {
    const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    if (Math.abs(current - targetTime) < 0.01) {
      requestAnimationFrame(() => resolve());
      return;
    }

    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };

    const onSeeked = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("视频定位失败，请尝试其他格式。"));
    };

    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = targetTime;
  });
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("PNG 导出失败。"));
          return;
        }
        resolve(blob);
      },
      "image/png",
      1
    );
  });
}

function setExtractedFrames(firstBlob, lastBlob) {
  clearOutputFrames();

  state.firstBlob = firstBlob;
  state.lastBlob = lastBlob;
  state.firstPreviewUrl = URL.createObjectURL(firstBlob);
  state.lastPreviewUrl = URL.createObjectURL(lastBlob);

  elements.firstFrameImg.src = state.firstPreviewUrl;
  elements.lastFrameImg.src = state.lastPreviewUrl;

  elements.firstFrameImg.classList.remove("hidden");
  elements.lastFrameImg.classList.remove("hidden");
  elements.firstFramePlaceholder.classList.add("hidden");
  elements.lastFramePlaceholder.classList.add("hidden");

  elements.downloadFirstBtn.disabled = false;
  elements.downloadLastBtn.disabled = false;
  elements.downloadZipBtn.disabled = false;
}

function clearOutputFrames() {
  if (state.firstPreviewUrl) {
    URL.revokeObjectURL(state.firstPreviewUrl);
  }
  if (state.lastPreviewUrl) {
    URL.revokeObjectURL(state.lastPreviewUrl);
  }

  state.firstBlob = null;
  state.lastBlob = null;
  state.firstPreviewUrl = "";
  state.lastPreviewUrl = "";

  elements.firstFrameImg.removeAttribute("src");
  elements.lastFrameImg.removeAttribute("src");
  elements.firstFrameImg.classList.add("hidden");
  elements.lastFrameImg.classList.add("hidden");
  elements.firstFramePlaceholder.classList.remove("hidden");
  elements.lastFramePlaceholder.classList.remove("hidden");

  elements.downloadFirstBtn.disabled = true;
  elements.downloadLastBtn.disabled = true;
  elements.downloadZipBtn.disabled = true;
}

function clearVideoUrl() {
  if (state.videoUrl) {
    URL.revokeObjectURL(state.videoUrl);
    state.videoUrl = "";
  }
}

function setStatus(message, tone = "info", loading = false) {
  const toneMap = {
    info: "alert-info",
    success: "alert-success",
    warning: "alert-warning",
    error: "alert-error",
  };

  elements.statusWrap.classList.remove("hidden");
  elements.statusAlert.className = `alert ${toneMap[tone] || toneMap.info}`;
  elements.statusAlert.innerHTML = loading
    ? `<span class="loading loading-spinner loading-sm"></span><span id="statusText">${escapeHtml(message)}</span>`
    : `<span id="statusText">${escapeHtml(message)}</span>`;
  elements.statusText = elements.statusAlert.querySelector("#statusText");
}

function setUiBusy(isBusy) {
  elements.videoInput.disabled = isBusy;
  elements.extractBtn.disabled = isBusy || !elements.previewVideo.src;
  elements.extractBtn.classList.toggle("btn-disabled", isBusy);
  if (isBusy) {
    elements.downloadFirstBtn.disabled = true;
    elements.downloadLastBtn.disabled = true;
    elements.downloadZipBtn.disabled = true;
  } else if (state.firstBlob && state.lastBlob) {
    elements.downloadFirstBtn.disabled = false;
    elements.downloadLastBtn.disabled = false;
    elements.downloadZipBtn.disabled = false;
  }
}

function downloadSingle(type) {
  const blob = type === "first" ? state.firstBlob : state.lastBlob;
  if (!blob) {
    setStatus("没有可下载的图片，请先提取。", "warning");
    return;
  }

  const fileName = type === "first" ? "first-frame.png" : "last-frame.png";
  saveBlob(blob, fileName);
}

async function downloadZip() {
  if (!state.firstBlob || !state.lastBlob) {
    setStatus("请先提取首尾帧后再下载 ZIP。", "warning");
    return;
  }

  if (typeof JSZip === "undefined") {
    setStatus("ZIP 组件加载失败，请刷新页面重试。", "error");
    return;
  }

  setStatus("正在生成 ZIP 文件...", "info", true);
  try {
    const zip = new JSZip();
    zip.file("first-frame.png", state.firstBlob);
    zip.file("last-frame.png", state.lastBlob);
    const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
    saveBlob(zipBlob, "frames.zip");
    setStatus("ZIP 下载已开始。", "success");
  } catch (error) {
    setStatus(error.message || "ZIP 生成失败。", "error");
  }
}

function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

window.addEventListener("beforeunload", () => {
  clearVideoUrl();
  clearOutputFrames();
});

init();
