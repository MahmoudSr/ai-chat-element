import { describe, expect, it } from 'vitest';
import { DEFAULT_LABELS } from '../src/labels.ts';

/**
 * The playground's data files are plain JS the suite otherwise never loads, so
 * a syntax slip in them broke the whole playground while every test stayed
 * green. Import them for real, and keep their scenario/label lists honest.
 */
describe('playground data files', () => {
  it('scenarios.js loads and every scenario is a stream', async () => {
    const { SCENARIOS } = await import('../examples/scenarios.js');
    const streams = Object.entries(SCENARIOS).filter(([k]) => k !== 'sampleReply');
    expect(streams.length).toBeGreaterThan(5);
    for (const [name, fn] of streams) {
      expect(typeof (fn as (...a: unknown[]) => unknown)([], new AbortController().signal)[Symbol.asyncIterator], name).toBe('function');
    }
  });

  it('controls.js loads, offers every scenario, and its label controls are real labels', async () => {
    const { CONTROLS } = await import('../examples/controls.js');
    const { SCENARIOS } = await import('../examples/scenarios.js');
    type Control = { kind: string; key: string; options?: [string, string][] | (() => unknown) };
    const list = CONTROLS as Control[];
    const scenarioControl = list.find((c) => Array.isArray(c.options) && c.options.some(([v]) => v === 'xss'))!;
    const offered = (scenarioControl.options as [string, string][]).map(([v]) => v);
    // `error` is driven by the "Fail next request" button, not the dropdown.
    for (const name of Object.keys(SCENARIOS).filter((k) => k !== 'sampleReply' && k !== 'error')) {
      expect(offered, `scenario "${name}" is in the dropdown`).toContain(name);
    }
    for (const c of list.filter((c) => c.kind === 'label')) {
      expect(DEFAULT_LABELS, `label control "${c.key}"`).toHaveProperty(c.key);
    }
  });
});
