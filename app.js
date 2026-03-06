const elements = {
  mainContainer: document.querySelector("#mainContainer"),
  dropZone: document.querySelector("#dropZone"),
  videoInput: document.querySelector("#videoInput"),
  previewVideo: document.querySelector("#previewVideo"),
  uploadPrompt: document.querySelector("#uploadPrompt"),
  replaceBtn: document.querySelector("#replaceBtn"),
  videoOverlay: document.querySelector("#videoOverlay"),
  copyVideoFrameBtn: document.querySelector("#copyVideoFrameBtn"),
  
  resultsSection: document.querySelector("#resultsSection"),
  firstFrameImg: document.querySelector("#firstFrameImg"),
  lastFrameImg: document.querySelector("#lastFrameImg"),
  firstFrameTime: document.querySelector("#firstFrameTime"),
  lastFrameTime: document.querySelector("#lastFrameTime"),
  
  downloadFirstBtn: document.querySelector("#downloadFirstBtn"),
  downloadLastBtn: document.querySelector("#downloadLastBtn"),
  downloadZipBtn: document.querySelector("#downloadZipBtn"),
  downloadCurrentBtn: document.querySelector("#downloadCurrentBtn"),
  copyFirstBtn: document.querySelector("#copyFirstBtn"),
  copyLastBtn: document.querySelector("#copyLastBtn"),
  
  captureCanvas: document.querySelector("#captureCanvas"),
  statusToast: document.querySelector("#statusToast"),
  statusText: document.querySelector("#statusText"),
  statusSpinner: document.querySelector("#statusSpinner"),
};

const state = {
  videoUrl: "",
  firstBlob: null,
  lastBlob: null,
  firstPreviewUrl: "",
  lastPreviewUrl: "",
  isProcessing: false,
};

let toastTimeout = null;

function init() {
  bindEvents();
}

function bindEvents() {
  // Click to upload
  elements.dropZone.addEventListener("click", (e) => {
    if (elements.previewVideo.classList.contains("hidden")) {
        elements.videoInput.click();
    }
  });

  // Drag & Drop
  elements.dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (elements.previewVideo.classList.contains("hidden")) {
        elements.dropZone.style.borderColor = "rgba(116, 94, 245, 0.5)"; // primary/50
        elements.dropZone.style.backgroundColor = "rgba(116, 94, 245, 0.05)"; // primary/5
    }
  });

  elements.dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    elements.dropZone.style.borderColor = "";
    elements.dropZone.style.backgroundColor = "";
  });

  elements.dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    elements.dropZone.style.borderColor = "";
    elements.dropZone.style.backgroundColor = "";
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  // File Input Change
  elements.videoInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleFile(file);
    // Reset input value to allow selecting same file again
    elements.videoInput.value = "";
  });

  // Replace Video
  elements.replaceBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    resetUI();
    elements.videoInput.click();
  });
  
  // Downloads
  elements.downloadFirstBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      downloadSingle("first");
  });
  elements.downloadLastBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      downloadSingle("last");
  });
  elements.downloadZipBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      downloadZip();
  });
  elements.downloadCurrentBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      downloadCurrentFrame();
  });

  // Copy
  if (elements.copyVideoFrameBtn) {
      elements.copyVideoFrameBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          copyCurrentFrame();
      });
  }
  if (elements.copyFirstBtn) {
      elements.copyFirstBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          copySingle("first");
      });
  }
  if (elements.copyLastBtn) {
      elements.copyLastBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          copySingle("last");
      });
  }
}

function handleFile(file) {
  if (!file.type.startsWith("video/")) {
    showToast("请选择有效的视频文件", "error");
    return;
  }

  resetUI();
  
  state.videoUrl = URL.createObjectURL(file);
  elements.previewVideo.src = state.videoUrl;
  
  elements.uploadPrompt.classList.add("hidden");
  elements.previewVideo.classList.remove("hidden");
  elements.videoOverlay.classList.remove("hidden");
  elements.downloadCurrentBtn.classList.remove("hidden");
  elements.downloadCurrentBtn.classList.add("flex");
  
  showToast("正在读取视频信息...", "info");
  
  elements.previewVideo.onloadedmetadata = () => {
     extractFrames();
  };
  
  elements.previewVideo.onerror = () => {
      showToast("视频加载失败，可能格式不受支持", "error");
      resetUI();
  };
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(2);
  return `${m.toString().padStart(2, "0")}:${s.padStart(5, "0")}`;
}

async function extractFrames() {
  if (state.isProcessing) return;
  state.isProcessing = true;
  showToast("正在提取超清首尾帧...", "info");

  try {
    const duration = elements.previewVideo.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("视频时长无效");
    }

    // Capture First Frame
    const firstBlob = await captureFrameAt(0);
    
    // Capture Last Frame
    const epsilon = Math.min(0.1, duration / 10);
    const lastBlob = await captureFrameAt(Math.max(0, duration - epsilon));

    // Update State
    state.firstBlob = firstBlob;
    state.lastBlob = lastBlob;
    state.firstPreviewUrl = URL.createObjectURL(firstBlob);
    state.lastPreviewUrl = URL.createObjectURL(lastBlob);

    // Update UI
    elements.firstFrameImg.src = state.firstPreviewUrl;
    elements.lastFrameImg.src = state.lastPreviewUrl;
    if (elements.firstFrameTime) elements.firstFrameTime.textContent = "00:00.00";
    if (elements.lastFrameTime) elements.lastFrameTime.textContent = formatTime(duration);

    elements.mainContainer.classList.add("has-results");
    elements.resultsSection.classList.remove("hidden");

    showToast("提取完成！已生成超清画质截图", "success");
  } catch (error) {
    console.error(error);
    showToast("提取失败：" + error.message, "error");
  } finally {
    state.isProcessing = false;
  }
}

