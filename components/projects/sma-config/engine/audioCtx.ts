// One shared AudioContext for the whole app. Sonification output and audio input
// must use the SAME context — creating a second AudioContext while one is running
// causes the new context's media playback to hang in some browsers.

let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}
