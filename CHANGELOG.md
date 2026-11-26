# Changelog

## 1.5.4

- Settings page simplified: compact header, a three-step quick guide with expandable detailed instructions, and collapsible cross-device / all-tasks cards.
- GitHub star button moved into the header row.

## 1.5.3

- Queue reliability: strict `remove` index, 100-item cap with done trimming, `reset` action/button for stuck `sent` items, startup recovery only for queues the user started, `resume` sends the next item, `failed` state (with auto-pause) on error/aborted turns, client session-race and read-error handling, and rpcId-only turn claims.

## 1.5.2

- Cross-device readiness: `hub.js` prints LAN addresses; Settings and **Test connection** warn when the hub URL is `127.0.0.1`/`localhost`; README checklist (reachable health URL, same room/token, distinct device names, files are not shared).
- The manager prompt now tells it to use `collab_remote` for workers on another device instead of creating a duplicate local worker.

## 1.5.1

- English title prefixes: `[Manager]` / `[Worker]` follow `language: en`; Chinese defaults stay for zh.
- Custom `prefixManager` / `prefixWorker` still override; switching language re-prefixes linked titles on reload.

## 1.5.0

- Conversation to-do queue for **any** conversation: pre-write a series of prompts; the next is sent when a turn ends; pause, resume and clear are supported.
- Renamed the displayed plugin to **协作待办 / Collab To-do** and rewrote the intro/descriptions to lead with collaboration, with the to-do queue as the supporting feature.
- Managers keep the stage queue for dispatching worker stages.

## 1.4.3

- Manager mode: right-click **Set as project manager (start)** creates a starter worker and sends the conversation a bootstrap instruction.
- The manager prompt now tells it to create workers itself, delegate execution, keep its context for review and dispatching, and confirm the goal before the first stage.

## 1.4.2

- The to-do list (stage queue) card is always visible; when the conversation is not a manager it explains how to make it one.
- Renamed the card to “阶段待办（To-do）” / “To-do list”.

## 1.4.1

- Moved the GitHub star button to the top of the Settings page.

## 1.4.0

- Settings page: **Cross-device** card (off / self-hosted hub / free ntfy.sh) with save, connection test, status, worker aliases and remote worker links.
- Settings page: **Stage queue** card — pre-write stages, start one, complete it to auto-dispatch the next, remove pending ones.
- Right-click a conversation → **Set as project manager (new worker)**, which creates and links a worker.
- Host: free ntfy.sh transport (chunked, room+token topic), `collab_stage`, explicit `relayMode: off` is honored, and `keepToken` on relay saves.

## 1.3.1

- Added a **Star on GitHub** button at the bottom of the Settings page.
- Added repository/homepage metadata so npm links back to the GitHub repo.

## 1.3.0

- Cross-device collaboration: `hub.js` relay plus `collab_remote` (`alias` on the worker device, `link` on the manager device).
- Remote reports capture the worker's final reply at turn end and are delivered to the manager like local reports.
- Fixed assistant text extraction (`data.message.content`) so relayed final output is not empty.

## 1.2.4

- Fixed the published client bundle registering `@local/collab-pair` instead of `dsh-collab-pair`; the Settings section mounts again.
- Added a publish-time sync script that derives the client id from the package name.

## 1.2.3

- Added `collab_worker_create`: create a named worker conversation with a preset/model, link it, and optionally dispatch the first round.

## 1.2.2

- `maxRounds: 0` (new default) means unlimited rounds per worker.
- Status/board report `maxRounds: null` when unlimited.

## 1.2.1

- Backfill the project name for links created before projects existed.

## 1.2.0

- Temporary links (auto-unbind on `collab_done`) and permanent links (stay until `collab_unlink`).
- Projects: a manager's workers share a project name, editable with `collab_project`; the board groups by project.

## 1.1.0

- Message language (`zh` / `en`) with a Settings selector and `/collab language`.
- Unattended runs: watchdog reminders, one relay retry, recovery after plugin reloads, cold-session resume.
- Visual task board with working state, wait time, and reminder counts.

## 1.0.1

- Fixes to the published bundle and install flow.

## 1.0.0

- Initial release: manager/worker links, multi-worker dispatch, report relay, title prefixes, settings page.