function captureFrameAt(time) {
  return new Promise((resolve, reject) => {
    const video = elements.previewVideo;
    
    let resolved = false;
    const timeout = setTimeout(() => {
        if (!resolved) {
            cleanup();
            reject(new Error("等待帧定位超时"));
        }
    }, 5000);

    const cleanup = () => {
        resolved = true;
        clearTimeout(timeout);
        video.removeEventListener("seeked", onSeeked);
    };

    const onSeeked = () => {
        try {
            cleanup();
            const canvas = elements.captureCanvas;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("画布导出失败"));
            }, "image/png", 1.0); // Highest quality
        } catch (e) {
            reject(e);
        }
    };

    video.currentTime = time;
    
    if (Math.abs(video.currentTime - time) < 0.1) {
        setTimeout(onSeeked, 150); 
    } else {
        video.addEventListener("seeked", onSeeked, { once: true });
    }
  });
}

function resetUI() {
  state.isProcessing = false;
  
  if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
  if (state.firstPreviewUrl) URL.revokeObjectURL(state.firstPreviewUrl);
  if (state.lastPreviewUrl) URL.revokeObjectURL(state.lastPreviewUrl);

  state.videoUrl = "";
  state.firstBlob = null;
  state.lastBlob = null;
  state.firstPreviewUrl = "";
  state.lastPreviewUrl = "";

  elements.previewVideo.src = "";
  elements.previewVideo.removeAttribute("src");
  elements.previewVideo.load();
  
  elements.previewVideo.classList.add("hidden");
  elements.videoOverlay.classList.add("hidden");
  elements.uploadPrompt.classList.remove("hidden");
  elements.downloadCurrentBtn.classList.add("hidden");
  elements.downloadCurrentBtn.classList.remove("flex");
  
  elements.mainContainer.classList.remove("has-results");
  elements.resultsSection.classList.add("hidden");
  
  if(elements.statusToast) elements.statusToast.classList.remove("toast-show");
}

function showToast(msg, type = "info") {
  if (!elements.statusToast || !elements.statusText) return;
  
  elements.statusText.innerText = msg;
  elements.statusToast.classList.add("toast-show");
  
  const alert = elements.statusToast.querySelector(".alert");
  if (alert) {
      if (type === "success") {
          alert.style.borderColor = "rgba(82, 196, 26, 0.5)"; // success with opacity
      } else if (type === "error") {
          alert.style.borderColor = "rgba(245, 34, 45, 0.5)"; // error with opacity
      } else {
          alert.style.borderColor = "rgba(116, 94, 245, 0.5)"; // primary with opacity
      }
  }

  if (elements.statusSpinner) {
      if (type === "info") {
          elements.statusSpinner.classList.remove("hidden");
      } else {
          elements.statusSpinner.classList.add("hidden");
      }
  }
  
  if (toastTimeout) {
      clearTimeout(toastTimeout);
  }

  if (type === "success" || type === "error") {
      toastTimeout = setTimeout(() => {
          elements.statusToast.classList.remove("toast-show");
      }, 3000);
  }
}

function downloadSingle(type) {
    const blob = type === "first" ? state.firstBlob : state.lastBlob;
    if (!blob) return;
    const filename = type === "first" ? "首帧.png" : "尾帧.png";
    saveBlob(blob, filename);
}

function downloadCurrentFrame() {
    if (!state.videoUrl || elements.previewVideo.classList.contains("hidden")) return;
    
    showToast("正在提取当前帧...", "info");
    try {
        const canvas = elements.captureCanvas;
        const video = elements.previewVideo;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
            if (blob) {
                const timeStr = formatTime(video.currentTime).replace(":", "-");
                saveBlob(blob, `当前帧_${timeStr}.png`);
                showToast("提取当前帧成功！", "success");
            } else {
                throw new Error("画布导出失败");
            }
        }, "image/png", 1.0);
    } catch (error) {
        console.error(error);
        showToast("提取失败：" + error.message, "error");
    }
}

async function downloadZip() {
    if (!state.firstBlob || !state.lastBlob) return;
    
    showToast("正在生成 ZIP 压缩包...", "info");
    try {
        const zip = new JSZip();
        zip.file("首帧.png", state.firstBlob);
        zip.file("尾帧.png", state.lastBlob);
        
        const content = await zip.generateAsync({type: "blob"});
        saveBlob(content, "视频首尾帧_高清.zip");
        showToast("打包完成，已开始下载", "success");
    } catch (e) {
        showToast("ZIP 生成失败：" + e.message, "error");
    }
}

function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function copyToClipboard(blob) {
    if (!blob) return;
    try {
        if (!navigator.clipboard || !window.ClipboardItem) {
            throw new Error("浏览器不支持剪贴板图片操作");
        }
        const clipboardItem = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([clipboardItem]);
        showToast("已成功复制到剪贴板！", "success");
    } catch (err) {
        console.error("复制失败:", err);
        showToast("复制失败：" + err.message, "error");
    }
}

function copySingle(type) {
    const blob = type === "first" ? state.firstBlob : state.lastBlob;
    if (!blob) return;
    copyToClipboard(blob);
}

function copyCurrentFrame() {
    if (!state.videoUrl || elements.previewVideo.classList.contains("hidden")) return;
    
    showToast("正在提取当前帧以复制...", "info");
    try {
        const canvas = elements.captureCanvas;
        const video = elements.previewVideo;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
            if (blob) {
                copyToClipboard(blob);
            } else {
                throw new Error("画布导出失败");
            }
        }, "image/png", 1.0);
    } catch (error) {
        console.error(error);
        showToast("提取失败：" + error.message, "error");
    }
}

init();