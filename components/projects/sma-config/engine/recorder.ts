// Records the live canvas to a video file. Prefers MP4 (H.264) where the browser
// supports it (Chrome/Safari), falling back to WebM. Real-time capture via
// MediaRecorder + canvas.captureStream — a 10s clip takes 10s to record.

const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.640028",
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

export function pickMime(preferWebm = false): string {
  // Large frames overrun the browser's H.264 (mp4) encoder level and silently
  // produce a 0-byte file; VP9/VP8 (webm) handle big resolutions reliably, so
  // prefer webm above ~1080p.
  const list = preferWebm ? MIME_CANDIDATES.filter((m) => m.includes("webm")) : MIME_CANDIDATES;
  for (const m of list) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

export class VideoRecorder {
  recording = false;

  /**
   * Records the live `source` canvas to a `width`×`height` video. The (square)
   * source is cover-fit into a 2D output canvas each frame and that canvas is
   * captured — far more reliable across browsers than streaming a WebGL canvas
   * directly, and it lets the output be any size / aspect ratio.
   */
  async record(
    source: HTMLCanvasElement,
    width: number,
    height: number,
    fps: number,
    seconds: number,
    onTick?: (progress: number) => void,
    audioStream?: MediaStream | null,
  ): Promise<{ blob: Blob; ext: string }> {
    // clamp to a size the browser encoders can actually handle (avoids 0-byte
    // files at very large sizes) and pick a codec that suits the resolution.
    const W = Math.max(2, Math.min(3840, Math.round(width)));
    const H = Math.max(2, Math.min(3840, Math.round(height)));
    // Always prefer WebM/VP9: one codec for every size means file size scales
    // with resolution (mp4/H.264 was both flipping the size ordering and failing
    // at large frames). Falls back to mp4 only where WebM recording is absent.
    const mime = pickMime(true);
    const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";

    const out = document.createElement("canvas");
    out.width = W;
    out.height = H;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, out.width, out.height);

    // cover-fit the square source into the (possibly non-square) output
    const draw = () => {
      const sw = source.width || 1, sh = source.height || 1;
      const scale = Math.max(out.width / sw, out.height / sh);
      const dw = sw * scale, dh = sh * scale;
      try { ctx.drawImage(source, (out.width - dw) / 2, (out.height - dh) / 2, dw, dh); } catch { /* not ready */ }
    };

    const stream = out.captureStream(fps);
    // mix in the soundscape's audio track(s) so the export has sound
    if (audioStream) for (const tr of audioStream.getAudioTracks()) stream.addTrack(tr);
    const chunks: Blob[] = [];
    // Scale the bitrate with the pixel count so bigger resolutions make bigger
    // files (~0.12 bits/pixel/frame), clamped to a range encoders accept.
    const bitrate = Math.min(60_000_000, Math.max(2_000_000, Math.round(W * H * fps * 0.12)));
    const mr = new MediaRecorder(stream, {
      mimeType: mime || undefined,
      videoBitsPerSecond: bitrate,
    });
    mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    mr.onerror = (e) => console.error("MediaRecorder error", e);
    const stopped = new Promise<Blob>((res) => {
      mr.onstop = () => res(new Blob(chunks, { type: mime || "video/webm" }));
    });

    this.recording = true;
    draw();
    mr.start(100);
    const start = performance.now();
    let raf = 0;
    const loop = () => { draw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    await new Promise<void>((resolve) => {
      const iv = setInterval(() => {
        const t = (performance.now() - start) / 1000;
        onTick?.(Math.min(1, t / seconds));
        if (t >= seconds) {
          clearInterval(iv);
          cancelAnimationFrame(raf);
          if (mr.state !== "inactive") { try { mr.requestData(); } catch { /* noop */ } mr.stop(); }
          resolve();
        }
      }, 100);
    });
    const blob = await stopped;
    this.recording = false;
    return { blob, ext };
  }
}
