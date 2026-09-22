import { describe, expect, it } from "vitest";
import { createSlotQueue } from "@/elements/preview-queue";

/**
 * A stand-in card: its distance from the viewport can be moved like a scroll would, and
 * it records what the queue told it to do.
 */
function card(distance: number, { settled = false, near = true } = {}) {
  const state = { distance, settled, near, started: 0, evicted: 0 };
  return {
    state,
    holder: {
      priority: () => state.distance,
      settled: () => state.settled,
      start: () => { state.started += 1; },
      evict: () => { state.evicted += 1; return state.near; },
    },
  };
}

function fill(capacity: number, distance: number, settled = true) {
  const queue = createSlotQueue(capacity);
  const cards = Array.from({ length: capacity }, (_, i) => {
    const c = card(distance, { settled });
    queue.register(`held-${i}`, c.holder);
    queue.request(`held-${i}`);
    return c;
  });
  return { queue, cards };
}

describe("preview slot queue", () => {
  it("starts a card straight away while there is room", () => {
    const queue = createSlotQueue(2);
    const a = card(0);
    queue.register("a", a.holder);
    queue.request("a");
    expect(a.state.started).toBe(1);
    expect(queue.isLive("a")).toBe(true);
  });

  it("makes a card that is only near wait rather than take a slot from anyone", () => {
    const { queue, cards } = fill(3, 500);
    const near = card(200);
    queue.register("near", near.holder);
    queue.request("near");
    expect(near.state.started).toBe(0);
    expect(queue.isWaiting("near")).toBe(true);
    expect(cards.every((c) => c.state.evicted === 0)).toBe(true);
  });

  it("gives a card on screen a slot taken from one scrolled past", () => {
    // The starvation this exists to fix: every slot held by the previous screenful.
    const { queue, cards } = fill(3, 400);
    const visible = card(0);
    queue.register("visible", visible.holder);
    queue.request("visible");
    expect(visible.state.started).toBe(1);
    expect(cards.filter((c) => c.state.evicted === 1)).toHaveLength(1);
    expect(queue.liveCount()).toBe(3);
  });

  it("evicts a finished preview before one still compiling, then the farthest", () => {
    const queue = createSlotQueue(3);
    const compilingFar = card(900, { settled: false });
    const doneNear = card(100, { settled: true });
    const doneFar = card(600, { settled: true });
    for (const [id, c] of [["compilingFar", compilingFar], ["doneNear", doneNear], ["doneFar", doneFar]] as const) {
      queue.register(id, c.holder);
      queue.request(id);
    }
    const visible = card(0);
    queue.register("visible", visible.holder);
    queue.request("visible");
    expect(doneFar.state.evicted).toBe(1);
    expect(doneNear.state.evicted).toBe(0);
    expect(compilingFar.state.evicted).toBe(0);
  });

  it("never evicts a card that is on screen", () => {
    const { queue, cards } = fill(3, 0);
    const another = card(0);
    queue.register("another", another.holder);
    queue.request("another");
    expect(another.state.started).toBe(0);
    expect(cards.every((c) => c.state.evicted === 0)).toBe(true);
  });

  it("serves every card that slid on screen, not just the one that asked", () => {
    // Cards queued from the look-ahead margin can arrive on screen without asking again.
    // With one eviction per request they lost every tie and stayed "Queued".
    const { queue } = fill(4, 700);
    const quiet = [card(300), card(300), card(300)];
    quiet.forEach((c, i) => { queue.register(`quiet-${i}`, c.holder); queue.request(`quiet-${i}`); });
    expect(quiet.every((c) => c.state.started === 0)).toBe(true);

    // A scroll brings all three on screen together with one newcomer, which alone asks.
    quiet.forEach((c) => { c.state.distance = 0; });
    const asker = card(0);
    queue.register("asker", asker.holder);
    queue.request("asker");

    expect(asker.state.started).toBe(1);
    expect(quiet.every((c) => c.state.started === 1)).toBe(true);
  });

  it("puts an evicted card that is still near back in line, and drops one that is not", () => {
    const queue = createSlotQueue(2);
    const stillNear = card(250, { near: true });
    const gone = card(900, { near: false });
    queue.register("stillNear", stillNear.holder); queue.request("stillNear");
    queue.register("gone", gone.holder); queue.request("gone");

    const a = card(0); queue.register("a", a.holder); queue.request("a");
    const b = card(0); queue.register("b", b.holder); queue.request("b");

    expect(queue.isWaiting("stillNear")).toBe(true);
    expect(queue.isWaiting("gone")).toBe(false);
  });

  it("hands a freed slot to the nearest waiting card", () => {
    const { queue } = fill(1, 50, false);
    const far = card(800); queue.register("far", far.holder); queue.request("far");
    const close = card(120); queue.register("close", close.holder); queue.request("close");
    queue.release("held-0");
    expect(close.state.started).toBe(1);
    expect(far.state.started).toBe(0);
  });

  it("frees a slot, and forgets a waiting card, when a card unmounts", () => {
    const { queue } = fill(1, 50, false);
    const waiter = card(10); queue.register("waiter", waiter.holder); queue.request("waiter");
    queue.unregister("held-0");
    expect(waiter.state.started).toBe(1);

    const leaver = card(20); queue.register("leaver", leaver.holder); queue.request("leaver");
    queue.unregister("leaver");
    queue.release("waiter");
    expect(leaver.state.started).toBe(0);
  });

  it("ignores a request from a card that never registered", () => {
    const queue = createSlotQueue(1);
    queue.request("ghost");
    expect(queue.isWaiting("ghost")).toBe(false);
    expect(queue.liveCount()).toBe(0);
  });
});
