import { describe, expect, it } from "vitest";
import { commit, undo, redo, emptyHistory, canUndo, canRedo } from "@/store/history";

interface Doc {
  radius: number;
  name: string;
  nested: { depth: number };
}

const doc = (): Doc => ({ radius: 8, name: "a", nested: { depth: 1 } });

describe("history", () => {
  it("records and undoes a change", () => {
    const first = commit(doc(), emptyHistory(), "Set radius", (d) => { d.radius = 16; });
    expect(first.state.radius).toBe(16);
    const back = undo(first.state, first.history);
    expect(back.state.radius).toBe(8);
  });

  it("redoes an undone change", () => {
    const first = commit(doc(), emptyHistory(), "Set radius", (d) => { d.radius = 16; });
    const back = undo(first.state, first.history);
    const forward = redo(back.state, back.history);
    expect(forward.state.radius).toBe(16);
  });

  it("records nothing when the recipe changes nothing", () => {
    const start = doc();
    const result = commit(start, emptyHistory(), "No-op", (d) => { d.radius = 8; });
    expect(result.state).toBe(start);
    expect(canUndo(result.history)).toBe(false);
  });

  it("coalesces a slider drag into one undo step", () => {
    let state = doc();
    let history = emptyHistory();
    // Simulates a drag emitting many values in quick succession.
    for (const value of [9, 10, 11, 12, 13, 14, 15, 16]) {
      const result = commit(state, history, "Set radius", (d) => { d.radius = value; }, "radius");
      state = result.state;
      history = result.history;
    }
    expect(state.radius).toBe(16);
    expect(history.past).toHaveLength(1);

    // One undo must return to before the drag started, not to the previous frame.
    const back = undo(state, history);
    expect(back.state.radius).toBe(8);
  });

  it("keeps edits to different controls as separate steps", () => {
    const a = commit(doc(), emptyHistory(), "Radius", (d) => { d.radius = 16; }, "radius");
    const b = commit(a.state, a.history, "Name", (d) => { d.name = "b"; }, "name");
    expect(b.history.past).toHaveLength(2);
  });

  it("collapses a multi-field change such as applying a preset into one step", () => {
    const result = commit(doc(), emptyHistory(), "Apply preset", (d) => {
      d.radius = 2;
      d.name = "editorial";
      d.nested.depth = 9;
    });
    expect(result.history.past).toHaveLength(1);
    const back = undo(result.state, result.history);
    expect(back.state).toEqual(doc());
  });

  it("clears the redo stack once a new edit lands", () => {
    const first = commit(doc(), emptyHistory(), "One", (d) => { d.radius = 16; });
    const back = undo(first.state, first.history);
    expect(canRedo(back.history)).toBe(true);
    const next = commit(back.state, back.history, "Two", (d) => { d.name = "c"; });
    expect(canRedo(next.history)).toBe(false);
  });

  it("is a no-op at the ends of the stack", () => {
    const start = doc();
    expect(undo(start, emptyHistory()).state).toBe(start);
    expect(redo(start, emptyHistory()).state).toBe(start);
  });

  it("survives a long undo-redo round trip", () => {
    let state = doc();
    let history = emptyHistory();
    for (let i = 0; i < 20; i++) {
      const result = commit(state, history, `Step ${i}`, (d) => { d.nested.depth = i; });
      state = result.state;
      history = result.history;
    }
    for (let i = 0; i < 20; i++) {
      const result = undo(state, history);
      state = result.state;
      history = result.history;
    }
    expect(state).toEqual(doc());
  });
});
