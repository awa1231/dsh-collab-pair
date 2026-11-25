# dsh-collab-pair

> A DSH collaboration plugin for large projects: link a project-manager conversation to local or remote workers, dispatch rounds, relay results and manage stages. It also provides a prompt to-do queue for any conversation: pre-write several prompts and the next one is sent when a turn ends.

[**GitHub**](https://github.com/awa1231/dsh-collab-pair) · [Give it a star ★](https://github.com/awa1231/dsh-collab-pair)

## Install

```bash
dsh plugin add dsh-collab-pair
```

Or install `dsh-collab-pair` from the DSH plugin manager, refresh the page, and open **Settings → Collaboration pair**. The settings UI ships English and Chinese and follows the app language.

**The plugin only links conversations.** Goals, task breakdown, and acceptance criteria stay with the project manager; the plugin never asks for them again.

One manager can run several workers, each with its own round counter:

```
Project manager (owns the goal, breakdown, acceptance)
   │  collab_dispatch(worker="A") — round N
   ▼
Worker A / Worker B / … (execute the task, then collab_report)
   │  the worker turn ends → the plugin captures report + final output
   ▼
Manager receives a collaboration report → next round for that worker, or collab_done
```

## Visual settings page

**Settings → Collaboration pair**, top to bottom:

1. **Working conversation** — the conversation to act on (defaults to the open one).
2. **Current conversation · <title>** — this conversation's own links and status first:
   - Project manager: the workers it manages (state, round, current task, latest report, unlink) plus a form to link another worker.
   - Worker: its manager, current task, state, latest report, and a "Leave" action.
   - Not linked: the link form.
3. **All tasks** — a board across every collaboration, grouped by **project**. Each row shows the worker, round, **working state** (`Working` / `Waiting for report` / `Idle` / `Finished`), waiting time, current task, and latest report. Refresh re-reads it.
4. **Cross-device** — relay mode (off / self-hosted hub / free ntfy.sh), URL, room, token and device name; save/test, connection status, worker alias registration, and remote-worker linking.
5. **Stage queue** (manager only) — pick a worker, add a stage title/prompt/acceptance, then start it, complete it (auto-dispatches the next), or remove a pending one.
6. **Conversation to-do** (any other conversation) — pre-write a series of prompts; the first is sent when you press start, and the next is sent when the current turn ends. Pause, resume, or clear pending items.

Right-click a conversation in the sidebar and choose **Set as project manager (start)**: the plugin creates and links a starter worker, then sends that conversation a manager-mode instruction to create more workers itself and delegate the execution.

### Manager mode

Once a conversation is a manager, its prompt tells it to:

- create workers itself with `collab_worker_create` instead of waiting for the human to do it;
- delegate execution and keep its own context for reviewing reports and dispatching again — it should not spend a long turn doing a worker's job;
- confirm the project goal before creating workers and dispatching the first stage.

The manager card also shows the **project name** and lets you rename it.

The header also has a **Message language** selector (中文 / English). It switches the generated collaboration messages; the page labels follow the app language.

The page only links, unlinks, and reports status. Goals, tasks, and acceptance stay in the manager conversation.

## Language

- The settings page follows the app language; English and Chinese ship in the package.
- Generated collaboration messages follow the `language` config (`zh` or `en`, default `zh`). Switch it in the page header (**Message language**) or with `/collab language en`. The command persists the config and reloads the plugin.

## Unattended runs

Once a round is dispatched, the worker finishing wakes the manager automatically; the settings page does not need to stay open. For long projects:

- `autoNudge` (default on) wakes an idle manager when a worker makes no progress for `nudgeAfterMinutes` (default 20), up to `maxNudges` times (default 3), then leaves it to a human.
- A failed relay to the manager is retried once after a minute.
- Links survive plugin reloads and DSH restarts; a cold session is resumed when it needs the next message.

Set `autoNudge: false` to disable reminders.

## Cross-device collaboration

DSH is local-first: the signed-in account identifies devices but does not relay messages between them, so the plugin ships a tiny relay hub and connects **out** to it. That works across networks with a tunnel, and no inbound port is needed on worker devices.

On one machine or a small VPS (the hub keeps recent messages in memory only):

```bash
node node_modules/dsh-collab-pair/hub.js --port 8787 --token <long-random-secret>
# expose it with HTTPS, e.g.
cloudflared tunnel --url http://127.0.0.1:8787
```

On **both** devices, set the same `hubUrl`, `hubToken` and `hubRoom`, and a distinct `deviceName`:

```yaml
hubUrl: https://your-tunnel.example
hubRoom: my-project
hubToken: <the same secret>
deviceName: desktop   # or laptop
```

On the worker device, in the conversation that should work remotely:

```text
collab_remote({ action: "alias", alias: "frontend" })
```

On the manager device:

```text
collab_remote({ action: "link", device: "laptop", worker: "frontend", name: "前端" })
collab_dispatch({ worker: "前端", task: "…" })
```

The manager dispatches through the hub; the worker device prompts its local conversation, captures the final reply at turn end, and sends it back. `collab_done` / `collab_unlink` notify the remote device as well.

Security: the token is a shared secret for the room; anyone holding it can deliver prompts to devices in that room. Use a long random token, HTTPS (a tunnel), and a dedicated room. The hub keeps messages in memory only (15 minutes, 1000 per room) and is not a durable queue.

If a tunnel is inconvenient, choose **Free public relay (ntfy.sh)** in the Settings card: no account and no deployment. The topic is derived from room + token; messages go through ntfy.sh in 4 KB chunks (the free tier allows about 250 publishes per day per IP). Use a long random token; this is not end-to-end encrypted.

## Stage queue

A human can pre-write several large stages for one worker; finishing one dispatches the next automatically.

- Add stages in the manager's **Stage queue** card, or with `collab_stage({ action: "add", worker, title, prompt, acceptance })`.
- `start` dispatches the first pending stage; when its acceptance passes, `complete` marks it done and dispatches the next pending stage in the same call.
- A stage is a normal round: the worker reports as usual, and `complete` waits until no round is pending.
- The queue is stored on the worker link; `remove` deletes a pending stage, `clear` removes all pending stages.

## Conversation to-do queue

Any conversation, not only a manager, can have its own prompt queue:

- Add items in the **Conversation to-do** card, or `/collab queue {"action":"add","title":"…","prompt":"…"}`.
- `start` sends the first pending prompt as a normal user message; when that turn ends, the next pending prompt is sent automatically.
- `pause` stops auto-advance after the current turn, `resume` re-enables it, and `clear` removes pending items.
- The queue is stored per conversation and survives plugin reloads.

## Projects

A project is the set of workers managed by one project-manager conversation. Different managers are different projects, so nothing mixes:

- On the first link the project name defaults to the manager conversation title (role prefix removed).
- Rename it in the manager card or with `collab_project({ name })` / `/collab project {"name":"…"}`; every worker of that manager follows the project.
- The board groups tasks by project (project name + manager).
- A worker belongs to exactly one project at a time; unlink it before linking it to another manager.

## Link modes

Each worker is linked in one of two modes:

- **Temporary** (default): `collab_done` unbinds the pair automatically — the link record is removed, the title prefix is cleared, and the worker can join another manager.
- **Permanent**: `collab_done` ends the current project but keeps the association — the prefix and record stay, the board shows the worker as finished, and you can dispatch again later or remove it with `collab_unlink`.

Choose the mode in the link form, or pass `mode` to `collab_link`.

## Title prefixes

Linking adds a prefix to both conversations and removes it when the link ends (or the last worker finishes):

- Manager: `【项目经理】<title>`
- Worker: `【员工】<title>`

The prefix text is configurable and can be turned off.

## Quick start

1. Open the conversation that should manage the project and say:

   > Link a worker. The goal is to finish XXX. Dispatch round one: …

   The model calls `collab_link({ peer: "new" })` and `collab_dispatch({ task: "…" })`.

2. Link a second worker the same way. With several workers, dispatch with `worker`:

   > Dispatch to worker B: … (worker="session-…")

3. Worker results come back automatically. Continue with `collab_dispatch`, or close that worker with `collab_done({ worker, summary })`.

For an existing conversation, call `collab_sessions` to get its id, then `collab_link({ peer: "<sessionId>" })`.

## Tools

| Tool | Role | Purpose |
| --- | --- | --- |
| `collab_sessions` | anyone | List recent conversations (id / title / activity / link state) |
| `collab_link` | anyone | Link a worker; `role=worker` makes the current conversation the worker; `peer="new"` creates one; `mode` picks temporary/permanent; `project` names the project |
| `collab_worker_create` | manager | Create a new worker conversation (name, preset/model), linked automatically; can dispatch the first round |
| `collab_remote` | anyone | Cross-device: `alias` registers this conversation on the worker device; `link` binds a remote device/alias on the manager device |
| `collab_stage` | manager | Stage queue: add/list/start/complete stages; `complete` dispatches the next one automatically |
| `collab_dispatch` | manager | Dispatch one round; `worker` selects the worker (optional with a single worker), `acceptance` optional |
| `collab_report` | worker | Report `summary` / `status`(done\|partial\|blocked) / `details` / `next` |
| `collab_status` | anyone | A manager sees every worker's progress; a worker sees its manager and pending task |
| `collab_configure` | manager | Set a worker's agent preset or model; without arguments it lists available presets |
| `collab_project` | manager | Set the project name shared by this manager's workers |
| `collab_done` | manager | Finish one worker (or `all=true`); temporary links unbind automatically |
| `collab_unlink` | both | Remove a link; a manager uses `worker` or `all`, a worker leaves its own |

## `/collab` command

The settings page uses it; it can also be typed manually:

```
/collab tasks
/collab language en
/collab status
/collab link {"peer":"new"}
/collab link {"peer":"session-…"}
/collab project {"name":"…"}
/collab create {"name":"前端","preset":"standard"}
/collab remote {"action":"link","device":"laptop","worker":"frontend"}
/collab stage {"action":"add","title":"阶段一","prompt":"…"}
/collab queue {"action":"add","title":"第一步","prompt":"…"}
/collab relay {"action":"set","mode":"ntfy","hubRoom":"my-project","hubToken":"…"}
/collab configure {"worker":"session-…","preset":"ptc"}
/collab configure {"worker":"session-…","provider":"deepseek-account","model":"deepseek-flash"}
/collab dispatch {"worker":"session-…","task":"…","acceptance":"…"}
/collab done {"worker":"session-…","summary":"…"}
/collab done {"all":true,"summary":"…"}
/collab unlink {"worker":"session-…"}
/collab unlink {"all":true}
```

`--key value` flags are accepted too: `/collab link --peer new`. `/collab tasks` returns the board data (all links plus live state).

## Configuration

The `collab-pair` row in `cordis.patch.yml`:

```yaml
- id: collab-pair
  name: 'dsh-collab-pair'
  config:
    maxRounds: 0             # rounds per worker; 0 = unlimited
    maxRelayChars: 12000     # max characters of the worker's final output in a relay
    maxHistory: 20           # recent rounds kept per worker
    notifyWorkerOnDone: true # tell the worker to stop when the link is finished
    autoRelay: true          # false records the report without delivering it
    language: zh             # generated message language: zh | en
    autoNudge: true          # wake an idle manager when a worker stalls
    nudgeAfterMinutes: 20    # minutes of no progress before a reminder
    maxNudges: 3             # reminders per link before leaving it to a human
    hubUrl: ''               # relay base URL; empty = local-only
    hubRoom: 'default'
    hubToken: ''
    deviceName: ''           # defaults to the host name
    relayMode: 'off'         # off | hub | ntfy
    addPrefix: true          # add the title prefix to linked conversations
    prefixManager: '【项目经理】'
    prefixWorker: '【员工】'
```

## Persistence

One record per worker lives in `$DSH_HOME/storages/collab_pair.json` (storage-domain `collab_pair`, table `links`). Links survive plugin reloads and DSH restarts; without the storage service the plugin falls back to memory and `collab_status.storage` reports `memory`.

## Limits

- A worker conversation belongs to one collaboration at a time; a manager can own several workers.
- Rounds are unlimited by default (`maxRounds: 0`); set a positive number to cap each worker.
- A conversation cannot be both manager and worker.
- Cross-device runs require `hubUrl` + `hubToken` on both devices (the signed-in account is not a message relay).
- Worker conversations need a configured model (new conversations inherit the deployment default).
- Relayed results arrive as user messages in the manager conversation, with a report header and round marker. The generated text follows `language`; tool descriptions and internal error messages are Chinese in this release.
- With a PTC preset the worker calls `collab_report` inside `run_code`; the plugin still reads the structured report.
- A new worker has no title until its first message; the prefix is applied once the title exists.
- The board is a snapshot on Refresh (working state comes from the agent status at that moment). It does not poll, which keeps command records out of the session log.

---

# 中文说明

> 用于大项目的 DSH 协作插件：把项目经理对话与本机/远端员工关联，自动派发、回传并推进阶段；也可以给任意对话预设一串提示词待办，完成一轮自动发下一条。

[**GitHub**](https://github.com/awa1231/dsh-collab-pair) · [给个 Star ★](https://github.com/awa1231/dsh-collab-pair)

## 安装

```bash
dsh plugin add dsh-collab-pair
```

或在 DSH 的插件管理里用包名 `dsh-collab-pair` 安装。安装后刷新页面，在 **设置 → 双对话协作** 打开。界面中英文跟随应用语言。

**插件只做一件事：把员工对话关联到项目经理对话。** 目标、任务拆解、验收标准都由项目经理在对话里掌握，插件不重复收集。

一个项目经理可以同时管理**多个员工**，每个员工各自跑自己的轮次：

```
项目经理（掌握目标、拆解、验收）
   │  collab_dispatch(worker="员工A") 派发第 N 轮
   ▼
员工A / 员工B / …（各自执行、collab_report 汇报）
   │  该员工本轮 turn 结束 → 插件抓取「汇报 + 最终产出」
   ▼
项目经理收到【协作回报】→ 决定该员工的下一轮，或 collab_done 收尾
```

## 可视化设置页

**设置 → 协作待办**，从上到下：

1. **工作会话**：选择要操作的对话（默认当前打开的对话）。
2. **当前会话 · <标题>**：先看**这个对话自己的**关联与状态。
   - 是项目经理：列出它管理的员工（状态、轮次、本轮任务、最近回报、解除），并可继续**关联员工**。
   - 是员工：显示项目经理、当前任务、状态与最近回报，可**退出协作**。
   - 无关联：直接显示关联表单。
3. **全部任务**：所有协作的任务看板，不限当前会话。每行显示员工、所属项目经理、第几轮、**工作状态**（`工作中` / `等待回报` / `空闲` / `已结束`）、等待时长、本轮任务、最近回报。点「刷新」重新读取。
4. **跨设备协作**：中继模式（关闭 / 自建 hub / 免费 ntfy.sh）、URL、房间、令牌、设备名；保存/测试、连接状态、员工别名注册、远端员工关联。
5. **阶段待办**（仅项目经理）：选员工，填标题/提示词/验收标准；可开始、完成并自动派发下一阶段、删除待开始阶段。
6. **对话待办**（其他任意对话）：预先写一串提示词；点开始发第一条，当前回合结束后自动发下一条。可暂停、恢复、清空待发。

在侧栏右键一个对话，选「设为项目经理并启动」：插件会新建并关联一个起始员工，然后给该对话发一条「项目经理模式」指令，让它自己创建更多员工并把执行工作派出去。

### 项目经理模式

对话成为项目经理后，提示词会要求它：

- 需要人干活时自己用 `collab_worker_create` 创建员工，不等待用户手动新建；
- 把执行交给员工，自己的上下文留给验收和继续派发——不要花长时间亲自做员工的活；
- 创建员工和派发第一阶段之前，先确认项目目标。

页面只做关联/解除和查看，不代填目标、任务、验收——这些交给项目经理对话。

## 中英文

- 设置页跟随应用语言，包内自带中文和英文。
- 对话里生成的消息由配置 `language` 决定（`zh` / `en`，默认 `zh`）。可在页面顶部「对话消息语言」切换，或用 `/collab language en`；命令会保存配置并重载插件。

## 挂机运行

派发一轮后，员工完成会自动唤醒项目经理，设置页不需要一直开着。长时间项目还有：

- `autoNudge`（默认开启）：员工长时间无推进时唤醒空闲的项目经理，间隔 `nudgeAfterMinutes`（默认 20 分钟），最多 `maxNudges` 次（默认 3），之后留给人工处理。
- 回传项目经理失败会在 1 分钟后自动重试一次。
- 关联在插件重载、DSH 重启后自动恢复；需要下一条消息时会恢复冷会话。

不需要提醒时设 `autoNudge: false`。

## 跨设备协作

DSH 是本地优先的：登录账号只用来识别设备，并不会在设备之间转发消息。所以插件自带一个很小的中继 hub，各设备**向外连接**它。配合内网穿透即可跨网络使用，员工设备不需要开放入站端口。

在一台机器或小 VPS 上启动 hub（消息只存内存）：

```bash
node node_modules/dsh-collab-pair/hub.js --port 8787 --token <足够长的随机密钥>
# 再用 HTTPS 暴露，例如
cloudflared tunnel --url http://127.0.0.1:8787
```

**两台设备**都配置相同的 `hubUrl`、`hubToken`、`hubRoom`，以及不同的 `deviceName`：

```yaml
hubUrl: https://your-tunnel.example
hubRoom: my-project
hubToken: <同一个密钥>
deviceName: desktop   # 另一台写 laptop
```

员工设备上，在要远程工作的对话里：

```text
collab_remote({ action: "alias", alias: "frontend" })
```

项目经理设备上：

```text
collab_remote({ action: "link", device: "laptop", worker: "frontend", name: "前端" })
collab_dispatch({ worker: "前端", task: "…" })
```

经理通过 hub 派发；员工设备在本机对话里执行，回合结束时抓取最终回复并发回。`collab_done` / `collab_unlink` 也会通知远端设备。

安全：token 是整个房间的共享密钥，持有它的人可以向该房间的设备投递提示词。请用足够长的随机 token、HTTPS（隧道）和专用房间。hub 只在内存里保留 15 分钟 / 每房间最多 1000 条消息，不是持久队列。

如果内网穿透不方便，可在设置卡片里选 **免费公共中继（ntfy.sh）**：不用账号、不用部署。topic 由 room + token 派生；消息以 4 KB 分片经过 ntfy.sh（免费额度约每 IP 每天 250 次发布）。请用足够长的随机 token；这不是端到端加密。

## 阶段队列

人可以给同一个员工预先写好多个大阶段；完成一个阶段后自动派发下一个。

- 在项目经理卡片的「阶段队列」里添加，或用 `collab_stage({ action: "add", worker, title, prompt, acceptance })`。
- `start` 派发第一个待开始阶段；验收通过后 `complete` 标记完成，并在同一次调用里自动派发下一个待开始阶段。
- 阶段本质就是普通的一轮：员工照常回报；仍有轮次在等待回报时，`complete` 会拒绝。
- 队列保存在员工关联上；`remove` 删除待开始阶段，`clear` 清空所有待开始阶段。

## 对话待办队列

任意对话（不只是项目经理）都可以有自己的提示词队列：

- 在「对话待办」卡片里添加，或 `/collab queue {"action":"add","title":"…","prompt":"…"}`。
- `start` 把第一条待发提示词作为普通用户消息发进去；该回合结束后，自动发送下一条。
- `pause` 在当前回合后停止自动连发，`resume` 恢复，`clear` 清空待发。
- 队列按对话保存，插件重载后仍在。

## 项目

一个项目就是「一个项目经理对话所管理的员工集合」。不同项目经理就是不同项目，互不混淆：

- 第一次关联时，项目名默认取项目经理对话的标题（去掉角色前缀）。
- 可在项目经理卡片里改名，或用 `collab_project({ name })` / `/collab project {"name":"…"}`；该经理的所有员工会一起归到新项目名。
- 看板按项目分组（项目名 + 项目经理）。
- 一个员工同一时间只属于一个项目；要换项目经理，先解除原关联。

## 关联模式

每个员工关联时选择一种模式：

- **临时**（默认）：`collab_done` 后自动解绑——关联记录删除、标题前缀去掉，员工可以再加入其他项目经理。
- **永久**：`collab_done` 只结束当前项目，关联保留——前缀和记录都在，看板显示已结束，之后可以继续派发，直到手动 `collab_unlink`。

在关联表单里选择，或给 `collab_link` 传 `mode`。

## 标题前缀

关联时自动给两个对话加前缀，解除（或最后一个员工结束时）自动去掉：

- 项目经理：`【项目经理】对话标题`
- 员工：`【员工】对话标题`

可在配置里改文字或关掉（见下）。

## 快速开始

1. 打开一个对话作为项目经理，对它说：
   > 关联一个员工，目标是把 XXX 做完，先派发第一轮：……
   模型会 `collab_link({ peer: "new" })` + `collab_dispatch({ task: "…" })`。
2. 再关联第二个员工时，同一句即可；派发时用 `worker` 指定是谁：

   > 给员工 B 派发：……（worker="session-…"）
3. 员工完成后产出自动回传，项目经理继续或 `collab_done({ worker, summary })` 收尾。

已有对话：先 `collab_sessions` 拿到 sessionId，再 `collab_link({ peer: "<sessionId>" })`。

## 工具

| 工具 | 角色 | 作用 |
| --- | --- | --- |
| `collab_sessions` | 任何人 | 列出最近对话（id / 标题 / 活跃 / 是否已关联） |
| `collab_link` | 任何人 | 关联员工；`role=worker` 表示当前对话成为对方的员工；`peer="new"` 新建；`mode` 选临时/永久；`project` 指定项目名 |
| `collab_worker_create` | 项目经理 | 新建员工对话（可命名、设预设/模型），默认自动关联，可顺便派发第一轮 |
| `collab_remote` | 任何人 | 跨设备：员工设备用 `alias` 注册对话；经理设备用 `link` 绑定远端设备/别名 |
| `collab_stage` | 项目经理 | 阶段队列：add/list/start/complete；`complete` 会自动派发下一阶段 |
| `collab_dispatch` | 项目经理 | 派发一轮；`worker` 指定员工（只有一个时可省略），`acceptance` 可选 |
| `collab_report` | 员工 | 汇报 `summary` / `status`(done\|partial\|blocked) / `details` / `next` |
| `collab_status` | 任何人 | 经理看所有员工进度；员工看自己的经理与待办 |
| `collab_configure` | 项目经理 | 设置某个员工的 agent 预设或模型；不传参数时列出可用预设 |
| `collab_project` | 项目经理 | 设置该经理的员工所属的项目名 |
| `collab_done` | 项目经理 | 结束某个员工；临时关联会自动解绑；`all=true` 结束全部 |
| `collab_unlink` | 双方 | 删除关联；经理用 `worker` 或 `all`，员工解除自己 |

## `/collab` 命令

设置页通过它操作，也可以手动输入：

```
/collab tasks
/collab language en
/collab status
/collab link {"peer":"new"}
/collab link {"peer":"session-…"}
/collab project {"name":"…"}
/collab create {"name":"前端","preset":"standard"}
/collab remote {"action":"link","device":"laptop","worker":"frontend"}
/collab stage {"action":"add","title":"阶段一","prompt":"…"}
/collab queue {"action":"add","title":"第一步","prompt":"…"}
/collab relay {"action":"set","mode":"ntfy","hubRoom":"my-project","hubToken":"…"}
/collab configure {"worker":"session-…","preset":"ptc"}
/collab configure {"worker":"session-…","provider":"deepseek-account","model":"deepseek-flash"}
/collab dispatch {"worker":"session-…","task":"…","acceptance":"…"}
/collab done {"worker":"session-…","summary":"…"}
/collab done {"all":true,"summary":"…"}
/collab unlink {"worker":"session-…"}
/collab unlink {"all":true}
```

也支持 `--key value`：`/collab link --peer new`。`/collab tasks` 返回看板数据（所有关联 + 运行状态）。

## 配置

`cordis.patch.yml` 的 `collab-pair` 行：

```yaml
- id: collab-pair
  name: 'dsh-collab-pair'
  config:
    maxRounds: 0             # 每个员工最多派发多少轮；0 = 不限制
    maxRelayChars: 12000     # 回传时最终产出的最大字符数
    maxHistory: 20           # 每个员工保留的最近轮次
    notifyWorkerOnDone: true # done 时通知员工停止
    autoRelay: true          # false 时只记录、不自动投递
    language: zh             # 生成消息的语言：zh / en
    autoNudge: true          # 员工停滞时唤醒空闲的项目经理
    nudgeAfterMinutes: 20    # 多久无推进后提醒（分钟）
    maxNudges: 3             # 每条关联最多提醒几次
    hubUrl: ''               # 中继地址；留空 = 只用本机
    hubRoom: 'default'
    hubToken: ''
    deviceName: ''           # 默认取主机名
    relayMode: 'off'         # off | hub | ntfy
    addPrefix: true          # 是否给关联对话加标题前缀
    prefixManager: '【项目经理】'
    prefixWorker: '【员工】'
```

## 持久化

每个员工一条记录，存在 `$DSH_HOME/storages/collab_pair.json`（storage-domain 的 `collab_pair` 域，表 `links`）。插件重载、DSH 重启后自动恢复；存储不可用时退回内存模式，`collab_status` 的 `storage` 字段会显示 `memory`。

## 限制

- 员工对话同时只能属于一个协作；项目经理可以关联多个员工。
- 默认不限制轮次（`maxRounds: 0`）；填正数才会给每个员工设上限。
- 一个对话不能同时是项目经理和员工。
- 跨设备需要两台设备都配置 `hubUrl` + `hubToken`（登录账号本身不转发消息）。
- 员工对话需要已配置模型（新建对话继承部署默认模型）。
- 回传以用户消息形式进入项目经理对话（带【协作回报】标题与轮次标记）。生成文本跟随 `language`；工具描述与内部错误信息本版本仍为中文。
- 员工用 PTC 预设时 `collab_report` 会在 `run_code` 里调用，插件仍能读到结构化汇报。
- 新建员工在产生第一条消息前没有标题，前缀会在它第一轮结束拿到标题后补上。
- 看板是点「刷新」时的快照（`工作中`/`等待回报` 来自当时的 agent 状态），不做轮询，避免往会话日志里反复写命令记录。
