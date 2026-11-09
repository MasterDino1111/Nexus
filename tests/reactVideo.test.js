import { describe, it, expect } from "vitest";
import { currentReaction } from "../src/backend/reactVideo.js";

describe("currentReaction", () => {
  it("is none without records", () => expect(currentReaction([])).toBe("none"));
  it("treats old records without type as likes", () => expect(currentReaction([{ id: "1" }])).toBe("like"));
  it("detects a dislike", () => expect(currentReaction([{ type: "dislike" }])).toBe("dislike"));
  it("a dislike wins if duplicate records exist", () => {
    expect(currentReaction([{ type: "like" }, { type: "dislike" }])).toBe("dislike");
  });
});
