# Bombadil property-based UI tests

[Bombadil](https://antithesishq.github.io/bombadil/) explores the WeWatch web
app at random (clicks, typing, navigation, plus our custom actions) and checks
the properties in `spec.ts` in every state it sees.

## Running

Start the app first (web on :3000, server on :4000, Postgres running):

```sh
npm run dev
```

Then, from the repo root:

| Command                      | What it does                                                |
| ---------------------------- | ----------------------------------------------------------- |
| `npm run bombadil`           | Headless 2 minute run, stops at the first violation          |
| `npm run bombadil:watch`     | Visible browser window, 5 minute run                         |
| `npm run bombadil:inspect`   | Open the last trace (`bombadil-output`) in the inspector UI  |
| `npm run bombadil:typecheck` | Type-check `spec.ts`                                         |

Exit codes: `0` no violations, `2` property violated, `1` other error.

On a violation Bombadil prints a `--reproduce` command that replays the same
action sequence.

Chrome is launched through `chrome-muted.sh` (via the `CHROME` env var), so
the YouTube videos the fuzzer plays stay silent. Set `REAL_CHROME` to use a
different Chrome or Chromium binary.

## What is checked

Default properties: no uncaught exceptions, no unhandled promise rejections,
no `console.error`, and no HTTP 4xx/5xx document responses.

WeWatch-specific properties:

- `roomNotStuckPreparing` - the "Preparing room..." spinner always comes with the nickname modal
- `connectsAfterJoining` - the socket connects within 10s of joining
- `watchingCountMatchesAvatars` - the "N watching" count equals the number of avatars shown
- `selfShownExactlyOnce` - the current user is listed as "You" exactly once
- `selfEventuallyListed` - once connected, the current user shows up in the list within 5s
- `sentChatIsDelivered` - a sent chat message shows up within 5s (unless you left the room or disconnected)

Custom actions (`joinRoom`, `setVideo`, `sendChat`) feed in realistic
nicknames, YouTube URLs and chat messages, because random typing would
almost never hit them.
