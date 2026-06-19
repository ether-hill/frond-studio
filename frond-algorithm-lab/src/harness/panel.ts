import { Pane } from "tweakpane";
import type { ParamSchema, Params } from "../core/types";

// Auto-generates a Tweakpane control panel from a system's schema. Changing a
// param mutates the SHARED params object in place (so systems that hold the
// reference see "hot" changes live); cold params trigger a reset via the host.
//
// NOTE: Tweakpane 4's published .d.ts re-exports its API from `@tweakpane/core`,
// which isn't installed as a separate package — so the inherited Pane methods
// don't type-resolve. We shim the small slice we use; the runtime API is correct.

type TpEvent = { value: unknown };
interface Binding { on(ev: "change", cb: (e: TpEvent) => void): Binding; }
interface Button { on(ev: "click", cb: () => void): Button; }
interface PaneLike {
  addBinding(obj: object, key: string, opts?: Record<string, unknown>): Binding;
  addButton(opts: { title: string }): Button;
  addFolder(opts: { title: string; expanded?: boolean }): PaneLike;
  refresh(): void;
  dispose(): void;
}

export interface PanelHandlers {
  /** a non-seed param changed; `hot` = no reset needed (live), else reset. */
  onChange: (key: string, hot: boolean) => void;
  /** the seed string changed (typed or randomized). */
  onSeed: (seed: string) => void;
  randomSeed: () => string;
}

export interface PanelHandle {
  refresh: () => void;
  dispose: () => void;
  seedLocked: () => boolean;
}

export function buildPanel(
  container: HTMLElement,
  schema: ParamSchema,
  params: Params,
  handlers: PanelHandlers,
): PanelHandle {
  const pane = new Pane({ container }) as unknown as PaneLike;
  let locked = false;

  for (const key of Object.keys(schema)) {
    const spec = schema[key];
    const label = spec.type !== "seed" && spec.label ? spec.label : key;

    if (spec.type === "seed") {
      const seedF = pane.addFolder({ title: "seed", expanded: true });
      seedF.addBinding(params, key, { label: "value" }).on("change", (ev) => {
        if (!locked) handlers.onSeed(String(ev.value));
      });
      seedF.addButton({ title: "🎲 randomize" }).on("click", () => {
        if (locked) return;
        const s = handlers.randomSeed();
        (params as Record<string, string>)[key] = s;
        pane.refresh();
        handlers.onSeed(s);
      });
      seedF.addBinding({ lock: false }, "lock").on("change", (ev) => { locked = !!ev.value; });
      continue;
    }

    if (spec.type === "select") {
      const options: Record<string, string> = {};
      for (const o of spec.options) options[o] = o;
      pane.addBinding(params, key, { label, options }).on("change", () => handlers.onChange(key, spec.hot ?? false));
      continue;
    }
    if (spec.type === "number") {
      pane.addBinding(params, key, { label, min: spec.min, max: spec.max, step: spec.step }).on("change", () => handlers.onChange(key, spec.hot ?? false));
      continue;
    }
    if (spec.type === "int") {
      pane.addBinding(params, key, { label, min: spec.min, max: spec.max, step: 1 }).on("change", () => handlers.onChange(key, spec.hot ?? false));
      continue;
    }
    // bool + color (hex strings auto-detect as a colour picker in Tweakpane v4)
    pane.addBinding(params, key, { label }).on("change", () => handlers.onChange(key, spec.hot ?? false));
  }

  return {
    refresh: () => pane.refresh(),
    dispose: () => pane.dispose(),
    seedLocked: () => locked,
  };
}
