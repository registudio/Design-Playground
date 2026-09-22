/**
 * The live-preview slot queue, kept free of React so it can be tested directly.
 *
 * Every card in the gallery wants to run third-party code in a frame, and the page can
 * afford a fixed number at once. Cards ask for a slot when they come near, wait when
 * none is free, and are handed one — nearest first — when one frees up.
 *
 * Priority is distance: 0 for a card on screen, its pixel distance outside the scroller
 * otherwise, and negative for cards someone is pointing at or searched down to. Lower
 * is more urgent.
 *
 * Keyed by card throughout. An earlier version queued bare callbacks, so a card that
 * unmounted while waiting left one behind that later claimed a slot for a component no
 * longer on the page; after enough churn nothing could start at all.
 */
export interface SlotHolder {
  /** Current distance from the viewport; see above. */
  priority: () => number;
  /** True once the preview has reached a terminal state — cheaper to evict. */
  settled: () => boolean;
  /**
   * Called with the slot already taken back; the card should unmount its frame. Returns
   * true if it still wants a slot later — it is near, just not on screen — so it goes
   * back in the queue at its (now low) priority.
   */
  evict: () => boolean;
  /** Called when the card is granted a slot. */
  start: () => void;
}

export interface SlotQueue {
  /** Registers a mounted card. Must precede any request. */
  register: (id: string, holder: SlotHolder) => void;
  /** Forgets a card entirely — its slot, its place in the queue, its holder. */
  unregister: (id: string) => void;
  request: (id: string) => void;
  /** Gives up a slot or a place in the queue, keeping the card registered. */
  release: (id: string) => void;
  /** Re-balances: call when the set of cards on screen may have changed. */
  pump: () => void;
  isLive: (id: string) => boolean;
  isWaiting: (id: string) => boolean;
  liveCount: () => number;
}

export function createSlotQueue(capacity: number): SlotQueue {
  const holders = new Map<string, SlotHolder>();
  const live = new Set<string>();
  const waiting = new Set<string>();

  const priorityOf = (id: string) => holders.get(id)?.priority() ?? Infinity;

  /** Gives a free slot to the nearest waiting card. False when nobody is waiting. */
  const grantNext = (): boolean => {
    let next: string | undefined;
    let best = Infinity;
    for (const id of waiting) {
      const p = priorityOf(id);
      if (next === undefined || p < best) { best = p; next = id; }
    }
    if (next === undefined) return false;
    waiting.delete(next);
    const holder = holders.get(next);
    if (!holder) return true;
    live.add(next);
    holder.start();
    return true;
  };

  /**
   * Hands out free slots, then takes slots back from cards nobody is looking at for as
   * long as a card on screen is still waiting.
   *
   * First come, first served was the old rule: every card scrolled past kept its slot
   * through the grace period, and work still compiling was protected for up to 25
   * seconds more. At reading pace the slots were always held by the previous screenful,
   * so the cards actually on screen sat at "Queued" — in a measured pass through the
   * library, two in three of them never showed anything.
   *
   * It drains until no on-screen card is waiting rather than evicting once per request,
   * because not every card that ends up on screen asks again when it gets there: one
   * queued from the look-ahead margin can slide into view without crossing the
   * on-screen threshold, and with one eviction per request those cards lost every tie.
   *
   * Evicting an off-screen preview costs little: the compiled document is cached by the
   * route and the browser, and a compile in progress keeps running on the server when
   * its frame goes away, so coming back to a card is a cache hit rather than a restart.
   * Finished previews go first, then the farthest away. A card on screen is never
   * evicted.
   */
  const pump = (): void => {
    for (let guard = 0; guard <= capacity * 2 + waiting.size; guard += 1) {
      if (live.size < capacity) {
        if (!grantNext()) return;
        continue;
      }
      if (![...waiting].some((id) => priorityOf(id) <= 0)) return;
      let victim: string | undefined;
      let best = -Infinity;
      for (const id of live) {
        const holder = holders.get(id);
        const distance = holder?.priority() ?? Infinity;
        if (distance <= 0) continue;
        const score = distance + (holder?.settled() ? 1e6 : 0);
        if (score > best) { best = score; victim = id; }
      }
      if (victim === undefined) return;
      live.delete(victim);
      if (holders.get(victim)?.evict()) waiting.add(victim);
    }
  };

  return {
    register: (id, holder) => { holders.set(id, holder); },
    unregister: (id) => {
      waiting.delete(id);
      const wasLive = live.delete(id);
      holders.delete(id);
      if (wasLive) pump();
    },
    request: (id) => {
      if (live.has(id) || !holders.has(id)) return;
      waiting.add(id);
      pump();
    },
    release: (id) => {
      waiting.delete(id);
      if (live.delete(id)) pump();
    },
    pump,
    isLive: (id) => live.has(id),
    isWaiting: (id) => waiting.has(id),
    liveCount: () => live.size,
  };
}
