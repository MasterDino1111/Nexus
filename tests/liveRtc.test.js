import { describe, it, expect } from "vitest";
import { buildIceServers } from "../src/lib/liveRtc.js";

describe("buildIceServers", () => {
  it("uses STUN only by default", () => {
    const s = buildIceServers({});
    expect(s.every((x) => String(x.urls).startsWith("stun:"))).toBe(true);
  });
  it("adds a TURN relay when configured", () => {
    const s = buildIceServers({ VITE_TURN_URL: "turn:a.example:3478, turns:a.example:5349", VITE_TURN_USERNAME: "u", VITE_TURN_CREDENTIAL: "p" });
    const turn = s.at(-1);
    expect(turn.urls).toEqual(["turn:a.example:3478", "turns:a.example:5349"]);
    expect(turn.username).toBe("u");
  });
});

import { replaceOutgoingTracks } from "../src/lib/liveRtc.js";

describe("replaceOutgoingTracks", () => {
  const sender = (kind) => ({ track: { kind }, replaceTrack: async function (t) { this.track = t; } });
  const fakeStream = (v, a) => ({ getVideoTracks: () => [v], getAudioTracks: () => (a ? [a] : []) });

  it("swaps video and audio on every connection", async () => {
    const s1 = [sender("video"), sender("audio")];
    const s2 = [sender("video"), sender("audio")];
    const conns = [{ getSenders: () => s1 }, { getSenders: () => s2 }];
    const v = { kind: "video", id: "screen" };
    const a = { kind: "audio", id: "mix" };
    await replaceOutgoingTracks(conns, fakeStream(v, a));
    expect(s1[0].track).toBe(v);
    expect(s2[1].track).toBe(a);
  });

  it("keeps the old audio when the new stream has none", async () => {
    const s = [sender("video"), sender("audio")];
    const old = s[1].track;
    await replaceOutgoingTracks([{ getSenders: () => s }], fakeStream({ kind: "video" }, null));
    expect(s[1].track).toBe(old);
  });
});
