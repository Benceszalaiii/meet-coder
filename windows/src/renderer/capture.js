// Renderer half of the capture engine: owns the window stream, produces the change-detection
// thumbnail and (only when something changed) a full frame for on-device OCR in the main process.

const video = document.createElement('video');
video.muted = true;
video.playsInline = true;
let stream = null;

export function getVideo() { return video; }
export function getStream() { return stream; }

const listeners = new Set();
export function onStreamChange(f) { listeners.add(f); return () => listeners.delete(f); }
const fire = () => listeners.forEach(f => f(stream));

export async function startCapture() {
  await stopCapture();
  const s = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 3, width: { max: 3840 }, height: { max: 2160 } }, audio: false });
  stream = s;
  video.srcObject = s;
  await video.play();
  s.getVideoTracks()[0].addEventListener('ended', () => {
    stream = null; video.srcObject = null; fire();
    window.api.notify('capture-ended', { message: 'the window was closed or is no longer available' });
  });
  fire();
}

export async function stopCapture() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = null;
  video.srcObject = null;
  fire();
}

const SW = 64, SH = 36;
const sigCanvas = new OffscreenCanvas(SW, SH);
const sigCtx = sigCanvas.getContext('2d', { willReadFrequently: true });

/** Tiny grayscale thumbnail used as a cheap "did anything change" check. */
function signature() {
  sigCtx.imageSmoothingEnabled = true;
  sigCtx.imageSmoothingQuality = 'low';
  sigCtx.drawImage(video, 0, 0, SW, SH);
  const d = sigCtx.getImageData(0, 0, SW, SH).data;
  const out = new Uint8Array(SW * SH);
  for (let i = 0; i < out.length; i++) out[i] = Math.round(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]);
  return out;
}

function differs(a, b) {
  if (!a || !b || a.length !== b.length) return true;
  let changed = 0;
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 5) changed++;
  return changed >= 1;
}

export async function snapshot(oldSig) {
  if (!stream || video.readyState < 2 || !video.videoWidth) return null;
  const sig = signature();
  let png = null;
  if (differs(oldSig ? new Uint8Array(oldSig) : null, sig)) {
    const scale = Math.min(1, 1680 / video.videoWidth);
    const w = Math.round(video.videoWidth * scale), h = Math.round(video.videoHeight * scale);
    const c = new OffscreenCanvas(w, h);
    c.getContext('2d').drawImage(video, 0, 0, w, h);
    png = await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer();
  }
  return { sig, png };
}
