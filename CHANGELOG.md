# Changelog

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
