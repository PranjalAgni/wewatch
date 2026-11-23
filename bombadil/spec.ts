// Bombadil specification for WeWatch.
// Docs: https://antithesishq.github.io/bombadil/
//
// Run with `npm run bombadil` (see bombadil/README.md).

import { always, eventually, now } from "@antithesishq/bombadil";
import {
  actions,
  extract,
  registerCustomAction,
  type ActionTemplate,
  weighted,
} from "@antithesishq/bombadil/browser";
import {
  clicks,
  inputs,
  navigation,
  scroll,
  waitOnce,
} from "@antithesishq/bombadil/browser/defaults/actions";

// Generic properties: no uncaught exceptions, no unhandled rejections,
// no console errors, no HTTP 4xx/5xx document responses.
export * from "@antithesishq/bombadil/browser/defaults/properties";

// ---------------------------------------------------------------------------
// Helpers (run inside the browser)
// ---------------------------------------------------------------------------

const PENDING_CHAT_KEY = "__bombadilPendingChat";

// React tracks input values itself, so assigning `.value` is not enough to
// trigger onChange. Use the native setter, then dispatch an input event.
function setReactInputValue(
  input: HTMLInputElement,
  value: string,
): void {
  const proto = Object.getPrototypeOf(input) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (!setter) throw new Error("HTMLInputElement value setter not found");
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function findInput(document: Document, placeholder: string) {
  return document.querySelector<HTMLInputElement>(
    `input[placeholder^="${placeholder}"]`,
  );
}

// ---------------------------------------------------------------------------
// Extractors
// ---------------------------------------------------------------------------

const onRoomPage = extract((state) =>
  /^\/room\/[^/]+/.test(state.window.location.pathname),
);

const usernameModalOpen = extract(
  (state) => state.document.querySelector("#username") !== null,
);

const preparingRoom = extract((state) =>
  (state.document.body?.innerText ?? "").includes("Preparing room..."),
);

// "User: <name>" in the room header, present once a nickname is submitted.
const joinedAs = extract((state) => {
  const header = Array.from(state.document.querySelectorAll("main div.text-sm"))
    .map((el) => el.textContent ?? "")
    .find((text) => text.startsWith("Room:"));
  const match = header?.match(/User:\s*(.+)$/);
  return match ? match[1].trim() : null;
});

const connected = extract((state) =>
  (state.document.body?.innerText ?? "").includes("● connected"),
);

// "N watching" counter and the avatar labels rendered beneath it.
const watching = extract((state) => {
  const counter = Array.from(state.document.querySelectorAll("div")).find(
    (el) => /^\d+ watching$/.test(el.textContent?.trim() ?? ""),
  );
  if (!counter) return null;
  const count = parseInt(counter.textContent!.trim(), 10);
  const labels = Array.from(
    counter.nextElementSibling?.querySelectorAll("span[title]") ?? [],
  ).map((el) => el.textContent ?? "");
  return { count, labels };
});

const chatTexts = extract((state) =>
  Array.from(state.document.querySelectorAll("aside div.text-sm.break-words")).map(
    (el) => el.textContent ?? "",
  ),
);

// The last chat message sent by the `sendChat` action, tagged with the room it
// was sent in. Next.js client-side navigation keeps the same `window`, so the
// room tag is needed to tell messages from different rooms apart.
const pendingChat = extract((state) => {
  const value = (state.window as unknown as Record<string, unknown>)[
    PENDING_CHAT_KEY
  ] as { room?: unknown; text?: unknown } | undefined;
  return value && typeof value.room === "string" && typeof value.text === "string"
    ? { room: value.room, text: value.text }
    : null;
});

const currentPath = extract((state) => state.window.location.pathname);

const canSetVideo = extract((state) => {
  const button = Array.from(state.document.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === "Set Video",
  );
  return !!button && !button.disabled;
});

const canChat = extract((state) => {
  const input = findInput(state.document, "Type a message");
  return !!input && !input.disabled;
});

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

// The room page must never be stuck on the "Preparing room..." spinner
// without the nickname modal giving the user a way forward.
export const roomNotStuckPreparing = always(
  () => !(onRoomPage.current && preparingRoom.current) || usernameModalOpen.current,
);

// After joining a room the socket connects within a reasonable time.
export const connectsAfterJoining = always(
  now(() => joinedAs.current !== null).implies(
    eventually(() => connected.current || joinedAs.current === null).within(
      10,
      "seconds",
    ),
  ),
);

// The "N watching" counter always matches the avatars rendered.
export const watchingCountMatchesAvatars = always(
  () => watching.current === null || watching.current.count === watching.current.labels.length,
);

// The current user is shown exactly once as "You".
export const selfShownExactlyOnce = always(
  () =>
    watching.current === null ||
    watching.current.count === 0 ||
    watching.current.labels.filter((l) => l === "You").length === 1,
);

// Once connected, the current user eventually shows up in the watcher list.
export const selfEventuallyListed = always(
  now(() => connected.current && joinedAs.current !== null).implies(
    eventually(
      () =>
        !connected.current ||
        (watching.current?.labels.includes("You") ?? false),
    ).within(5, "seconds"),
  ),
);

// A chat message we sent eventually appears in the chat list (unless we left
// the room or lost the connection in the meantime).
// A chat message we sent eventually appears in the chat list, unless we left
// that room or lost the connection in the meantime.
export const sentChatIsDelivered = always(() => {
  const sent = pendingChat.current;
  return now(() => sent !== null).implies(
    eventually(
      () =>
        sent === null ||
        currentPath.current !== sent.room ||
        !connected.current ||
        chatTexts.current.includes(sent.text),
    ).within(5, "seconds"),
  );
});

// ---------------------------------------------------------------------------
// Custom actions: give the fuzzer meaningful inputs it would rarely guess.
// ---------------------------------------------------------------------------

const NICKNAMES = ["alice", "bob", "Ελένη", "李雷", "🎬 fan", "a".repeat(20)];
const VIDEOS = [
  "dQw4w9WgXcQ",
  "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  "https://youtu.be/9bZkp7q19f0",
];
const CHAT_MESSAGES = ["hello", "😀🎉", "<b>not bold</b>", "a longer message ".repeat(8)];

const joinRoom = registerCustomAction(
  "joinRoom",
  async (document, window, nickname: string) => {
    const input = document.querySelector<HTMLInputElement>("#username");
    if (!input) throw new Error("nickname input not found");
    setReactInputValue(input, nickname);
    await new Promise((r) => window.setTimeout(r, 0));
    input.form?.requestSubmit();
  },
);

const setVideo = registerCustomAction(
  "setVideo",
  async (document, window, video: string) => {
    const input = findInput(document, "Paste YouTube URL or ID");
    if (!input) throw new Error("video input not found");
    setReactInputValue(input, video);
    await new Promise((r) => window.setTimeout(r, 0));
    input.form?.requestSubmit();
  },
);

const sendChat = registerCustomAction(
  "sendChat",
  async (document, window, text: string) => {
    const input = findInput(document, "Type a message");
    if (!input) throw new Error("chat input not found");
    // Make each message unique so delivery can be checked unambiguously.
    const message = `${text} #${Math.floor(Math.random() * 1e9)}`;
    setReactInputValue(input, message);
    await new Promise((r) => window.setTimeout(r, 0));
    (window as unknown as Record<string, unknown>)[PENDING_CHAT_KEY] = {
      room: window.location.pathname,
      text: message.trim(),
    };
    input.form?.requestSubmit();
  },
);

const wewatchActions = actions(() => {
  const available: ActionTemplate[] = [];
  if (usernameModalOpen.current) {
    available.push(...NICKNAMES.map((n) => joinRoom(n)));
  }
  if (canSetVideo.current) {
    available.push(...VIDEOS.map((v) => setVideo(v)));
  }
  if (canChat.current) {
    available.push(...CHAT_MESSAGES.map((m) => sendChat(m)));
  }
  return available;
});

// ---------------------------------------------------------------------------
// Action mix
// ---------------------------------------------------------------------------

export const actionMix = weighted([
  [100, clicks],
  [60, inputs],
  [40, wewatchActions],
  [20, scroll],
  [10, navigation],
  [5, waitOnce],
]);
