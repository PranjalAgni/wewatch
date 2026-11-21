// Integration tests: only sockets that have joined a room may act on it.
// Requires a reachable DATABASE_URL (see apps/server/.env).
import "dotenv/config";
import { test, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { io } from "socket.io-client";

const PORT = 4100 + Math.floor(Math.random() * 500);
const BASE = `http://localhost:${PORT}`;
const serverEntry = fileURLToPath(new URL("../src/index.js", import.meta.url));
let server;
const openSockets = [];

before(async () => {
  server = spawn(process.execPath, [serverEntry], {
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "test", CORS_ORIGIN: "" },
    stdio: ["ignore", "pipe", "inherit"],
  });
  await new Promise((resolve, reject) => {
    server.once("exit", (c) => reject(new Error(`server exited early (${c})`)));
    server.stdout.on("data", (d) => d.toString().includes("listening") && resolve());
  });
});

afterEach(() => openSockets.splice(0).forEach((s) => s.close()));
after(() => server?.kill());

async function createRoom() {
  const res = await fetch(`${BASE}/api/room/create`, { method: "POST" });
  return (await res.json()).roomCode;
}

function connect() {
  const s = io(BASE, { transports: ["websocket"], forceNew: true });
  openSockets.push(s);
  return new Promise((resolve) => s.on("connect", () => resolve(s)));
}

function nextEvent(socket, event, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, (data) => { clearTimeout(t); resolve(data); });
  });
}

// Resolves to the events `socket` receives during `ms`.
function collect(socket, events, ms = 400) {
  const got = [];
  const handlers = events.map((e) => [e, (d) => got.push([e, d])]);
  handlers.forEach(([e, h]) => socket.on(e, h));
  return new Promise((resolve) =>
    setTimeout(() => { handlers.forEach(([e, h]) => socket.off(e, h)); resolve(got); }, ms)
  );
}

async function joinedMember(code, username) {
  const s = await connect();
  const snapshot = nextEvent(s, "SNAPSHOT");
  s.emit("join", { code, username });
  await snapshot;
  return s;
}

test("joining sends snapshot, chat history and users list", async () => {
  const code = await createRoom();
  const s = await connect();
  const snapshot = nextEvent(s, "SNAPSHOT");
  const history = nextEvent(s, "CHAT_HISTORY");
  const users = nextEvent(s, "USERS_LIST");
  s.emit("join", { code, username: "alice" });

  assert.equal((await snapshot).playerState, -1);
  assert.deepEqual(await history, []);
  assert.deepEqual((await users).users.map((u) => u.username), ["alice"]);
});

test("non-member cannot control playback, chat, or read room data", async () => {
  const code = await createRoom();
  const member = await joinedMember(code, "alice");
  const outsider = await connect();

  const memberGot = collect(member, ["SET_VIDEO", "PAUSE", "SEEK", "CHAT"]);
  const outsiderGot = collect(outsider, ["CHAT_HISTORY", "USERS_LIST", "ERROR"]);

  outsider.emit("control", { code, type: "SET_VIDEO", payload: { videoId: "dQw4w9WgXcQ" } });
  outsider.emit("control", { code, type: "PAUSE", payload: { position: 42 } });
  outsider.emit("chat", { code, message: { username: "alice", content: "spoofed" } });
  outsider.emit("GET_CHATS", { code });
  outsider.emit("GET_USERS", { code });

  assert.deepEqual(await memberGot, []);
  const got = await outsiderGot;
  assert.deepEqual(got.filter(([e]) => e !== "ERROR"), []);
  assert.ok(got.some(([e]) => e === "ERROR"), "outsider should be told to join first");
});

test("members can control playback and chat under their joined name", async () => {
  const code = await createRoom();
  const alice = await joinedMember(code, "alice");
  const bob = await joinedMember(code, "bob");

  const pause = nextEvent(alice, "PAUSE");
  bob.emit("control", { code, type: "PAUSE", payload: { position: 12 } });
  assert.equal((await pause).position, 12);

  const chat = nextEvent(alice, "CHAT");
  bob.emit("chat", { code, message: { username: "alice", content: "hi" } });
  const msg = await chat;
  assert.equal(msg.content, "hi");
  assert.equal(msg.username, "bob", "server must use the joined name, not the client-supplied one");
});
