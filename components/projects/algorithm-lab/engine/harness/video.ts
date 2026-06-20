// Capture the live canvas to a WebM video clip — so any system can be grabbed as
// a motion-graphic background loop. Uses canvas.captureStream + MediaRecorder
// (VP9 → VP8 → default), high bitrate, and reports progress while recording.

export function pickVideoMime(): string {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "video/webm";
}

/**
 * Record `canvas` for `seconds` at `fps`, resolving to a WebM Blob.
 * `onProgress` is called with 0..1 while recording.
 */
export function recordWebM(
  canvas: HTMLCanvasElement,
  seconds: number,
  fps: number,
  onProgress?: (p: number) => void,
  audioStream?: MediaStream | null,
): Promise<Blob> {
  const stream = canvas.captureStream(fps);
  if (audioStream) for (const tr of audioStream.getAudioTracks()) stream.addTrack(tr);
  const mime = pickVideoMime();
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 32_000_000 });
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

  const done = new Promise<Blob>((resolve) => {
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: mime }));
    };
  });

  rec.start();
  const start = performance.now();
  const tick = () => {
    const p = Math.min(1, (performance.now() - start) / (seconds * 1000));
    onProgress?.(p);
    if (p >= 1) {
      try { rec.requestData(); } catch { /* noop */ }
      if (rec.state !== "inactive") rec.stop();
    } else {
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
  return done;
}
