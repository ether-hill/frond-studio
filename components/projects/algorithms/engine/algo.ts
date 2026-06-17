// Shared engine interface so the master Algorithm chooser can swap between very
// different generative systems (Physarum, Reaction–Diffusion, Flow Field, …).
// Each algorithm owns its own GPU engine, parameters and presets.

export interface Engine {
  readonly is3D: boolean;
  paused: boolean;
  render(): void;
  reset(): void;
  setParams(p: any): void;
  agentCount(): number;
  dispose(): void;
  setMouse?(x: number, y: number, active: boolean): void;
  setView?(yaw: number, pitch: number): void;
  yaw?: number;
  pitch?: number;
}

export interface Preset {
  id: string;
  label: string;
  blurb: string;
  params: Record<string, any>;
}
