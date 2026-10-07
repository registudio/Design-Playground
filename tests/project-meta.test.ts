import { describe, expect, it } from "vitest";
import { normaliseMeta } from "@/store/persistence";

describe("project metadata read from storage", () => {
  it("fills tags, archived and client on records written before they existed", () => {
    const [meta] = normaliseMeta([{ id: "a", name: "Old", createdAt: 1, updatedAt: 2 }]);
    expect(meta).toEqual({ id: "a", name: "Old", client: "", createdAt: 1, updatedAt: 2, tags: [], archived: false });
  });

  it("keeps current records as they are and drops ones that cannot be read", () => {
    const current = { id: "b", name: "New", client: "Acme", createdAt: 1, updatedAt: 2, tags: ["x"], archived: true };
    expect(normaliseMeta([current, { id: "c" }, null])).toEqual([current]);
  });
});
