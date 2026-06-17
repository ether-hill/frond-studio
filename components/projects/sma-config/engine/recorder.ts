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

export function pickMime(): string {
  for (const m of MIME_CANDIDATES) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

export class VideoRecorder {
  recording = false;

  async record(
    canvas: HTMLCanvasElement,
    fps: number,
    seconds: number,
    onTick?: (progress: number) => void,
  ): Promise<{ blob: Blob; ext: string }> {
    const mime = pickMime();
    const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
    const stream = (canvas as any).captureStream(fps) as MediaStream;
    const chunks: Blob[] = [];
    const mr = new MediaRecorder(stream, {
      mimeType: mime || undefined,
      videoBitsPerSecond: 24_000_000,
    });
    mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

    const stopped = new Promise<Blob>((res) => {
      mr.onstop = () => res(new Blob(chunks, { type: mime || "video/webm" }));
    });

    this.recording = true;
    mr.start(100);
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const iv = setInterval(() => {
        const t = (performance.now() - start) / 1000;
        onTick?.(Math.min(1, t / seconds));
        if (t >= seconds) {
          clearInterval(iv);
          if (mr.state !== "inactive") mr.stop();
          resolve();
        }
      }, 100);
    });
    const blob = await stopped;
    this.recording = false;
    return { blob, ext };
  }
}
