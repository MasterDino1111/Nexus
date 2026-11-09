
// WebRTC helpers for direct creator → viewer live streaming.
// Signalling runs through the LiveSignal entity (realtime subscription).

// STUN alone fails behind strict firewalls and mobile NAT. Set VITE_TURN_URL
// (comma separated), VITE_TURN_USERNAME and VITE_TURN_CREDENTIAL to add a TURN
// relay (e.g. coturn, Cloudflare Calls, Twilio).
export function buildIceServers(env = import.meta.env) {
  const servers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
  if (env.VITE_TURN_URL) {
    servers.push({
      urls: env.VITE_TURN_URL.split(",").map((u) => u.trim()).filter(Boolean),
      username: env.VITE_TURN_USERNAME,
      credential: env.VITE_TURN_CREDENTIAL,
    });
  }
  return servers;
}

const ICE_SERVERS = { iceServers: buildIceServers() };

// Reports "connected" | "disconnected" | "failed" so the UI can react.
// A short "disconnected" is normal during network changes, so wait a moment.
function watchConnection(pc, onState) {
  if (!onState) return;
  let timer;
  pc.addEventListener("connectionstatechange", () => {
    clearTimeout(timer);
    const state = pc.connectionState;
    if (state === "disconnected") timer = setTimeout(() => onState("failed"), 8000);
    else if (state === "failed") onState("failed");
    else if (state === "connected") onState("connected");
  });
}

function waitForIce(pc, timeout = 3500) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const done = () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timer);
        pc.removeEventListener("icegatheringstatechange", done);
        resolve();
      }
    };
    const timer = setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", done);
      resolve();
    }, timeout);
    pc.addEventListener("icegatheringstatechange", done);
  });
}

// Host side: send the camera/mic tracks and produce the offer.
export async function createHostConnection(mediaStream, onState) {
  const pc = new RTCPeerConnection(ICE_SERVERS);
  watchConnection(pc, onState);
  mediaStream.getTracks().forEach((track) => pc.addTrack(track, mediaStream));
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIce(pc);
  return { pc, sdp: pc.localDescription.sdp };
}

// Viewer side: answer the host offer and collect the incoming media.
export async function createViewerConnection(offerSdp, onStream, onState) {
  const pc = new RTCPeerConnection(ICE_SERVERS);
  watchConnection(pc, onState);
  const remote = new MediaStream();
  pc.ontrack = (event) => {
    event.streams[0]?.getTracks().forEach((t) => {
      if (!remote.getTracks().includes(t)) remote.addTrack(t);
    });
    onStream(remote);
  };
  await pc.setRemoteDescription({ type: "offer", sdp: offerSdp });
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitForIce(pc);
  return { pc, sdp: pc.localDescription.sdp };
}

export function closeConnection(pc) {
  try {
    pc?.close();
  } catch {
    // already closed
  }
}



export const canShareScreen = () =>
  typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

/**
 * Swaps the tracks that are already being sent to viewers (no new connection
 * and no new offer needed). `stream` provides the new video and audio track.
 */
export async function replaceOutgoingTracks(peerConnections, stream) {
  const tracks = { video: stream.getVideoTracks()[0], audio: stream.getAudioTracks()[0] };
  for (const pc of peerConnections) {
    for (const sender of pc.getSenders()) {
      const kind = sender.track?.kind;
      if (kind && tracks[kind]) await sender.replaceTrack(tracks[kind]).catch(() => {});
    }
  }
}

/**
 * Builds the stream viewers get while sharing the screen: the screen as video,
 * and the microphone mixed with the tab/system sound if the browser provides it.
 * `dispose()` releases the audio mixer.
 */
export function buildScreenStream(display, mic) {
  const video = display.getVideoTracks()[0];
  const micTrack = mic.getAudioTracks()[0];
  const sysTrack = display.getAudioTracks()[0];
  let ctx = null;
  let audio = micTrack;

  if (sysTrack && micTrack && typeof AudioContext !== "undefined") {
    ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    ctx.createMediaStreamSource(new MediaStream([micTrack])).connect(dest);
    ctx.createMediaStreamSource(new MediaStream([sysTrack])).connect(dest);
    audio = dest.stream.getAudioTracks()[0];
  } else if (sysTrack && !micTrack) {
    audio = sysTrack;
  }

  const stream = new MediaStream([video, ...(audio ? [audio] : [])]);
  return { stream, dispose: () => ctx?.close().catch(() => {}) };
}
