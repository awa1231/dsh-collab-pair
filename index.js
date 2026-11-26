/**
 * Collaboration pair: link one project-manager conversation with one or more
 * worker conversations.
 *
 * The manager dispatches a round to one worker with `collab_dispatch` (the
 * worker id is required when several workers are linked). The worker executes
 * it, reports with `collab_report`, and when that worker turn ends the plugin
 * delivers the report plus the worker's final message to the manager. The
 * manager reviews it and dispatches again, so every worker runs its own loop
 * until `collab_done` closes that worker.
 *
 * Link state lives in the `collab_pair` storage domain (table `links`), keyed by
 * link id: one record per worker, all sharing the same manager. The domain is
 * opened through the optional `storageDomain` service, with an in-memory
 * fallback when it is unavailable.
 *
 * @module @local/collab-pair
 */
import { createHash, randomUUID } from 'node:crypto'
import { hostname } from 'node:os'

export const inject = ['tools', 'systemPrompt', 'agents', 'sessions', 'commands']

const SECTION_NAME = 'collab-pair'
const SECTION_ORDER = 650
const STORAGE_DOMAIN = {
  name: 'collab_pair',
  version: 1,
  tables: { links: { valueSchema: { parse: (value) => value } } },
}
const REMOTE_DOMAIN = {
  name: 'collab_pair_remote',
  version: 1,
  tables: {
    aliases: { valueSchema: { parse: (value) => value } },
    state: { valueSchema: { parse: (value) => value } },
  },
}
const ACTIVE = 'active'
const DONE = 'done'
const STOPPED = 'stopped'
const REPORTS = new Set(['done', 'partial', 'blocked'])
const PROMPT_TIMEOUT_MS = 180000
const QUEUE_LIMIT = 100
const QUEUE_DONE_LIMIT = 20
const ENGINE = 'collab-pair/1.5.4'
const PREFIX_DEFAULTS = {
  zh: { manager: '【项目经理】', worker: '【员工】' },
  en: { manager: '[Manager]', worker: '[Worker]' },
}

/** A recoverable failure whose message is meant for the model. */
class CollabError extends Error {}

/**
 * Resolve tunable values without a Config schema, so the bundle stays
 * dependency-free and still accepts a `config` block in the profile patch.
 * @param {unknown} raw - the row config object.
 * @returns normalized settings.
 */
function resolveConfig(raw) {
  const value = raw !== null && typeof raw === 'object' ? raw : {}
  return {
    maxRounds: normalizeRounds(value.maxRounds),
    maxRelayChars: clampInt(value.maxRelayChars, 500, 100000, 12000),
    maxHistory: clampInt(value.maxHistory, 1, 100, 20),
    notifyWorkerOnDone: value.notifyWorkerOnDone !== false,
    autoRelay: value.autoRelay !== false,
    addPrefix: value.addPrefix !== false,
    language: value.language === 'en' ? 'en' : 'zh',
    prefixManager: prefixFor(value.prefixManager, 'manager', value.language === 'en' ? 'en' : 'zh'),
    prefixWorker: prefixFor(value.prefixWorker, 'worker', value.language === 'en' ? 'en' : 'zh'),
    autoNudge: value.autoNudge !== false,
    nudgeAfterMinutes: clampInt(value.nudgeAfterMinutes, 5, 1440, 20),
    maxNudges: clampInt(value.maxNudges, 1, 20, 3),
    hubUrl: normalizeHubUrl(value.hubUrl),
    hubRoom: typeof value.hubRoom === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value.hubRoom) ? value.hubRoom : 'default',
    hubToken: typeof value.hubToken === 'string' ? value.hubToken.trim() : '',
    deviceName: deviceText(value.deviceName),
    relayMode: value.relayMode === 'off' || value.relayMode === 'hub' || value.relayMode === 'ntfy'
      ? value.relayMode
      : (normalizeHubUrl(value.hubUrl) !== '' && typeof value.hubToken === 'string' && value.hubToken.trim() !== '' ? 'hub' : 'off'),
  }
}

/** One HTTP(S) base URL for the relay, without a trailing slash. */
function normalizeHubUrl(candidate) {
  if (typeof candidate !== 'string') return ''
  const value = candidate.trim().replace(/\/+$/, '')
  if (value === '') return ''
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    return value
  } catch {
    return ''
  }
}

/** A stable, URL-safe device label; defaults to the host name. */
function deviceText(candidate) {
  let raw = typeof candidate === 'string' ? candidate.trim() : ''
  if (raw === '') {
    try {
      raw = hostname()
    } catch {
      raw = ''
    }
  }
  if (raw === '') raw = `dsh-${randomUUID().slice(0, 6)}`
  const cleaned = raw.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64)
  return cleaned === '' ? `dsh-${randomUUID().slice(0, 6)}` : cleaned
}

/** One non-empty prefix string, clamped to a title-safe length. */
function prefixText(candidate, fallback) {
  if (typeof candidate !== 'string') return fallback
  const value = candidate.trim()
  if (value === '') return fallback
  return value.length > 24 ? value.slice(0, 24) : value
}

/** Built-in prefixes follow the message language; custom values stay custom. */
function prefixFor(candidate, role, language) {
  const value = typeof candidate === 'string' ? candidate.trim() : ''
  const fallback = PREFIX_DEFAULTS[language][role]
  if (value === '') return fallback
  const builtIn = Object.values(PREFIX_DEFAULTS).some((set) => set[role] === value)
  return builtIn ? fallback : prefixText(value, fallback)
}

/** Rounds per worker: 0 (the default) means unlimited. */
function normalizeRounds(candidate) {
  const number = typeof candidate === 'number' ? candidate : Number(candidate)
  if (!Number.isFinite(number)) return 0
  const integer = Math.trunc(number)
  if (integer <= 0) return 0
  return Math.min(integer, 100000)
}

/** Clamp one integer setting. */
function clampInt(candidate, min, max, fallback) {
  const number = typeof candidate === 'number' ? candidate : Number(candidate)
  if (!Number.isFinite(number)) return fallback
  const integer = Math.trunc(number)
  if (integer < min) return min
  if (integer > max) return max
  return integer
}

/** Truncate text at a stable boundary. */
function clip(text, limit) {
  const value = typeof text === 'string' ? text : ''
  if (value.length <= limit) return value
  const head = Math.max(0, limit - 40)
  return `${value.slice(0, head)}\n…（已截断，共 ${value.length} 字符）`
}

/** Join assistant/user content blocks into plain text. */
function messageText(message) {
  const content = message?.content ?? message?.message?.content
  if (!Array.isArray(content)) return ''
  const parts = []
  for (const block of content) if (block?.type === 'text' && typeof block.text === 'string') parts.push(block.text)
  return parts.join('\n').trim()
}

/** Best-effort readable delivery failure. */
function deliveryFailure(error) {
  const code = error?.code ?? error?.details?.code
  const detail = error?.message ?? String(error)
  if (code === 'session/not-found') return '目标对话不存在或已被删除（session/not-found）。'
  if (code === 'session/writer-held') return '目标对话正被另一个进程占用（session/writer-held），请关闭其他窗口后重试。'
  if (code === 'session/agent-busy') return `目标对话暂时无法接收消息（session/agent-busy）：${detail}`
  if (code === 'session/migration-required') return '目标对话需要先打开完成迁移（session/migration-required）。'
  return `投递失败${typeof code === 'string' ? `（${code}）` : ''}：${detail}`
}

/** ISO time for tool output, tolerant of bad stored values. */
function isoTime(value) {
  return typeof value === 'number' && Number.isFinite(value) ? new Date(value).toISOString() : null
}

/**
 * Split one `/collab` invocation into an action and its arguments.
 * The body may be a JSON object (what the settings page sends) or `--key value`
 * flags (what a person types).
 * @param rawInput - text after the command name.
 * @returns the action name and its arguments.
 */
function parseCommandBody(rawInput) {
  const text = typeof rawInput === 'string' ? rawInput.trim() : ''
  if (text === '') return { action: 'status', args: {} }
  const space = text.search(/\s/)
  const action = (space === -1 ? text : text.slice(0, space)).toLowerCase()
  const rest = space === -1 ? '' : text.slice(space + 1).trim()
  if (rest === '') return { action, args: {} }
  if (rest.startsWith('{')) {
    let parsed
    try {
      parsed = JSON.parse(rest)
    } catch (error) {
      throw new CollabError(`参数不是合法 JSON：${String(error instanceof Error ? error.message : error)}`)
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new CollabError('参数必须是 JSON 对象。')
    return { action, args: parsed }
  }
  if (!rest.startsWith('--')) return { action, args: { value: rest } }
  return { action, args: parseFlags(rest) }
}

/** Parse `--key value`, `--key=value`, quoted values, and boolean flags. */
function parseFlags(text) {
  const args = {}
  let index = 0
  while (index < text.length) {
    while (text[index] === ' ') index++
    if (index >= text.length) break
    if (text[index] !== '-' || text[index + 1] !== '-') throw new CollabError(`无法解析参数："${text.slice(index)}"。用法：--key 值`)
    index += 2
    let key = ''
    while (index < text.length && text[index] !== '=' && text[index] !== ' ') key += text[index++]
    if (text[index] === '=') index++
    else while (text[index] === ' ') index++
    let value = ''
    const quote = text[index]
    if (quote === '"' || quote === "'") {
      index++
      while (index < text.length && text[index] !== quote) {
        if (text[index] === '\\' && index + 1 < text.length) {
          value += text[index + 1]
          index += 2
        } else {
          value += text[index++]
        }
      }
      index++
    } else {
      while (index < text.length && text[index] !== ' ') value += text[index++]
    }
    if (key === '') throw new CollabError('参数名不能为空。')
    args[key] = value === 'true' ? true : value === 'false' ? false : value
  }
  return args
}

/** Localized collaboration messages. `language` in the plugin config selects one. */
const LANGUAGES = {
  zh: {
    idle: '空闲',
    waiting: '等待回报',
    finished: '已结束',
    statusLabel(status) {
      if (status === 'done') return '完成'
      if (status === 'partial') return '部分完成'
      if (status === 'blocked') return '受阻，需要决策'
      if (status === 'unreported') return '未显式汇报'
      return '未知'
    },
    reasonText(reason) {
      const kind = reason?.kind
      if (kind === 'completed') return '正常结束'
      if (kind === 'blocked') return '等待输入（blocked）'
      if (kind === 'max-tokens') return '达到输出上限'
      if (kind === 'interrupted') return '被中断'
      if (kind === 'forked') return '会话已分叉'
      if (kind === 'aborted') {
        const cause = reason?.reason?.kind
        if (cause === 'user') return '被用户中止'
        if (cause === 'parent') return '被父级中止'
        if (cause === 'disposed') return '会话被关闭'
        if (cause === 'hook') return '被钩子中止'
        return '被中止'
      }
      if (kind === 'error') return `出错：${reason?.error?.message ?? '未知错误'}`
      return typeof kind === 'string' ? kind : '未知'
    },
    managerRow({ label, worker, round, state, last }) {
      return `- ${label}（${worker}）：第 ${round} 轮 · ${state}${last === '' ? '' : ` · 最近：${last}`}`
    },
    moreWorkers(count) {
      return `- …另有 ${count} 个员工，用 collab_status 查看`
    },
    managerSection({ count, rows, maxRounds, project }) {
      return [
        '## 双对话协作 · 你是项目经理',
        ...(project ? [`项目：${project}`] : []),
        `你正在协调 ${count} 个员工对话。默认由你自主创建员工并把执行工作派出去；项目目标、拆解与验收标准由你掌握。`,
        '员工：',
        ...rows,
        '',
        '规则：',
        '- 默认自主创建员工：需要人干活时，先用 `collab_worker_create` 建立合适的员工（可按角色建多个），再派发；不要等用户手动新建。',
        '- 远端设备上的员工用 `collab_remote` 关联（先在设置页的「跨设备协作」里配置中继）；本机员工才用 `collab_worker_create`，不要重复创建。',
        '- 不要自己承担员工的具体执行工作。你负责拆解、派发、验收和决定下一步；自己动手只限于规划、审阅和必要协调，避免因长时间执行而错过员工回报。',
        '- 用 `collab_dispatch` 派发任务；有多个员工时用 `worker` 指定员工（sessionId 或标题），只有一个时可省略。',
        '- 阶段队列：用 `collab_stage` 添加/查看；当前阶段验收通过后调用 `collab_stage({action:"complete"})`，会自动派发下一阶段。',
        '- 收到【协作回报】后尽快验收并继续派发；保持自己的上下文轻量，细节让员工在回报里给出摘要。',
        '- 需要调整某个员工的 agent 预设或模型时，用 `collab_configure`（worker 指定员工）。',
        maxRounds > 0 ? `- 每个员工最多 ${maxRounds} 轮。` : '- 不限制轮次，直到你调用 collab_done 收尾。',
      ].join('\n')
    },
    workerSection({ manager, round, pending, project }) {
      return [
        '## 双对话协作 · 你是员工',
        ...(project ? [`项目：${project}`] : []),
        `项目经理对话：${manager}`,
        `进度：第 ${round} 轮${pending ? '，待你完成本轮任务' : ''}`,
        '你负责执行项目经理派发的任务，并如实回报结果；项目目标与验收标准以派发消息为准，不要改变大方向或扩大范围。',
        '',
        '规则：',
        '- 严格按本对话里最近一条【协作任务】执行。',
        '- 完成后调用 `collab_report` 汇报：summary（交付物/结论）、status（done/partial/blocked）、details、next，然后结束本轮回复。',
        '- 你的最终回复会连同汇报一起自动回传给项目经理；遇到阻塞用 blocked 写清需要什么决策。',
        '- 项目经理可能连续派发多轮任务，每轮都按上述流程执行。',
      ].join('\n')
    },
    dispatch({ round, goal, task, acceptance, marker }) {
      const lines = [`【协作任务 · 第 ${round} 轮】`, '']
      if (goal) lines.push(`项目目标：${goal}`, '')
      lines.push(
        '—— 本轮任务 ——',
        task,
        '',
        '—— 验收标准 ——',
        acceptance || '（未指定；按任务目标自行检查交付完整性）',
        '',
        '—— 交付要求 ——',
        '1. 直接执行本轮任务，不要改变项目大方向，也不要扩大到任务之外。',
        '2. 完成后调用 collab_report 汇报：summary / status（done 完成、partial 部分完成、blocked 受阻需决策）/ details / next。',
        '3. 汇报后结束本轮回复；你的最终回复会作为「产出与反馈」自动回传给项目经理。',
        marker,
      )
      return lines.join('\n')
    },
    report({ round, workerTitle, worker, report, reason, finalText, maxRounds, nextRound, marker }) {
      const status = report === undefined ? this.statusLabel('unreported') : this.statusLabel(report.status)
      const lines = [
        `【协作回报 · 第 ${round} 轮】`,
        `来自员工对话：${workerTitle || '（未命名对话）'}（${worker}）`,
        `本轮状态：${status}`,
        `结束原因：${this.reasonText(reason)}`,
        '',
      ]
      if (report !== undefined) {
        lines.push('—— 员工汇报 ——', report.summary)
        if (report.details) lines.push('', '细节：', report.details)
        if (report.next) lines.push('', `员工建议：${report.next}`)
        lines.push('')
      }
      lines.push(
        '—— 员工最终产出 ——',
        finalText || (report === undefined
          ? '（本轮没有可读取的文本产出，可打开员工对话查看完整过程）'
          : '（员工本轮没有额外文字总结，以上汇报即为其产出。）'),
        '',
      )
      if (maxRounds > 0 && round >= maxRounds) lines.push(`⚠ 该员工已达到配置的最大轮次 ${maxRounds}，无法再派发新一轮；请验收成果后调用 collab_done 收尾。`, '')
      lines.push(
        '—— 下一步 ——',
        '请以项目经理身份审阅本轮结果：',
        `- 需要继续：调用 collab_dispatch 下发第 ${nextRound} 轮任务，worker="${worker}"（可附验收标准）。`,
        `- 该员工已完成：调用 collab_done，worker="${worker}"，形成总结并收尾。`,
        `- 需要了解过程细节：可打开员工对话 ${worker} 查看。`,
        marker,
      )
      return lines.join('\n')
    },
    done({ summary, marker }) {
      return [
        '【协作结束】',
        '项目经理已确认本项目完成，本轮协作到此结束。',
        '',
        `项目总结：${summary || '（无）'}`,
        '',
        '不需要再执行新的任务，也不要再调用协作工具；如果手上还有未完成的工作，请停止并简要说明当前状态。',
        marker,
      ].join('\n')
    },
    nudge({ worker, minutes, attempt, max }) {
      return [
        '【协作推进提醒】',
        `员工 ${worker} 目前空闲，已经 ${minutes} 分钟没有推进（第 ${attempt}/${max} 次提醒）。`,
        '',
        '请继续推进：调用 `collab_dispatch` 派发下一轮，或调用 `collab_done` 对该员工收尾。',
        '如果项目需要暂停，请告知用户并说明原因。',
      ].join('\n')
    },
  },
  en: {
    idle: 'idle',
    waiting: 'waiting for report',
    finished: 'finished',
    statusLabel(status) {
      if (status === 'done') return 'done'
      if (status === 'partial') return 'partially done'
      if (status === 'blocked') return 'blocked, needs a decision'
      if (status === 'unreported') return 'no explicit report'
      return 'unknown'
    },
    reasonText(reason) {
      const kind = reason?.kind
      if (kind === 'completed') return 'completed'
      if (kind === 'blocked') return 'blocked, waiting for input'
      if (kind === 'max-tokens') return 'output limit reached'
      if (kind === 'interrupted') return 'interrupted'
      if (kind === 'forked') return 'conversation forked'
      if (kind === 'aborted') {
        const cause = reason?.reason?.kind
        if (cause === 'user') return 'stopped by the user'
        if (cause === 'parent') return 'stopped by the parent'
        if (cause === 'disposed') return 'conversation closed'
        if (cause === 'hook') return 'stopped by a hook'
        return 'aborted'
      }
      if (kind === 'error') return `error: ${reason?.error?.message ?? 'unknown'}`
      return typeof kind === 'string' ? kind : 'unknown'
    },
    managerRow({ label, worker, round, state, last }) {
      return `- ${label} (${worker}): round ${round} · ${state}${last === '' ? '' : ` · latest: ${last}`}`
    },
    moreWorkers(count) {
      return `- …and ${count} more workers; use collab_status to see all`
    },
    managerSection({ count, rows, maxRounds, project }) {
      return [
        '## Collaboration pair · You are the project manager',
        ...(project ? [`Project: ${project}`] : []),
        `You coordinate ${count} worker conversations. By default you create workers yourself and delegate the execution; you own the project goal, breakdown and acceptance criteria.`,
        'Workers:',
        ...rows,
        '',
        'Rules:',
        '- Create workers by default: when work needs doing, use `collab_worker_create` to make the right worker(s) (multiple roles if needed), then dispatch. Do not wait for the user to create them manually.',
        '- For a worker on another device use `collab_remote` (configure the relay in the Settings cross-device card first); only create a local worker with `collab_worker_create`. Do not duplicate it.',
        '- Do not do the workers\' execution work yourself. You break down, dispatch, review and decide; your own hands-on work should be limited to planning, review and necessary coordination, so a long execution does not make you miss worker reports.',
        '- Dispatch a round with `collab_dispatch`; when several workers exist, select one with `worker` (session id or title). With a single worker you may omit it.',
        '- Stage queue: manage it with `collab_stage`; when the current stage passes acceptance, call `collab_stage({action:"complete"})` to dispatch the next stage automatically.',
        '- When a [Collaboration report] arrives, review it quickly and dispatch again; keep your own context light and let workers summarise details in their reports.',
        '- To change a worker\'s agent preset or model, use `collab_configure` (select the worker with `worker`).',
        maxRounds > 0 ? `- At most ${maxRounds} rounds per worker.` : '- Rounds are unlimited; continue until you call collab_done.',
      ].join('\n')
    },
    workerSection({ manager, round, pending, project }) {
      return [
        '## Collaboration pair · You are a worker',
        ...(project ? [`Project: ${project}`] : []),
        `Manager conversation: ${manager}`,
        `Progress: round ${round}${pending ? ', with a task waiting for you' : ''}`,
        'Execute the tasks the manager dispatches and report back honestly. The goal and acceptance criteria come from the dispatch message; do not change direction or expand the scope.',
        '',
        'Rules:',
        '- Follow the latest [Collaboration task] message in this conversation.',
        '- When done, call `collab_report` with summary / status (done/partial/blocked) / details / next, then end your turn.',
        '- Your final reply is relayed to the manager together with the report; use blocked and state the decision you need.',
        '- The manager may dispatch further rounds; follow the same flow each time.',
      ].join('\n')
    },
    dispatch({ round, goal, task, acceptance, marker }) {
      const lines = [`[Collaboration task · Round ${round}]`, '']
      if (goal) lines.push(`Project goal: ${goal}`, '')
      lines.push(
        '— Task —',
        task,
        '',
        '— Acceptance criteria —',
        acceptance || '(not specified; check the deliverable for completeness against the task)',
        '',
        '— Delivery —',
        '1. Execute this round directly; do not change the project direction or expand beyond the task.',
        '2. When done, call collab_report with summary / status (done, partial, blocked) / details / next.',
        '3. End your turn after reporting; your final reply is relayed back to the manager as the output and feedback.',
        marker,
      )
      return lines.join('\n')
    },
    report({ round, workerTitle, worker, report, reason, finalText, maxRounds, nextRound, marker }) {
      const status = report === undefined ? this.statusLabel('unreported') : this.statusLabel(report.status)
      const lines = [
        `[Collaboration report · Round ${round}]`,
        `Worker conversation: ${workerTitle || 'Unnamed'} (${worker})`,
        `Status: ${status}`,
        `Turn ended: ${this.reasonText(reason)}`,
        '',
      ]
      if (report !== undefined) {
        lines.push('— Worker report —', report.summary)
        if (report.details) lines.push('', 'Details:', report.details)
        if (report.next) lines.push('', `Worker suggestion: ${report.next}`)
        lines.push('')
      }
      lines.push(
        '— Final output —',
        finalText || (report === undefined
          ? '(no readable text output this round; open the worker conversation for the full process)'
          : '(the worker added no text summary; the report above is its output.)'),
        '',
      )
      if (maxRounds > 0 && round >= maxRounds) lines.push(`⚠ This worker reached the configured maximum of ${maxRounds} rounds and cannot receive another round; review the result and call collab_done.`, '')
      lines.push(
        '— Next —',
        'Review this result as the project manager:',
        `- Continue: call collab_dispatch for round ${nextRound}, worker="${worker}" (acceptance optional).`,
        `- This worker is done: call collab_done, worker="${worker}", with a summary.`,
        `- Inspect the full process: open worker conversation ${worker}.`,
        marker,
      )
      return lines.join('\n')
    },
    done({ summary, marker }) {
      return [
        '[Collaboration finished]',
        'The project manager confirmed this project is complete; this collaboration ends here.',
        '',
        `Project summary: ${summary || '(none)'}`,
        '',
        'Do not start new tasks or call collaboration tools. If work is still unfinished, stop and briefly state the current status.',
        marker,
      ].join('\n')
    },
    nudge({ worker, minutes, attempt, max }) {
      return [
        '[Collaboration reminder]',
        `Worker ${worker} is idle and nothing has progressed for ${minutes} minutes (reminder ${attempt}/${max}).`,
        '',
        'Continue by calling `collab_dispatch` for the next round, or close that worker with `collab_done`.',
        'If the project should pause, tell the user and explain why.',
      ].join('\n')
    },
  },
}

export function apply(ctx, rawConfig) {
  const cfg = resolveConfig(rawConfig)
  const L = LANGUAGES[cfg.language]
  const links = new Map()
  /** managerId -> Set<linkId>, every link the session manages (any status). */
  const byManager = new Map()
  /** workerId -> linkId, only while that worker link is active. */
  const byWorker = new Map()
  const relays = new Map()
  const toolExecutors = {}
  let storageState = 'pending'
  let storageError = null
  const remoteAliases = new Map()
  const remoteInbound = new Map()
  const queues = new Map()
  let remoteState = 'pending'
  let remoteCursor = 0
  let remoteLastError = null
  let remoteLastPollAt = 0
  let remoteNtfyCursor = ''
  const ntfyParts = new Map()
  let remoteDomain = null
  const remoteReady = openRemoteStorage()

  const domainReady = openStorage()

  ctx.effect(() => async () => {
    const domain = await domainReady.catch(() => undefined)
    if (domain !== undefined) {
      try {
        await domain.close()
      } catch (error) {
        ctx.logger.warn(`collab-pair: closing the storage domain failed: ${String(error)}`)
      }
    }
    const remote = await remoteReady.catch(() => undefined)
    if (remote !== undefined) {
      try {
        await remote.close()
      } catch (error) {
        ctx.logger.warn(`collab-pair: closing the remote storage domain failed: ${String(error)}`)
      }
    }
  })

  ctx.systemPrompt.section({
    name: SECTION_NAME,
    order: SECTION_ORDER,
    text: sectionText,
  })

  ctx.on('session/event', onSessionEvent)

  // ------------------------------------------------------------- watchdog
  let alive = true
  let watchdogTimer
  ctx.effect(() => () => {
    alive = false
    if (watchdogTimer !== undefined) clearInterval(watchdogTimer)
  })
  if (cfg.autoNudge) watchdogTimer = setInterval(() => { void runWatchdog() }, 60000)
  setTimeout(() => { void recoverPendingLinks() }, 5000)
  setTimeout(() => { void backfillProjects() }, 3000)
  setTimeout(() => { void relocalizePrefixes() }, 4000)
  setTimeout(() => { if (alive) void recoverQueues() }, 6000)
  setTimeout(() => { if (alive) void remoteLoop() }, 2000)

  registerTools()
  registerCommand()

  // ---------------------------------------------------------------- storage

  /** Open the durable link table and hydrate the in-memory index. */
  async function openStorage() {
    const facility = ctx.get('storageDomain')
    if (facility === undefined) {
      storageState = 'memory'
      ctx.logger.info('collab-pair: no storage domain; collaboration links are kept in memory for this run')
      return undefined
    }
    try {
      const domain = await facility.open(STORAGE_DOMAIN)
      const stored = [...domain.table('links').entries()].sort((left, right) => (left[1]?.updatedAt ?? 0) - (right[1]?.updatedAt ?? 0))
      for (const [key, value] of stored) adoptStoredLink(key, value)
      storageState = 'ready'
      return domain
    } catch (error) {
      storageState = 'memory'
      storageError = String(error instanceof Error ? error.message : error)
      ctx.logger.warn(`collab-pair: durable storage is unavailable; links are kept in memory: ${String(error)}`)
      return undefined
    }
  }

  /** Wait for the storage attempt once; tools always work afterwards. */
  async function ensureStorage() {
    return domainReady.catch(() => undefined)
  }

  /** Validate and index one stored record, ignoring anything malformed. */
  function adoptStoredLink(key, value) {
    if (value === null || typeof value !== 'object') return
    if (typeof value.id !== 'string' || value.id !== key) return
    if (typeof value.manager !== 'string' || typeof value.worker !== 'string') return
    if (value.manager === value.worker) return
    const link = normalizeLink(value)
    const existingId = byWorker.get(link.worker)
    if (existingId !== undefined && existingId !== link.id) {
      const existing = links.get(existingId)
      if (existing !== undefined) unindex(existing)
    }
    index(link)
  }

  /** Fill missing fields on a stored record. */
  function normalizeLink(value) {
    const status = value.status === DONE || value.status === STOPPED ? value.status : ACTIVE
    return {
      v: 1,
      id: value.id,
      manager: value.manager,
      worker: value.worker,
      label: typeof value.label === 'string' ? value.label : '',
      mode: value.mode === 'permanent' ? 'permanent' : 'temporary',
      project: typeof value.project === 'string' ? value.project : '',
      goal: typeof value.goal === 'string' ? value.goal : '',
      status,
      round: Number.isSafeInteger(value.round) && value.round >= 0 ? value.round : 0,
      pending: normalizePending(value.pending),
      lastReport: value.lastReport !== null && typeof value.lastReport === 'object' ? value.lastReport : null,
      history: Array.isArray(value.history) ? value.history.slice(-cfg.maxHistory) : [],
      stages: normalizeStages(value.stages),
      nudges: Number.isSafeInteger(value.nudges) && value.nudges >= 0 ? value.nudges : 0,
      ...(typeof value.lastNudgeAt === 'number' ? { lastNudgeAt: value.lastNudgeAt } : {}),
      ...(value.remote !== null && typeof value.remote === 'object'
        && typeof value.remote.device === 'string' && value.remote.device !== ''
        && typeof value.remote.alias === 'string' && value.remote.alias !== ''
        ? { remote: { device: value.remote.device, alias: value.remote.alias } }
        : {}),
      createdAt: Number.isFinite(value.createdAt) ? value.createdAt : Date.now(),
      updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : Date.now(),
      ...(typeof value.closedAt === 'number' ? { closedAt: value.closedAt } : {}),
      ...(typeof value.finalSummary === 'string' ? { finalSummary: value.finalSummary } : {}),
    }
  }

  /** Fill missing fields on a stored stage queue. */
  function normalizeStages(value) {
    if (!Array.isArray(value)) return []
    const stages = []
    for (const item of value.slice(0, 100)) {
      if (item === null || typeof item !== 'object') continue
      const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : ''
      if (prompt === '') continue
      const status = item.status === 'active' || item.status === 'done' ? item.status : 'pending'
      stages.push({
        id: typeof item.id === 'string' ? item.id : `st-${randomUUID().slice(0, 8)}`,
        title: typeof item.title === 'string' ? item.title : '',
        prompt,
        acceptance: typeof item.acceptance === 'string' ? item.acceptance : '',
        status,
        ...(typeof item.startedAt === 'number' ? { startedAt: item.startedAt } : {}),
        ...(typeof item.completedAt === 'number' ? { completedAt: item.completedAt } : {}),
        ...(typeof item.summary === 'string' ? { summary: item.summary } : {}),
      })
    }
    return stages
  }

  /** Fill missing fields on a stored pending round. */
  function normalizePending(value) {    if (value === null || typeof value !== 'object') return null
    if (!Number.isSafeInteger(value.round) || value.round < 1) return null
    if (typeof value.task !== 'string' || typeof value.requestId !== 'string') return null
    return {
      round: value.round,
      task: value.task,
      acceptance: typeof value.acceptance === 'string' ? value.acceptance : '',
      requestId: value.requestId,
      dispatchedAt: Number.isFinite(value.dispatchedAt) ? value.dispatchedAt : Date.now(),
      report: normalizeReport(value.report),
    }
  }

  /** Fill missing fields on a stored worker report. */
  function normalizeReport(value) {
    if (value === null || typeof value !== 'object') return null
    if (typeof value.summary !== 'string') return null
    return {
      summary: value.summary,
      status: REPORTS.has(value.status) ? value.status : 'partial',
      details: typeof value.details === 'string' ? value.details : '',
      next: typeof value.next === 'string' ? value.next : '',
      reportedAt: Number.isFinite(value.reportedAt) ? value.reportedAt : Date.now(),
    }
  }

  /** Persist one link record; a storage failure never breaks the live loop. */
  async function persist(link) {
    const domain = await ensureStorage()
    if (domain === undefined) return
    try {
      await domain.table('links').put(link.id, JSON.parse(JSON.stringify(link)))
    } catch (error) {
      ctx.logger.warn(`collab-pair: persisting link ${link.id} failed: ${String(error)}`)
    }
  }

  // --------------------------------------------------------- relay transport

  /** Open the alias/cursor table used by the relay transport. */
  async function openRemoteStorage() {
    const facility = ctx.get('storageDomain')
    if (facility === undefined) {
      remoteState = 'memory'
      return undefined
    }
    try {
      const domain = await facility.open(REMOTE_DOMAIN)
      for (const [key, value] of domain.table('aliases').entries()) adoptAlias(key, value)
      for (const [key, value] of domain.table('state').entries()) {
        if (key === 'cursor' && Number.isSafeInteger(value?.cursor) && value.cursor >= 0) remoteCursor = value.cursor
        if (key === 'ntfy_cursor' && typeof value?.id === 'string') remoteNtfyCursor = value.id
      }
      remoteDomain = domain
      remoteState = 'ready'
      return domain
    } catch (error) {
      remoteState = 'memory'
      ctx.logger.warn(`collab-pair: remote storage is unavailable; aliases are kept in memory: ${String(error)}`)
      return undefined
    }
  }

  /** Validate one stored alias record. */
  function adoptAlias(key, value) {
    if (value === null || typeof value !== 'object') return
    if (typeof value.alias !== 'string' || value.alias !== key) return
    if (typeof value.session !== 'string' || value.session === '') return
    remoteAliases.set(key, {
      alias: key,
      session: value.session,
      updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : Date.now(),
    })
  }

  /** Persist one alias record. */
  async function persistAlias(record) {
    const domain = await remoteReady.catch(() => undefined)
    if (domain === undefined) return
    try {
      await domain.table('aliases').put(record.alias, { ...record })
    } catch (error) {
      ctx.logger.warn(`collab-pair: persisting alias ${record.alias} failed: ${String(error)}`)
    }
  }

  /** Delete one alias record. */
  async function deleteAliasRecord(alias) {
    const domain = await remoteReady.catch(() => undefined)
    if (domain === undefined) return
    try {
      await domain.table('aliases').delete(alias)
    } catch (error) {
      ctx.logger.warn(`collab-pair: deleting alias ${alias} failed: ${String(error)}`)
    }
  }

  /** Persist the poll cursor so a restart does not replay old rounds. */
  async function saveRemoteCursor() {
    const domain = await remoteReady.catch(() => undefined)
    if (domain === undefined) return
    try {
      await domain.table('state').put('cursor', { cursor: remoteCursor, updatedAt: Date.now() })
      if (remoteNtfyCursor !== '') await domain.table('state').put('ntfy_cursor', { id: remoteNtfyCursor, updatedAt: Date.now() })
    } catch (error) {
      ctx.logger.warn(`collab-pair: saving the relay cursor failed: ${String(error)}`)
    }
  }

  // ------------------------------------------------------------ session to-do

  function normalizeQueue(value, sessionId) {
    const items = []
    for (const item of Array.isArray(value?.items) ? value.items : []) {
      if (item === null || typeof item !== 'object') continue
      const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : ''
      if (prompt === '') continue
      const status = item.status === 'sent' || item.status === 'done' || item.status === 'failed' ? item.status : 'pending'
      items.push({
        id: typeof item.id === 'string' ? item.id : `q-${randomUUID().slice(0, 8)}`,
        title: typeof item.title === 'string' ? item.title : '',
        prompt,
        status,
        ...(typeof item.sentAt === 'number' ? { sentAt: item.sentAt } : {}),
        ...(typeof item.completedAt === 'number' ? { completedAt: item.completedAt } : {}),
        ...(typeof item.requestId === 'string' ? { requestId: item.requestId } : {}),
        ...(typeof item.marker === 'string' ? { marker: item.marker } : {}),
      })
    }
    // Keep every pending/sent/failed item; only trim the oldest done history.
    const doneIndexes = []
    for (let index = 0; index < items.length; index++) {
      if (items[index].status === 'done') doneIndexes.push(index)
    }
    const keepDone = new Set(doneIndexes.slice(-QUEUE_DONE_LIMIT))
    const kept = items.filter((item, index) => item.status !== 'done' || keepDone.has(index))
    let activeId = typeof value?.activeId === 'string' ? value.activeId : null
    if (activeId !== null && !kept.some((item) => item.id === activeId && item.status === 'sent')) activeId = null
    if (activeId === null) {
      const sent = kept.find((item) => item.status === 'sent')
      if (sent !== undefined) activeId = sent.id
    }
    return {
      sessionId,
      items: kept,
      activeId,
      auto: value?.auto !== false,
      started: value?.started === true || kept.some((item) => item.status === 'sent' || item.status === 'done' || item.status === 'failed'),
      lastError: typeof value?.lastError === 'string' && value.lastError !== '' ? value.lastError : null,
      updatedAt: Number.isFinite(value?.updatedAt) ? value.updatedAt : Date.now(),
    }
  }

  async function readQueue(sessionId) {
    const cached = queues.get(sessionId)
    if (cached !== undefined) return cached
    let stored
    const domain = await remoteReady.catch(() => undefined)
    if (domain !== undefined) {
      try {
        stored = [...domain.table('state').entries()].find(([key]) => key === `queue:${sessionId}`)?.[1]
      } catch (error) {
        ctx.logger.warn(`collab-pair: reading the queue for ${sessionId} failed: ${String(error)}`)
      }
    }
    const queue = normalizeQueue(stored, sessionId)
    queues.set(sessionId, queue)
    return queue
  }

  async function persistQueue(queue) {
    queues.set(queue.sessionId, queue)
    const domain = await remoteReady.catch(() => undefined)
    if (domain === undefined) return
    try {
      await domain.table('state').put(`queue:${queue.sessionId}`, JSON.parse(JSON.stringify(queue)))
    } catch (error) {
      ctx.logger.warn(`collab-pair: persisting the queue for ${queue.sessionId} failed: ${String(error)}`)
    }
  }

  function queueView(queue) {
    return {
      sessionId: queue.sessionId,
      auto: queue.auto,
      active: queue.activeId,
      lastError: queue.lastError ?? null,
      items: queue.items.map((item) => ({
        id: item.id,
        title: item.title,
        prompt: clip(item.prompt, 400),
        status: item.status,
        ...(item.sentAt === undefined ? {} : { sentAt: isoTime(item.sentAt) }),
        ...(item.completedAt === undefined ? {} : { completedAt: isoTime(item.completedAt) }),
      })),
    }
  }

  /** Send the first pending prompt as a normal user turn. */
  async function startQueueItem(sessionId, signal) {
    const queue = await readQueue(sessionId)
    if (queue.activeId !== null) throw new CollabError('当前待办仍在等待完成；先等这一轮结束，或暂停队列。')
    const next = queue.items.find((item) => item.status === 'pending')
    if (next === undefined) throw new CollabError('队列里没有待发送的提示词。')
    const index = queue.items.indexOf(next) + 1
    const requestId = `cp-queue-${sessionId}-${next.id}`
    const marker = `[[collab-queue:${next.id}]]`
    next.status = 'sent'
    next.sentAt = Date.now()
    next.requestId = requestId
    next.marker = marker
    queue.activeId = next.id
    queue.started = true
    queue.lastError = null
    queue.updatedAt = Date.now()
    await persistQueue(queue)
    const text = [
      `【对话待办 ${index}/${queue.items.length}】`,
      ...(next.title === '' ? [] : [next.title]),
      '',
      next.prompt,
      '',
      '完成本轮后直接给出结果；若队列还有下一条，会在本轮结束后自动发送。',
      marker,
    ].join('\n')
    try {
      await deliver(sessionId, text, requestId, 'queue', signal ?? AbortSignal.timeout(PROMPT_TIMEOUT_MS))
    } catch (error) {
      next.status = 'pending'
      delete next.sentAt
      delete next.requestId
      delete next.marker
      queue.activeId = null
      queue.lastError = clip(error instanceof Error ? error.message : String(error), 500)
      queue.updatedAt = Date.now()
      await persistQueue(queue)
      throw error
    }
    return { queue, item: next }
  }

  /** Finish the active queue turn and send the next prompt when auto is on. */
  async function advanceQueue(session, event) {
    const queue = await readQueue(session.id)
    if (queue.activeId === null) return
    const active = queue.items.find((item) => item.id === queue.activeId && item.status === 'sent')
    if (active === undefined) return
    const turn = event.data?.turn
    if (!Number.isSafeInteger(turn)) return
    let events
    try {
      events = turnEvents(session, turn, event.seq)
    } catch (error) {
      ctx.logger.warn(`collab-pair: reading a queue turn failed: ${String(error)}`)
      return
    }
    if (events === undefined || !claimedQueue(events, active)) return
    const reason = event.data?.reason
    const kind = typeof reason?.kind === 'string' ? reason.kind : (typeof reason === 'string' && reason !== '' ? reason : 'unknown')
    if (kind !== 'completed' && kind !== 'max-tokens') {
      active.status = 'failed'
      queue.activeId = null
      queue.auto = false
      queue.lastError = '本轮结束原因：' + kind + '；未自动续发。'
      queue.updatedAt = Date.now()
      await persistQueue(queue)
      return
    }
    active.status = 'done'
    active.completedAt = Date.now()
    queue.activeId = null
    queue.lastError = null
    queue.updatedAt = Date.now()
    trimQueue(queue)
    await persistQueue(queue)
    if (!queue.auto) return
    if (queue.items.some((item) => item.status === 'pending')) {
      try {
        await startQueueItem(session.id, AbortSignal.timeout(PROMPT_TIMEOUT_MS))
      } catch (error) {
        queue.lastError = clip(error instanceof Error ? error.message : String(error), 500)
        queue.updatedAt = Date.now()
        await persistQueue(queue)
        ctx.logger.warn(`collab-pair: sending the next queue item for ${session.id} failed: ${String(error)}`)
      }
    }
  }

  function claimedQueue(events, item) {
    if (typeof item.requestId !== 'string' || item.requestId === '') return false
    for (const event of events) {
      if (event.type !== 'user/message') continue
      if (event.data?.source?.rpcId === item.requestId) return true
    }
    return false
  }

  /** Keep all live items but only the newest done history. */
  function trimQueue(queue) {
    const done = queue.items.filter((item) => item.status === 'done')
    if (done.length <= QUEUE_DONE_LIMIT) return
    const keep = new Set(done.slice(-QUEUE_DONE_LIMIT).map((item) => item.id))
    queue.items = queue.items.filter((item) => item.status !== 'done' || keep.has(item.id))
  }

  /** Return every sent item to pending and clear the active/failure state. */
  async function resetQueue(sessionId) {
    const queue = await readQueue(sessionId)
    for (const item of queue.items) {
      if (item.status !== 'sent') continue
      item.status = 'pending'
      delete item.sentAt
      delete item.requestId
      delete item.marker
    }
    queue.activeId = null
    queue.lastError = null
    queue.updatedAt = Date.now()
    await persistQueue(queue)
    return queue
  }

  /** Resume idle auto-advance queues after activation. */
  async function recoverQueues() {
    try {
      const candidates = new Map(queues)
      const domain = await remoteReady.catch(() => undefined)
      if (domain !== undefined) {
        try {
          for (const [key, value] of domain.table('state').entries()) {
            if (typeof key !== 'string' || !key.startsWith('queue:')) continue
            const sessionId = key.slice('queue:'.length)
            if (sessionId === '') continue
            if (!queues.has(sessionId)) queues.set(sessionId, normalizeQueue(value, sessionId))
            candidates.set(sessionId, queues.get(sessionId))
          }
        } catch (error) {
          ctx.logger.warn('collab-pair: scanning queues for recovery failed: ' + String(error))
        }
      }
      for (const [sessionId, queue] of candidates) {
        if (!alive) return
        if (queue === undefined || queue.auto !== true || queue.started !== true || queue.activeId !== null) continue
        if (!queue.items.some((item) => item.status === 'pending')) continue
        try {
          const current = await readQueue(sessionId)
          if (current.auto !== true || current.started !== true || current.activeId !== null) continue
          if (!current.items.some((item) => item.status === 'pending')) continue
          await startQueueItem(sessionId, AbortSignal.timeout(PROMPT_TIMEOUT_MS))
        } catch (error) {
          const current = await readQueue(sessionId).catch(() => undefined)
          if (current !== undefined && current.activeId === null) {
            current.lastError = clip(error instanceof Error ? error.message : String(error), 500)
            current.updatedAt = Date.now()
            await persistQueue(current)
          }
          ctx.logger.warn('collab-pair: recovering the queue for ' + sessionId + ' failed: ' + String(error))
        }
      }
    } catch (error) {
      ctx.logger.warn('collab-pair: queue recovery failed: ' + String(error))
    }
  }

  function hubConfigured() {
    return cfg.relayMode === 'hub' && cfg.hubUrl !== '' && cfg.hubToken !== ''
  }

  function ntfyConfigured() {
    return cfg.relayMode === 'ntfy' && cfg.hubToken !== '' && cfg.hubRoom !== ''
  }

  function relayConfigured() {
    return hubConfigured() || ntfyConfigured()
  }

  /** Client-safe view of the relay configuration and its last poll. */
  function relayStatus() {
    return {
      mode: cfg.relayMode,
      device: cfg.deviceName,
      room: cfg.hubRoom,
      hubUrl: cfg.hubUrl,
      hasToken: cfg.hubToken !== '',
      connected: remoteLastPollAt > 0,
      lastPollAt: remoteLastPollAt === 0 ? null : isoTime(remoteLastPollAt),
      lastError: remoteLastError,
      cursor: cfg.relayMode === 'ntfy' ? (remoteNtfyCursor || null) : remoteCursor,
    }
  }

  /** One authenticated JSON request to the relay. */
  async function hubFetch(path, options = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 25000)
    try {
      const response = await fetch(`${cfg.hubUrl}${path}`, {
        ...options,
        headers: {
          authorization: `Bearer ${cfg.hubToken}`,
          ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
          ...(options.headers ?? {}),
        },
        signal: controller.signal,
      })
      const body = await response.json().catch(() => null)
      if (!response.ok || body?.ok !== true) throw new Error(body?.error ?? `relay HTTP ${response.status}`)
      return body
    } finally {
      clearTimeout(timer)
    }
  }

  /** Queue one message for another device. */
  async function sendRemote(to, type, payload) {
    if (!relayConfigured()) {
      throw new CollabError('跨设备中继未启用：请在设置页的「跨设备协作」里选择中继并保存。')
    }
    if (cfg.relayMode === 'ntfy') return ntfySend(to, type, payload)
    return hubFetch('/v1/send', {
      method: 'POST',
      body: JSON.stringify({ room: cfg.hubRoom, from: cfg.deviceName, to, type, payload }),
    })
  }

  /** One long-poll round against the self-hosted hub. */
  async function hubPollOnce() {
    if (remoteCursor === 0) {
      const head = await hubFetch(`/v1/head?room=${encodeURIComponent(cfg.hubRoom)}`)
      remoteCursor = Number.isSafeInteger(head.cursor) ? head.cursor : 0
      await saveRemoteCursor()
    }
    const query = `?room=${encodeURIComponent(cfg.hubRoom)}&device=${encodeURIComponent(cfg.deviceName)}&since=${remoteCursor}`
    const result = await hubFetch(`/v1/poll${query}`)
    remoteLastPollAt = Date.now()
    remoteLastError = null
    let advanced = false
    for (const message of Array.isArray(result.messages) ? result.messages : []) {
      if (!Number.isSafeInteger(message?.id) || message.id <= remoteCursor) continue
      remoteCursor = message.id
      advanced = true
      try {
        await handleRemoteMessage(message)
      } catch (error) {
        ctx.logger.warn(`collab-pair: handling relay message ${message.id} failed: ${String(error)}`)
      }
    }
    if (advanced) await saveRemoteCursor()
  }

  /** Topic derived from room + token, so the free relay needs no account. */
  function ntfyTopic() {
    const digest = createHash('sha256').update(`${cfg.hubRoom}:${cfg.hubToken}`).digest('hex')
    return `collab-${digest.slice(0, 32)}`
  }

  /** Publish one envelope through ntfy.sh, chunked under its 4 KB limit. */
  async function ntfySend(to, type, payload) {
    const envelope = { room: cfg.hubRoom, from: cfg.deviceName, to, type, payload, at: Date.now() }
    const encoded = Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64')
    const id = randomUUID()
    const size = 2400
    const total = Math.max(1, Math.ceil(encoded.length / size))
    for (let part = 1; part <= total; part += 1) {
      const chunk = JSON.stringify({ v: 1, id, part, of: total, data: encoded.slice((part - 1) * size, part * size) })
      const body = JSON.stringify({ topic: ntfyTopic(), message: chunk, priority: 3 })
      const response = await fetch('https://ntfy.sh', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal: AbortSignal.timeout(20000),
      })
      if (!response.ok) throw new Error(`ntfy 发布失败：HTTP ${response.status}`)
    }
  }

  /** Reassemble a chunked ntfy message and route it. */
  function ntfyIngest(message) {
    let chunk
    try {
      chunk = JSON.parse(message)
    } catch {
      return
    }
    if (chunk === null || typeof chunk !== 'object' || chunk.v !== 1 || typeof chunk.id !== 'string' || !Number.isSafeInteger(chunk.part) || !Number.isSafeInteger(chunk.of)) return
    const entry = ntfyParts.get(chunk.id) ?? { of: chunk.of, parts: new Map() }
    entry.parts.set(chunk.part, typeof chunk.data === 'string' ? chunk.data : '')
    ntfyParts.set(chunk.id, entry)
    if (entry.parts.size < entry.of) return
    ntfyParts.delete(chunk.id)
    const joined = []
    for (let part = 1; part <= entry.of; part += 1) joined.push(entry.parts.get(part) ?? '')
    let envelope
    try {
      envelope = JSON.parse(Buffer.from(joined.join(''), 'base64').toString('utf8'))
    } catch {
      return
    }
    if (envelope === null || typeof envelope !== 'object') return
    if (envelope.to !== cfg.deviceName && envelope.to !== '*') return
    if (envelope.from === cfg.deviceName) return
    void handleRemoteMessage(envelope).catch((error) => ctx.logger.warn(`collab-pair: handling an ntfy message failed: ${String(error)}`))
  }

  /** Poll the free ntfy relay once. */
  async function ntfyPollOnce() {
    const since = remoteNtfyCursor === '' ? '10m' : remoteNtfyCursor
    const url = `https://ntfy.sh/${encodeURIComponent(ntfyTopic())}/json?poll=1&since=${encodeURIComponent(since)}`
    const response = await fetch(url, { signal: AbortSignal.timeout(25000) })
    if (!response.ok) throw new Error(`ntfy 轮询失败：HTTP ${response.status}`)
    const text = await response.text()
    remoteLastPollAt = Date.now()
    remoteLastError = null
    let advanced = false
    for (const line of text.split('\n')) {
      if (line.trim() === '') continue
      let event
      try {
        event = JSON.parse(line)
      } catch {
        continue
      }
      if (event?.event !== 'message' || typeof event.message !== 'string') continue
      if (typeof event.id === 'string') remoteNtfyCursor = event.id
      advanced = true
      ntfyIngest(event.message)
    }
    if (advanced) await saveRemoteCursor()
    if (!advanced) await new Promise((resolve) => setTimeout(resolve, 2500))
  }

  /** Poll the configured relay and dispatch incoming envelopes. */
  async function remoteLoop() {
    if (!relayConfigured()) return
    ctx.logger.info(`collab-pair: ${cfg.relayMode} relay for ${cfg.deviceName} on room ${cfg.hubRoom}`)
    while (alive && relayConfigured()) {
      try {
        if (cfg.relayMode === 'ntfy') await ntfyPollOnce()
        else await hubPollOnce()
      } catch (error) {
        remoteLastError = String(error instanceof Error ? error.message : error)
        ctx.logger.warn(`collab-pair: relay poll failed: ${remoteLastError}`)
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }
    }
  }

  /** Route one relay envelope. */
  async function handleRemoteMessage(message) {
    if (message.from === cfg.deviceName) return
    if (message.type === 'dispatch') await handleRemoteDispatch(message)
    else if (message.type === 'report') await handleRemoteReport(message)
    else if (message.type === 'done') await handleRemoteDone(message)
    else if (message.type === 'error') await handleRemoteError(message)
  }

  /** Worker side: a manager dispatched a round to one local alias. */
  async function handleRemoteDispatch(message) {
    const payload = message.payload ?? {}
    const alias = aliasText(payload.alias)
    const linkId = typeof payload.linkId === 'string' ? payload.linkId : ''
    const round = Number.isSafeInteger(payload.round) ? payload.round : 0
    const reply = (type, extra) => sendRemote(message.from, type, { linkId, round, alias, device: cfg.deviceName, ...extra })
      .catch((error) => ctx.logger.warn(`collab-pair: replying ${type} to ${message.from} failed: ${String(error)}`))
    if (alias === '' || linkId === '' || round < 1) {
      await reply('error', { code: 'bad-dispatch', message: '派发消息缺少 alias/linkId/round。' })
      return
    }
    const record = remoteAliases.get(alias)
    if (record === undefined) {
      await reply('error', { code: 'no-alias', message: `本机没有别名 "${alias}"；先在员工设备上注册这个别名。` })
      return
    }
    const task = typeof payload.task === 'string' ? payload.task.trim() : ''
    if (task === '') {
      await reply('error', { code: 'empty-task', message: '任务为空。' })
      return
    }
    const acceptance = typeof payload.acceptance === 'string' ? payload.acceptance.trim() : ''
    const managerName = typeof payload.managerName === 'string' && payload.managerName !== '' ? payload.managerName : message.from
    const text = [
      `【远程协作任务 · 第 ${round} 轮】`,
      ...(typeof payload.project === 'string' && payload.project !== '' ? [`项目：${payload.project}`] : []),
      `来自：${managerName}（设备 ${message.from}）`,
      '',
      task,
      ...(acceptance === '' ? [] : ['', `验收标准：${acceptance}`]),
      '',
      '完成后直接在回复中给出结果与总结（改了哪些文件、如何验证）；不需要调用协作工具。',
      `[[collab:${linkId}:r${round}]]`,
    ].join('\n')
    const requestId = `cp-remote-${linkId}-r${round}`
    remoteInbound.set(record.session, { linkId, round, requestId, managerDevice: message.from, managerName, alias, dispatchedAt: Date.now() })
    try {
      await deliver(record.session, text, requestId, 'queue', AbortSignal.timeout(PROMPT_TIMEOUT_MS))
    } catch (error) {
      remoteInbound.delete(record.session)
      await reply('error', { code: 'deliver-failed', message: deliveryFailure(error) })
      return
    }
    await reply('ack', {})
  }

  /** Manager side: a remote worker finished a round. */
  async function handleRemoteReport(message) {
    const payload = message.payload ?? {}
    const link = remoteLink(payload.linkId)
    if (link === undefined) return
    const round = Number.isSafeInteger(payload.round) ? payload.round : 0
    if (link.pending === null || link.pending.round !== round) return
    const summary = clip(typeof payload.text === 'string' ? payload.text : '', cfg.maxRelayChars)
    if (summary === '') return
    const pending = { ...link.pending }
    const report = {
      summary,
      status: REPORTS.has(payload.status) ? payload.status : 'done',
      details: '',
      next: '',
      reportedAt: Date.now(),
    }
    link.pending = null
    link.round = Math.max(link.round, round)
    link.nudges = 0
    delete link.lastNudgeAt
    link.lastReport = {
      round,
      status: report.status,
      summary,
      details: '',
      next: '',
      text: summary,
      turnReason: L.reasonText('远程回报'),
      relayedAt: Date.now(),
      relayRequestId: `cp-${link.id}-r${round}-to-manager`,
    }
    link.history = [
      ...(link.history ?? []),
      { round, task: clip(pending.task, 300), status: report.status, summary: clip(summary, 500), at: Date.now() },
    ].slice(-cfg.maxHistory)
    link.updatedAt = Date.now()
    await persist(link)
    const text = reportText({ link, pending, report, finalText: summary, reason: '远程回报', workerTitle: link.label || link.remote.alias })
    if (!cfg.autoRelay) return
    try {
      await deliver(link.manager, text, link.lastReport.relayRequestId, 'queue', AbortSignal.timeout(PROMPT_TIMEOUT_MS))
    } catch (error) {
      link.lastReport.deliveryError = String(error instanceof Error ? error.message : error)
      await persist(link)
      ctx.logger.warn(`collab-pair: delivering a remote report for ${link.id} failed: ${String(error)}`)
      setTimeout(() => {
        if (!alive) return
        void deliver(link.manager, text, link.lastReport.relayRequestId, 'queue', AbortSignal.timeout(PROMPT_TIMEOUT_MS))
          .then(async () => {
            if (link.lastReport !== null && link.lastReport.deliveryError !== undefined) {
              delete link.lastReport.deliveryError
              await persist(link)
            }
          })
          .catch((retryError) => ctx.logger.warn(`collab-pair: remote relay retry for ${link.id} failed: ${String(retryError)}`))
      }, 60000)
    }
  }

  /** Worker side: the manager closed this collaboration. */
  async function handleRemoteDone(message) {
    const payload = message.payload ?? {}
    if (!cfg.notifyWorkerOnDone) return
    const record = remoteAliases.get(aliasText(payload.alias))
    if (record === undefined) return
    const summary = typeof payload.summary === 'string' ? clip(payload.summary, 2000) : ''
    const text = ['【协作结束】', '项目经理已结束本次远程协作。', ...(summary === '' ? [] : ['', `总结：${summary}`])].join('\n')
    try {
      await deliver(record.session, text, `cp-remote-done-${payload.linkId ?? Date.now()}`, 'queue', AbortSignal.timeout(PROMPT_TIMEOUT_MS))
    } catch (error) {
      ctx.logger.warn(`collab-pair: notifying the remote worker of completion failed: ${String(error)}`)
    }
  }

  /** Manager side: the remote device could not take the round. */
  async function handleRemoteError(message) {
    const payload = message.payload ?? {}
    const link = remoteLink(payload.linkId)
    if (link === undefined) return
    const detail = typeof payload.message === 'string' && payload.message !== '' ? payload.message : String(payload.code ?? '未知错误')
    const text = `【远程协作错误】\n设备 ${message.from} 无法接单：${detail}`
    try {
      await deliver(link.manager, text, `cp-${link.id}-remote-error-${Date.now()}`, 'queue', AbortSignal.timeout(PROMPT_TIMEOUT_MS))
    } catch (error) {
      ctx.logger.warn(`collab-pair: delivering a remote error for ${link.id} failed: ${String(error)}`)
    }
  }

  /** Worker side: relay the finished remote turn back to its manager. */
  async function handleRemoteTurnEnd(session, event, inbound) {
    const turn = event.data?.turn
    if (!Number.isSafeInteger(turn)) return
    let events
    try {
      events = turnEvents(session, turn, event.seq)
    } catch (error) {
      ctx.logger.warn(`collab-pair: reading a remote worker turn failed: ${String(error)}`)
      return
    }
    if (events === undefined) return
    if (!claimedBy(events, inbound)) return
    remoteInbound.delete(session.id)
    const finalText = lastAssistantText(events)
    const summary = clip(finalText === '' ? '（本轮没有返回文本）' : finalText, cfg.maxRelayChars)
    try {
      await sendRemote(inbound.managerDevice, 'report', {
        linkId: inbound.linkId,
        round: inbound.round,
        alias: inbound.alias,
        device: cfg.deviceName,
        status: 'done',
        text: summary,
      })
    } catch (error) {
      ctx.logger.warn(`collab-pair: sending a remote report to ${inbound.managerDevice} failed: ${String(error)}`)
    }
  }

  /** The remote link for a link id, or undefined for a local link. */
  function remoteLink(linkId) {
    const link = typeof linkId === 'string' ? links.get(linkId) : undefined
    return link?.remote === undefined ? undefined : link
  }

  function aliasText(value) {
    return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value.trim()) ? value.trim() : ''
  }

  // ------------------------------------------------------------- prompt text

  /**
   * Dynamic system-prompt section. It returns nothing for sessions outside an
   * active link, so it costs no tokens until a pair exists.
   */
  function sectionText(context) {
    const agentId = context?.agent?.id ?? context?.scope?.id
    if (typeof agentId !== 'string') return ''
    const managed = usableManagerLinks(agentId)
    if (managed.length > 0) {
      const rows = managed.slice(0, 8).map((link) => L.managerRow({
        label: link.label || (cfg.language === 'en' ? '(unnamed worker)' : '（未命名员工）'),
        worker: link.worker,
        round: link.round,
        state: link.status !== ACTIVE ? L.finished : link.pending === null ? L.idle : L.waiting,
        last: link.lastReport === null ? '' : L.statusLabel(link.lastReport.status),
      }))
      if (managed.length > 8) rows.push(L.moreWorkers(managed.length - 8))
      return L.managerSection({ count: managed.length, rows, maxRounds: cfg.maxRounds, project: managerProjectName(agentId) })
    }
    const link = workerAssociation(agentId)
    if (link === undefined) return ''
    return L.workerSection({ manager: link.manager, round: link.round, pending: link.pending !== null, project: link.project })
  }

  /** Render one dispatch message for a worker. */
  function dispatchText(link, round, task, acceptance) {
    return L.dispatch({ round, goal: link.goal, task, acceptance, marker: `[[collab:${link.id}:r${round}]]` })
  }

  /** Render the report the manager receives. */
  function reportText({ link, pending, report, finalText, reason, workerTitle }) {
    return L.report({
      round: pending.round,
      workerTitle,
      worker: link.worker,
      report,
      reason,
      finalText,
      maxRounds: cfg.maxRounds,
      nextRound: link.round + 1,
      marker: `[[collab:${link.id}:r${pending.round}:report]]`,
    })
  }

  /** Render the closing message for the worker. */
  function doneText(link, summary) {
    return L.done({ summary, marker: `[[collab:${link.id}:done]]` })
  }

  /** Localized label for a report status. */
  function statusLabel(status) {
    return L.statusLabel(status)
  }

  // -------------------------------------------------------------- delivery

  /** Resolve, resume, and wake one session with a prompt. */
  async function deliver(sessionId, text, requestId, mode, signal) {
    const controller = ctx.get('sessionController')
    if (controller === undefined) throw new CollabError('当前环境缺少 sessionController，无法投递协作消息。')
    const cancellation = signal ?? AbortSignal.timeout(PROMPT_TIMEOUT_MS)
    try {
      await controller.prompt(
        { requestId, sessionId, mode, content: [{ type: 'text', text }] },
        cancellation,
      )
    } catch (error) {
      throw new CollabError(deliveryFailure(error))
    }
  }

  // ---------------------------------------------------------------- session helpers

  /** Title of one session, or undefined. */
  async function titleOf(sessionId) {
    const query = ctx.get('sessionQuery')
    if (query === undefined) return undefined
    try {
      const snapshot = await query.readTitle(sessionId)
      return typeof snapshot?.title === 'string' ? snapshot.title : undefined
    } catch {
      return undefined
    }
  }

  /** Recent, linkable conversations with titles when the query service allows it. */
  async function candidateSessions(signal) {
    const controller = ctx.get('sessionController')
    const query = ctx.get('sessionQuery')
    const archived = new Set(ctx.get('workspaceRegistry')?.archivedSessionIds ?? [])
    const rows = []
    if (controller !== undefined) {
      const value = await controller.list({}, signal)
      for (const item of value?.items ?? []) {
        if (item?.blank === true) continue
        if (item?.origin === 'subagent') continue
        if (archived.has(item.sessionId)) continue
        rows.push({
          sessionId: item.sessionId,
          title: undefined,
          updatedAt: item.updatedAt,
          running: item.running === true,
        })
      }
    } else if (query !== undefined) {
      const records = await query.listSessions(signal)
      for (const record of records) {
        if (record?.header?.origin === 'subagent') continue
        if (archived.has(record.header.id)) continue
        rows.push({
          sessionId: record.header.id,
          title: undefined,
          updatedAt: record.header.createdAt,
          running: record.live === true,
        })
      }
      rows.sort((left, right) => right.updatedAt - left.updatedAt)
    } else {
      for (const agent of ctx.agents.list()) {
        rows.push({ sessionId: agent.id, title: undefined, updatedAt: Date.now(), running: agent.status === 'running' })
      }
    }
    if (query !== undefined && rows.length > 0) {
      try {
        const observations = await query.readTitleSnapshots(rows.slice(0, 60).map((row) => row.sessionId), signal)
        const titles = new Map()
        for (const observation of observations) {
          if (observation.status !== 'fulfilled') continue
          const title = observation.value?.title?.title
          if (typeof title === 'string') titles.set(observation.sessionId, title)
        }
        for (const row of rows) row.title = titles.get(row.sessionId)
      } catch {
        // Titles are presentation only; ids still resolve links.
      }
    }
    return rows
  }

  /** Resolve a peer written by the model: `new`, an exact id, or a title fragment. */
  async function resolvePeer(rawPeer, signal) {
    const peer = typeof rawPeer === 'string' ? rawPeer.trim() : ''
    if (peer === '') throw new CollabError('peer 不能为空：传 sessionId、标题关键词，或 "new" 新建一个员工对话。')
    if (peer === 'new' || peer === 'create') return { kind: 'new' }
    let candidates = []
    try {
      candidates = await candidateSessions(signal)
    } catch (error) {
      ctx.logger.warn(`collab-pair: listing sessions failed: ${String(error)}`)
    }
    const exact = candidates.find((row) => row.sessionId === peer)
    if (exact !== undefined) return { kind: 'existing', ...exact }
    if (ctx.sessions.get(peer) !== undefined || ctx.agents.get(peer) !== undefined) {
      return { kind: 'existing', sessionId: peer, title: await titleOf(peer), updatedAt: Date.now(), running: ctx.agents.get(peer)?.status === 'running' }
    }
    const needle = peer.toLowerCase()
    const matches = candidates.filter((row) => typeof row.title === 'string' && row.title.toLowerCase().includes(needle))
    if (matches.length === 1) return { kind: 'existing', ...matches[0] }
    if (matches.length > 1) {
      const list = matches.slice(0, 8).map((row) => `- ${row.sessionId}  ${row.title ?? ''}`).join('\n')
      throw new CollabError(`标题 "${peer}" 匹配到 ${matches.length} 个对话，请改用精确的 sessionId：\n${list}`)
    }
    if (candidates.length > 0) {
      const list = candidates.slice(0, 8).map((row) => `- ${row.sessionId}  ${row.title ?? '（未命名）'}`).join('\n')
      throw new CollabError(`没有找到对话 "${peer}"。可先调用 collab_sessions 查看候选，最近的对话有：\n${list}`)
    }
    throw new CollabError(`没有找到对话 "${peer}"，当前也没有可列出对话的服务。请传一个准确的 sessionId。`)
  }

  /** Create a fresh worker conversation in the manager's working directory. */
  async function createWorkerSession(callerId, requestedCwd, signal, agentPreset) {
    const controller = ctx.get('sessionController')
    if (controller === undefined) throw new CollabError('当前环境不支持新建对话；请先手动创建一个对话再关联。')
    const callerSession = ctx.sessions.get(callerId)
    const cwd = typeof requestedCwd === 'string' && requestedCwd.trim() !== ''
      ? requestedCwd.trim()
      : (callerSession === undefined ? undefined : ctx.get('workingDirectory')?.get(callerSession))
    const created = await controller.create({
      ...(cwd === undefined ? {} : { cwd }),
      ...(typeof agentPreset === 'string' && agentPreset !== '' ? { agentPreset } : {}),
    })
    const sessionId = created?.sessionId
    if (typeof sessionId !== 'string') throw new CollabError('新建对话失败：没有返回 sessionId。')
    const registry = ctx.get('workspaceRegistry')
    if (registry !== undefined && cwd !== undefined) {
      try {
        const workspace = await registry.resolveByPath(cwd)
        await workspace?.attachSession(sessionId)
      } catch (error) {
        ctx.logger.warn(`collab-pair: attaching new session ${sessionId} to its workspace failed: ${String(error)}`)
      }
    }
    return sessionId
  }

  // ------------------------------------------------------------------- links

  /** Resolve (and resume when needed) the live agent behind one worker session. */
  async function resolveWorkerAgent(sessionId) {
    const controller = ctx.get('sessionController')
    if (controller === undefined || typeof controller.resolveAgent !== 'function') throw new CollabError('当前环境缺少 sessionController。')
    let resolved
    try {
      resolved = await controller.resolveAgent(sessionId)
    } catch (error) {
      throw new CollabError(`无法打开员工对话 ${sessionId}：${error instanceof Error ? error.message : String(error)}`)
    }
    if (resolved === undefined || resolved === null || resolved.error !== undefined || resolved.agent === undefined) {
      const failure = resolved?.error
      throw new CollabError(`无法打开员工对话 ${sessionId}：${failure?.code ?? '未知错误'}${failure?.message ? `：${failure.message}` : ''}`)
    }
    return resolved.agent
  }

  /** Every link one manager owns, oldest first. */
  function managerLinks(managerId, activeOnly = false) {
    const ids = byManager.get(managerId)
    if (ids === undefined) return []
    const rows = []
    for (const id of ids) {
      const link = links.get(id)
      if (link === undefined) continue
      if (activeOnly && link.status !== ACTIVE) continue
      rows.push(link)
    }
    rows.sort((left, right) => left.createdAt - right.createdAt)
    return rows
  }

  /** The active link in which this session is the worker. */
  function workerLink(sessionId) {
    const linkId = byWorker.get(sessionId)
    return linkId === undefined ? undefined : links.get(linkId)
  }

  /** The worker link a session still belongs to, including a finished permanent one. */
  function workerAssociation(sessionId) {
    const active = workerLink(sessionId)
    if (active !== undefined) return active
    for (const link of links.values()) {
      if (link.worker === sessionId && link.mode === 'permanent') return link
    }
    return undefined
  }

  /** Links a manager can still act on: active ones plus permanent associations. */
  function usableManagerLinks(managerId) {
    return managerLinks(managerId).filter((link) => link.status === ACTIVE || link.mode === 'permanent')
  }

  /** Whether a manager still has a usable worker association. */
  function managerHasWork(managerId) {
    return usableManagerLinks(managerId).length > 0
  }

  /** The project name shared by one manager's links, or ''. */
  function managerProjectName(managerId) {
    for (const link of managerLinks(managerId)) {
      if (typeof link.project === 'string' && link.project !== '') return link.project
    }
    return ''
  }

  /** Rename the project shared by every link of one manager. */
  async function renameProject(managerId, name) {
    for (const link of managerLinks(managerId)) {
      if (link.project === name) continue
      link.project = name
      link.updatedAt = Date.now()
      await persist(link)
    }
  }

  /** Index one link by its manager and (while active) its worker. */
  function index(link) {
    links.set(link.id, link)
    let managed = byManager.get(link.manager)
    if (managed === undefined) {
      managed = new Set()
      byManager.set(link.manager, managed)
    }
    managed.add(link.id)
    if (link.status === ACTIVE) byWorker.set(link.worker, link.id)
    else if (byWorker.get(link.worker) === link.id) byWorker.delete(link.worker)
  }

  /** Drop one link from the in-memory index. */
  function unindex(link) {
    links.delete(link.id)
    const managed = byManager.get(link.manager)
    if (managed !== undefined) {
      managed.delete(link.id)
      if (managed.size === 0) byManager.delete(link.manager)
    }
    if (byWorker.get(link.worker) === link.id) byWorker.delete(link.worker)
  }

  /** Drop one link from memory and from durable storage. */
  async function forget(link) {
    unindex(link)
    const domain = await ensureStorage()
    if (domain === undefined) return
    try {
      await domain.table('links').delete(link.id)
    } catch (error) {
      ctx.logger.warn(`collab-pair: deleting link ${link.id} failed: ${String(error)}`)
    }
  }

  /** Human list of one manager's active workers. */
  function workerList(rows) {
    return rows.map((link) => `- ${link.label || '（未命名员工）'}：${link.worker}`).join('\n')
  }

  /** Remove one of our role prefixes from a title. */
  function stripKnownPrefix(title) {
    const known = new Set([
      cfg.prefixManager,
      cfg.prefixWorker,
      ...Object.values(PREFIX_DEFAULTS).flatMap((set) => [set.manager, set.worker]),
    ])
    for (const prefix of known) {
      if (prefix !== '' && title.startsWith(prefix)) return title.slice(prefix.length).trimStart()
    }
    return title
  }

  /** Rename one session: live titles directly, cold ones through the resuming controller. */
  async function renameSession(sessionId, title) {
    const session = ctx.sessions.get(sessionId)
    const titles = ctx.get('sessionTitle')
    if (session !== undefined && titles !== undefined && typeof titles.rename === 'function') {
      try {
        titles.rename(session, title)
        return true
      } catch (error) {
        ctx.logger.warn(`collab-pair: renaming live session ${sessionId} failed: ${String(error)}`)
      }
    }
    const controller = ctx.get('sessionController')
    if (controller === undefined || typeof controller.rename !== 'function') return false
    try {
      await controller.rename({ sessionId, title })
      return true
    } catch (error) {
      ctx.logger.warn(`collab-pair: renaming session ${sessionId} failed: ${String(error)}`)
      return false
    }
  }

  /** Ensure one session title starts with its role prefix, without stacking. */
  async function applyPrefix(sessionId, prefix) {
    if (!cfg.addPrefix || prefix === '') return
    const title = await titleOf(sessionId)
    if (typeof title !== 'string' || title === '') return
    if (title.startsWith(prefix)) return
    await renameSession(sessionId, `${prefix}${stripKnownPrefix(title)}`)
  }

  /** Remove our role prefix from one session title, keeping the rest. */
  async function clearPrefix(sessionId) {
    if (!cfg.addPrefix) return
    const title = await titleOf(sessionId)
    if (typeof title !== 'string' || title === '') return
    const stripped = stripKnownPrefix(title)
    if (stripped !== title && stripped !== '') await renameSession(sessionId, stripped)
  }

  /** Resolve one of a manager's active workers by id, link id, or label. */
  function resolveManagedLink(managerId, selector) {
    const candidates = usableManagerLinks(managerId)
    if (candidates.length === 0) throw new CollabError('当前对话没有可用的员工协作；先用 collab_link 关联一个员工。')
    const text = typeof selector === 'string' ? selector.trim() : ''
    if (text === '') {
      if (candidates.length === 1) return candidates[0]
      throw new CollabError(`当前对话有 ${candidates.length} 个员工，请用 worker 参数指定：\n${workerList(candidates)}`)
    }
    const exact = candidates.find((link) => link.worker === text || link.id === text)
    if (exact !== undefined) return exact
    const needle = text.toLowerCase()
    const matches = candidates.filter((link) => typeof link.label === 'string' && link.label !== '' && link.label.toLowerCase().includes(needle))
    if (matches.length === 1) return matches[0]
    if (matches.length > 1) throw new CollabError(`"${text}" 匹配到多个员工，请用 sessionId 指定：\n${workerList(matches)}`)
    throw new CollabError(`没有找到员工 "${text}"。当前员工：\n${workerList(candidates)}`)
  }

  /** Global board: every link, active first, with the labels a human needs. */
  async function tasksBoard() {
    const titles = new Map()
    const titleFor = async (sessionId) => {
      if (!titles.has(sessionId)) titles.set(sessionId, (await titleOf(sessionId)) ?? null)
      return titles.get(sessionId)
    }
    const sorted = [...links.values()].sort((left, right) => {
      const activeDelta = Number(right.status === ACTIVE) - Number(left.status === ACTIVE)
      return activeDelta !== 0 ? activeDelta : right.updatedAt - left.updatedAt
    })
    const rows = []
    for (const link of sorted) {
      const managerTitle = await titleFor(link.manager)
      const workerTitle = link.remote === undefined ? (await titleFor(link.worker)) ?? (link.label || null) : (link.label || link.remote.alias)
      const workerAgent = link.remote === undefined ? ctx.agents.get(link.worker) : undefined
      const managerAgent = ctx.agents.get(link.manager)
      rows.push({
        linkId: link.id,
        manager: link.manager,
        managerTitle: managerTitle ?? null,
        worker: link.worker,
        workerTitle: workerTitle ?? null,
        status: link.status,
        mode: link.mode,
        project: link.project || '',
        remote: link.remote ?? null,
        stages: link.stages ?? [],
        workerLive: workerAgent !== undefined,
        workerRunning: workerAgent !== undefined && workerAgent.status === 'running',
        managerRunning: managerAgent !== undefined && managerAgent.status === 'running',
        round: link.round,
        nudges: link.nudges,
        ...(link.lastNudgeAt === undefined ? {} : { lastNudgeAt: isoTime(link.lastNudgeAt) }),
        waitedSeconds: link.pending === null ? null : Math.max(0, Math.round((Date.now() - link.pending.dispatchedAt) / 1000)),
        pending: link.pending === null ? null : {
          round: link.pending.round,
          task: clip(link.pending.task, 400),
          acceptance: link.pending.acceptance === '' ? null : clip(link.pending.acceptance, 400),
          reported: link.pending.report !== null,
          dispatchedAt: isoTime(link.pending.dispatchedAt),
        },
        lastReport: link.lastReport === null ? null : {
          round: link.lastReport.round,
          status: link.lastReport.status,
          summary: clip(link.lastReport.summary, 400),
          turnReason: link.lastReport.turnReason,
          relayedAt: isoTime(link.lastReport.relayedAt),
          ...(link.lastReport.deliveryError === undefined ? {} : { deliveryError: link.lastReport.deliveryError }),
        },
        createdAt: isoTime(link.createdAt),
        updatedAt: isoTime(link.updatedAt),
      })
    }
    return {
      ok: true,
      generatedAt: isoTime(Date.now()),
      maxRounds: cfg.maxRounds === 0 ? null : cfg.maxRounds,
      maxNudges: cfg.maxNudges,
      language: cfg.language,
      activeCount: rows.filter((row) => row.status === ACTIVE).length,
      totalCount: rows.length,
      links: rows,
    }
  }

  /** Send one round to the worker and record it as pending. */
  async function dispatchRound(link, task, acceptance, signal, force) {
    if (link.status !== ACTIVE) {
      if (link.mode === 'permanent' && link.status === DONE) {
        link.status = ACTIVE
        delete link.closedAt
        index(link)
      } else {
        throw new CollabError(`与该员工的协作已结束（${link.status}），不能继续派发。`)
      }
    }
    if (link.pending !== null && !force) {
      throw new CollabError(`第 ${link.pending.round} 轮仍在等待该员工回报，不要重复派发；需要覆盖请传 force=true。`)
    }
    if (cfg.maxRounds > 0 && link.round >= cfg.maxRounds) {
      throw new CollabError(`已达到最大轮次 ${cfg.maxRounds}，请验收成果并调用 collab_done 收尾。`)
    }
    const round = link.round + 1
    const requestId = `cp-${link.id}-r${round}-to-worker`
    const previous = link.pending
    const previousRound = link.round
    link.round = round
    link.pending = {
      round,
      task,
      acceptance,
      requestId,
      dispatchedAt: Date.now(),
      report: null,
    }
    link.nudges = 0
    delete link.lastNudgeAt
    link.updatedAt = Date.now()
    await persist(link)
    try {
      if (link.remote !== undefined) {
        await sendRemote(link.remote.device, 'dispatch', {
          alias: link.remote.alias,
          linkId: link.id,
          round,
          task,
          acceptance,
          managerDevice: cfg.deviceName,
          managerName: (await titleOf(link.manager)) ?? null,
          project: link.project,
        })
      } else {
        await deliver(link.worker, dispatchText(link, round, task, acceptance), requestId, 'queue', signal)
      }
    } catch (error) {
      link.round = previousRound
      link.pending = previous
      link.updatedAt = Date.now()
      await persist(link)
      throw error
    }
    return { round, requestId }
  }

  /** Deliver the pending round's report to the manager. */
  async function relayReport(link, snapshot, events, reason) {
    const current = links.get(link.id)
    if (current === undefined || current.status !== ACTIVE) return
    const pending = current.pending
    if (pending === null || pending.round !== snapshot.round) return
    const report = pending.report ?? reportFrom(events)
    const finalText = clip(lastAssistantText(events), cfg.maxRelayChars)
    // A brand-new worker gets its title only after its first turn; prefix it now.
    await applyPrefix(current.worker, cfg.prefixWorker)
    const workerTitle = await titleOf(current.worker)
    if (workerTitle !== undefined && workerTitle !== current.label) current.label = workerTitle
    const status = report?.status ?? 'unreported'
    current.pending = null
    current.nudges = 0
    delete current.lastNudgeAt
    current.lastReport = {
      round: pending.round,
      status,
      summary: report?.summary ?? '',
      details: report?.details ?? '',
      next: report?.next ?? '',
      text: finalText,
      turnReason: L.reasonText(reason),
      relayedAt: Date.now(),
      relayRequestId: `cp-${current.id}-r${pending.round}-to-manager`,
    }
    current.history = [
      ...(current.history ?? []),
      {
        round: pending.round,
        task: clip(pending.task, 300),
        status,
        summary: clip(report?.summary ?? '', 500),
        at: Date.now(),
      },
    ].slice(-cfg.maxHistory)
    current.updatedAt = Date.now()
    await persist(current)
    if (!cfg.autoRelay) return
    const text = reportText({ link: current, pending, report, finalText, reason, workerTitle })
    const relayRequestId = current.lastReport.relayRequestId
    try {
      await deliver(current.manager, text, relayRequestId, 'queue', AbortSignal.timeout(PROMPT_TIMEOUT_MS))
    } catch (error) {
      current.lastReport.deliveryError = String(error instanceof Error ? error.message : error)
      await persist(current)
      ctx.logger.warn(`collab-pair: delivering round ${pending.round} for ${current.worker} to the manager failed: ${String(error)}`)
      // One bounded retry keeps an unattended run alive across a transient failure.
      setTimeout(() => {
        if (!alive) return
        void deliver(current.manager, text, relayRequestId, 'queue', AbortSignal.timeout(PROMPT_TIMEOUT_MS))
          .then(async () => {
            if (current.lastReport !== null && current.lastReport.deliveryError !== undefined) {
              delete current.lastReport.deliveryError
              await persist(current)
            }
          })
          .catch((retryError) => {
            ctx.logger.warn(`collab-pair: relay retry for ${current.id} failed: ${String(retryError)}`)
          })
      }, 60000)
    }
  }

  /**
   * Wake an idle manager when a worker link makes no progress for a long time,
   * so an unattended project does not stall silently. Bounded per link.
   */
  async function runWatchdog() {
    if (!alive || !cfg.autoNudge) return
    const now = Date.now()
    for (const link of [...links.values()]) {
      if (!alive) return
      if (link.status !== ACTIVE) continue
      if (link.pending !== null) continue
      if (link.nudges >= cfg.maxNudges) continue
      const since = link.lastNudgeAt ?? link.updatedAt
      if (now - since < cfg.nudgeAfterMinutes * 60000) continue
      const managerAgent = ctx.agents.get(link.manager)
      if (managerAgent !== undefined && managerAgent.status === 'running') continue
      const workerAgent = ctx.agents.get(link.worker)
      if (workerAgent !== undefined && workerAgent.status === 'running') continue
      const minutes = Math.max(1, Math.round((now - since) / 60000))
      const attempt = link.nudges + 1
      link.nudges = attempt
      link.lastNudgeAt = now
      link.updatedAt = now
      await persist(link)
      try {
        await deliver(
          link.manager,
          L.nudge({ worker: link.label || link.worker, minutes, attempt, max: cfg.maxNudges }),
          `cp-${link.id}-nudge-${attempt}`,
          'queue',
          AbortSignal.timeout(PROMPT_TIMEOUT_MS),
        )
      } catch (error) {
        ctx.logger.warn(`collab-pair: nudge for ${link.id} failed: ${String(error)}`)
      }
    }
  }

  /**
   * Recover a relay that was missed while the plugin was reloading: a live
   * worker may have finished a dispatched round before the listener returned.
   * Runs once shortly after activation.
   */
  async function recoverPendingLinks() {
    if (!alive) return
    for (const link of [...links.values()]) {
      if (!alive) return
      if (link.status !== ACTIVE || link.pending === null) continue
      const session = ctx.sessions.get(link.worker)
      if (session === undefined) continue
      const all = session.ownEvents()
      for (let index = all.length - 1; index >= 0; index--) {
        const event = all[index]
        if (event.type !== 'turn/end') continue
        let scoped
        try {
          scoped = turnEvents(session, event.data?.turn, event.seq)
        } catch {
          scoped = undefined
        }
        if (scoped === undefined) continue
        if (!claimedBy(scoped, { ...link.pending, linkId: link.id })) continue
        const snapshot = { ...link.pending }
        enqueueRelay(link.id, () => relayReport(link, snapshot, scoped, event.data?.reason))
        break
      }
    }
  }

  /**
   * Name links created before the project field existed: derive the project
   * from the manager conversation title once, then persist it.
   */
  async function backfillProjects() {
    if (!alive) return
    for (const link of [...links.values()]) {
      if (!alive) return
      if (typeof link.project === 'string' && link.project !== '') continue
      const title = await titleOf(link.manager)
      const name = typeof title === 'string' ? stripKnownPrefix(title) : ''
      if (name === '') continue
      link.project = name
      link.updatedAt = Date.now()
      await persist(link)
    }
  }

  /** Re-apply role prefixes in the current language after a language switch. */
  async function relocalizePrefixes() {
    if (!alive || !cfg.addPrefix) return
    for (const link of [...links.values()]) {
      if (!alive) return
      try {
        await applyPrefix(link.manager, cfg.prefixManager)
        if (link.remote === undefined) await applyPrefix(link.worker, cfg.prefixWorker)
      } catch (error) {
        ctx.logger.warn(`collab-pair: re-prefixing ${link.id} failed: ${String(error)}`)
      }
    }
  }

  /** Serialize relays per link so one turn cannot relay twice. */
  function enqueueRelay(linkId, run) {    const previous = relays.get(linkId) ?? Promise.resolve()
    const next = previous.then(run, run).catch((error) => {
      ctx.logger.warn(`collab-pair: relay for ${linkId} failed: ${String(error)}`)
    })
    relays.set(linkId, next)
    void next.finally(() => {
      if (relays.get(linkId) === next) relays.delete(linkId)
    })
  }

  /** Read the events of one completed turn. */
  function turnEvents(session, turn, endSeq) {
    const events = session.ownEvents()
    let start = -1
    for (const event of events) {
      if (event.seq >= endSeq) break
      if (event.type === 'turn/start' && event.data?.turn === turn) start = event.seq
    }
    if (start < 0) return undefined
    return events.filter((event) => event.seq > start && event.seq <= endSeq)
  }

  /** Whether this turn is the one that claimed our dispatch prompt. */
  function claimedBy(events, pending) {
    const marker = `[[collab:${pending.linkId}:r${pending.round}]]`
    for (const event of events) {
      if (event.type !== 'user/message') continue
      if (event.data?.source?.rpcId === pending.requestId) return true
      if (messageText(event.data).includes(marker)) return true
    }
    return false
  }

  /** Structured report from a `collab_report` tool call inside the turn. */
  function reportFrom(events) {
    for (let index = events.length - 1; index >= 0; index--) {
      const event = events[index]
      if (event.type !== 'tool/call' || event.data?.name !== 'collab_report') continue
      try {
        const parsed = JSON.parse(event.data.arguments)
        if (parsed === null || typeof parsed !== 'object' || typeof parsed.summary !== 'string') continue
        return {
          summary: parsed.summary,
          status: REPORTS.has(parsed.status) ? parsed.status : 'partial',
          details: typeof parsed.details === 'string' ? parsed.details : '',
          next: typeof parsed.next === 'string' ? parsed.next : '',
          reportedAt: event.time ?? Date.now(),
        }
      } catch {
        // A malformed call leaves the final message as the only report.
      }
    }
    return undefined
  }

  /** Last non-empty assistant text of one turn. */
  function lastAssistantText(events) {
    for (let index = events.length - 1; index >= 0; index--) {
      const event = events[index]
      if (event.type !== 'assistant/message') continue
      const text = messageText(event.data)
      if (text !== '') return text
    }
    return ''
  }

  /** Global post-commit listener: relay a worker turn that answered a dispatch. */
  function onSessionEvent(session, event) {
    if (event?.type !== 'turn/end') return
    void advanceQueue(session, event).catch((error) => ctx.logger.warn(`collab-pair: advancing a queue failed: ${String(error)}`))
    const inbound = remoteInbound.get(session.id)
    if (inbound !== undefined) {
      void handleRemoteTurnEnd(session, event, inbound)
      return
    }
    const linkId = byWorker.get(session.id)
    if (linkId === undefined) return
    const link = links.get(linkId)
    if (link === undefined || link.status !== ACTIVE) return
    const pending = link.pending
    if (pending === null) return
    const turn = event.data?.turn
    if (!Number.isSafeInteger(turn)) return
    let events
    try {
      events = turnEvents(session, turn, event.seq)
    } catch (error) {
      ctx.logger.warn(`collab-pair: reading the finished turn failed: ${String(error)}`)
      return
    }
    if (events === undefined) return
    if (!claimedBy(events, { ...pending, linkId: link.id })) return
    const snapshot = { ...pending }
    enqueueRelay(link.id, () => relayReport(link, snapshot, events, event.data?.reason))
  }

  // ------------------------------------------------------------------- tools

  /** Register the collaboration tools. */
  function registerTools() {
    toolExecutors.sessions = register({
      name: 'collab_sessions',
      description:
        '列出本机最近的对话（sessionId、标题、活跃时间、是否已加入协作），用于挑选协作对象。当用户要求把当前对话和另一个对话关联时先调用它；可用 query 按标题关键词过滤。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '可选：按标题关键词过滤。' },
          limit: { type: 'number', description: '可选：最多返回多少条，默认 12，最大 40。' },
        },
      },
      async execute(args, exec) {
        const agent = requireAgent(exec)
        const limit = clampInt(args?.limit, 1, 40, 12)
        const query = typeof args?.query === 'string' ? args.query.trim().toLowerCase() : ''
        let rows = []
        try {
          rows = await candidateSessions(exec.signal)
        } catch (error) {
          throw new CollabError(`读取对话列表失败：${String(error instanceof Error ? error.message : error)}`)
        }
        const sessions = rows
          .filter((row) => row.sessionId !== agent.id)
          .filter((row) => query === '' || (row.title ?? '').toLowerCase().includes(query) || row.sessionId.toLowerCase().includes(query))
          .slice(0, limit)
          .map((row) => {
            const worker = workerAssociation(row.sessionId)
            const managed = managerLinks(row.sessionId, true)
            return {
              sessionId: row.sessionId,
              title: row.title ?? null,
              updatedAt: isoTime(row.updatedAt),
              running: row.running === true,
              linked: worker !== undefined
                ? { role: 'worker', linkId: worker.id, status: worker.status }
                : managed.length > 0
                  ? { role: 'manager', workers: managed.length }
                  : false,
            }
          })
        return {
          ok: true,
          current: {
            sessionId: agent.id,
            role: managerHasWork(agent.id) ? 'manager' : workerAssociation(agent.id) === undefined ? null : 'worker',
          },
          sessions,
          note: sessions.length === 0
            ? '没有可关联的对话；可以用 collab_link 传 peer="new" 新建一个员工对话。'
            : '把选中的 sessionId 传给 collab_link 的 peer 参数即可关联。',
        }
      },
    })

    toolExecutors.link = register({
      name: 'collab_link',
      description:
        '把当前对话与另一个对话关联：role=manager（默认）表示当前对话是项目经理、对方成为新的员工；一个项目经理可以关联多个员工。role=worker 表示当前对话成为对方的员工。mode=temporary（默认，完成即解绑）或 permanent（一直关联直到人工解除）。peer 传 sessionId、标题关键词，或 "new"（新建一个员工对话）。',
      parameters: {
        type: 'object',
        properties: {
          peer: { type: 'string', description: 'sessionId、标题关键词，或 "new"。' },
          role: { type: 'string', enum: ['manager', 'worker'], description: '当前对话的角色，默认 manager。' },
          mode: { type: 'string', enum: ['temporary', 'permanent'], description: '关联模式：temporary 完成后自动解绑（默认），permanent 保留到人工解除。' },
          project: { type: 'string', description: '可选：项目名。同一个项目经理的员工会归到同一个项目，不同项目经理的项目彼此独立。' },
          goal: { type: 'string', description: '可选：项目总目标；不填时由项目经理在对话中掌握。' },
          task: { type: 'string', description: '可选：关联成功后立即派发给该员工的第一轮任务。' },
          acceptance: { type: 'string', description: '可选：第一轮任务的验收标准。' },
          cwd: { type: 'string', description: '可选：peer="new" 时新对话的工作目录，默认与当前对话相同。' },
        },
        required: ['peer'],
      },
      async execute(args, exec) {
        const agent = requireAgent(exec)
        const role = args?.role === 'worker' ? 'worker' : 'manager'
        const managed = managerLinks(agent.id, true)
        const ownWorker = workerAssociation(agent.id)
        if (workerLink(agent.id) !== undefined) {
          throw new CollabError(`当前对话已经是协作 ${ownWorker?.id ?? ''} 的员工，不能再加入其他协作；请先 collab_unlink。`)
        }
        if (ownWorker !== undefined) {
          throw new CollabError(`当前对话已永久关联到协作 ${ownWorker.id}（已结束）；请先 collab_unlink。`)
        }
        if (role === 'worker' && managed.length > 0) {
          throw new CollabError(`当前对话正在管理 ${managed.length} 个员工，不能同时作为别人的员工。`)
        }
        const goal = typeof args?.goal === 'string' ? args.goal.trim() : ''
        const requestedProject = typeof args?.project === 'string' ? args.project.trim() : ''
        let peerId
        let peerTitle
        const resolved = await resolvePeer(args?.peer, exec.signal)
        if (resolved.kind === 'new') {
          peerId = await createWorkerSession(agent.id, args?.cwd, exec.signal)
        } else {
          peerId = resolved.sessionId
          peerTitle = resolved.title
        }
        if (peerId === agent.id) throw new CollabError('不能把对话与它自己关联。')
        if (workerAssociation(peerId) !== undefined) {
          throw new CollabError(`目标对话 ${peerId} 已经是另一个协作的员工，请先解除那边的关联。`)
        }
        if (managerLinks(peerId, true).length > 0) {
          throw new CollabError(`目标对话 ${peerId} 正在管理其他员工，不能再担任员工或其他角色。`)
        }
        const manager = role === 'manager' ? agent.id : peerId
        const worker = role === 'manager' ? peerId : agent.id
        let project = requestedProject || managerProjectName(manager)
        if (project === '') {
          const managerTitle = await titleOf(manager)
          if (typeof managerTitle === 'string') project = stripKnownPrefix(managerTitle)
        }
        const link = {
          v: 1,
          id: `cp-${randomUUID().slice(0, 8)}`,
          manager,
          worker,
          label: role === 'manager' ? (typeof peerTitle === 'string' ? peerTitle : '') : '',
          mode: args?.mode === 'permanent' ? 'permanent' : 'temporary',
          project,
          goal,
          status: ACTIVE,
          round: 0,
          pending: null,
          lastReport: null,
          history: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        index(link)
        await persist(link)
        if (project !== '') await renameProject(manager, project)
        await applyPrefix(manager, cfg.prefixManager)
        await applyPrefix(worker, cfg.prefixWorker)
        let receipt = null
        const task = typeof args?.task === 'string' ? args.task.trim() : ''
        if (task !== '' && role === 'manager') {
          const acceptance = typeof args?.acceptance === 'string' ? args.acceptance.trim() : ''
          const sent = await dispatchRound(link, task, acceptance, exec.signal, false)
          receipt = { round: sent.round, dispatched: true }
        }
        let workerTitle = role === 'manager' ? (peerTitle ?? await titleOf(worker)) : await titleOf(worker)
        const prefixedTitle = await titleOf(worker)
        if (typeof prefixedTitle === 'string' && prefixedTitle !== '') workerTitle = prefixedTitle
        if (typeof workerTitle === 'string' && workerTitle !== link.label) {
          link.label = workerTitle
          await persist(link)
        }
        const managedNow = managerLinks(agent.id, true).length
        return {
          ok: true,
          linkId: link.id,
          role,
          mode: link.mode,
          manager,
          worker: { sessionId: worker, title: workerTitle ?? null },
          goal,
          round: link.round,
          receipt,
          message: role === 'manager'
            ? (receipt === null
              ? `已关联员工 ${worker}${link.mode === 'permanent' ? '（永久关联）' : '（临时关联，完成即解绑）'}${managedNow > 1 ? `，当前共 ${managedNow} 个员工` : ''}。用 collab_dispatch 派发任务。`
              : `已关联员工 ${worker}${link.mode === 'permanent' ? '（永久关联）' : '（临时关联，完成即解绑）'}${managedNow > 1 ? `，当前共 ${managedNow} 个员工` : ''}，第一轮任务已派发。`)
            : '协作已建立，你被设为员工角色；项目经理派发任务后会收到【协作任务】消息。',
        }
      },
    })

    toolExecutors.create = register({
      name: 'collab_worker_create',
      description:
        '创建一个新的员工对话，可命名、设 agent 预设/模型，默认立即关联到当前对话（项目经理）。相当于「新建对话 + collab_link(peer=new)」，也可以顺便派发第一轮任务。',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '可选：员工名，会作为对话标题（自动加【员工】前缀）。' },
          cwd: { type: 'string', description: '可选：新对话的工作目录，默认与当前对话相同。' },
          preset: { type: 'string', description: '可选：agent 预设 id（如 standard / ptc / minimal）。' },
          provider: { type: 'string', description: '可选：模型供应商 id（配合 model）。' },
          model: { type: 'string', description: '可选：模型 id。' },
          reasoningEffort: { type: 'string', description: '可选：推理强度。' },
          mode: { type: 'string', enum: ['temporary', 'permanent'], description: '关联模式，默认 temporary。' },
          project: { type: 'string', description: '可选：项目名。' },
          link: { type: 'boolean', description: '是否立即关联，默认 true。' },
          task: { type: 'string', description: '可选：创建后立即派发的第一轮任务。' },
          acceptance: { type: 'string', description: '可选：第一轮验收标准。' },
        },
      },
      async execute(args, exec) {
        const agent = requireAgent(exec)
        if (workerAssociation(agent.id) !== undefined) throw new CollabError('当前对话是员工，不能创建或管理员工。')
        const link = args?.link !== false
        const task = typeof args?.task === 'string' ? args.task.trim() : ''
        const acceptance = typeof args?.acceptance === 'string' ? args.acceptance.trim() : ''
        if (!link && task !== '') throw new CollabError('link=false 时不能派发任务；请先关联再派发。')
        const presetId = typeof args?.preset === 'string' ? args.preset.trim() : ''
        if (presetId !== '') {
          const presets = ctx.get('agentPresets')
          if (presets === undefined) throw new CollabError('当前环境没有 agentPresets 服务，无法设置预设。')
          const roster = await presets.list()
          if (!roster.some((preset) => preset.id === presetId || preset.name === presetId)) {
            throw new CollabError(`没有预设 "${presetId}"；可用：${roster.map((preset) => preset.id).join(' / ')}`)
          }
        }
        const providerId = typeof args?.provider === 'string' ? args.provider.trim() : ''
        const modelId = typeof args?.model === 'string' ? args.model.trim() : ''
        if (modelId !== '' && providerId === '') throw new CollabError('设置模型时还需要 provider。')
        const name = typeof args?.name === 'string' ? args.name.trim() : ''
        const sessionId = await createWorkerSession(agent.id, args?.cwd, exec.signal, presetId)
        let title = null
        if (name !== '') {
          const base = stripKnownPrefix(name)
          title = cfg.addPrefix ? `${cfg.prefixWorker}${base}` : base
          await renameSession(sessionId, title)
        }
        if (modelId !== '') {
          const controller = ctx.get('sessionController')
          if (controller === undefined || typeof controller.selectModel !== 'function') throw new CollabError('当前环境缺少 sessionController，无法设置模型。')
          const effort = typeof args?.reasoningEffort === 'string' ? args.reasoningEffort.trim() : ''
          await controller.selectModel({
            sessionId,
            provider: providerId,
            model: modelId,
            ...(effort === '' ? {} : { reasoningEffort: effort }),
          })
        }
        let linked = null
        if (link) {
          linked = await toolExecutors.link.execute({
            peer: sessionId,
            mode: args?.mode === 'permanent' ? 'permanent' : 'temporary',
            ...(typeof args?.project === 'string' && args.project.trim() !== '' ? { project: args.project.trim() } : {}),
          }, { agent, signal: exec.signal })
        }
        let receipt = null
        if (linked !== null && task !== '') {
          receipt = await toolExecutors.dispatch.execute({ task, acceptance, worker: sessionId }, { agent, signal: exec.signal })
        }
        return {
          ok: true,
          sessionId,
          title,
          linked: linked !== null,
          ...(linked === null ? {} : { linkId: linked.linkId, mode: linked.mode, project: managerProjectName(agent.id) || null }),
          ...(receipt === null ? {} : { round: receipt.round }),
          message: linked === null
            ? `已创建员工对话 ${sessionId}（未关联）。`
            : `已创建并关联员工 ${sessionId}${title === null ? '' : `（${title}）`}${receipt === null ? '' : `，第 ${receipt.round} 轮任务已派发`}。`,
        }
      },
      when: ({ agent }) => workerAssociation(agent.id) === undefined,
    })

    toolExecutors.remote = register({
      name: 'collab_remote',
      description:
        '跨设备协作：在设置页的「跨设备协作」里选择中继并保存（自建 hub 或免费 ntfy.sh）。action=alias 在员工设备上把当前对话注册成别名；action=link 在项目经理设备上关联远端设备上的别名；action=aliases / remove-alias / status 查看或维护。',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['alias', 'aliases', 'remove-alias', 'link', 'status'], description: '要执行的操作。' },
          alias: { type: 'string', description: 'alias/remove-alias：本机别名（字母、数字、下划线、连字符）。' },
          session: { type: 'string', description: 'alias：要注册的本地 sessionId，默认当前对话。' },
          device: { type: 'string', description: 'link：远端设备名（与那台设备的 deviceName 一致）。' },
          worker: { type: 'string', description: 'link：远端设备上的员工别名。' },
          name: { type: 'string', description: 'link：显示名，默认“别名@设备”。' },
          mode: { type: 'string', enum: ['temporary', 'permanent'], description: 'link：关联模式，默认 temporary。' },
          project: { type: 'string', description: 'link：项目名，默认当前经理的项目名。' },
        },
        required: ['action'],
      },
      async execute(args, exec) {
        const agent = requireAgent(exec)
        if (!relayConfigured()) throw new CollabError('跨设备中继未启用：请在设置页的「跨设备协作」里选择中继并保存。')
        await remoteReady.catch(() => undefined)
        const action = typeof args?.action === 'string' ? args.action : ''
        if (action === 'alias') {
          const alias = aliasText(args?.alias)
          if (alias === '') throw new CollabError('alias 必须由字母、数字、下划线或连字符组成，且不为空。')
          const sessionId = typeof args?.session === 'string' && args.session.trim() !== '' ? args.session.trim() : agent.id
          if (ctx.sessions.get(sessionId) === undefined) throw new CollabError(`找不到对话 ${sessionId}；请确认它当前是打开状态。`)
          const record = { alias, session: sessionId, updatedAt: Date.now() }
          remoteAliases.set(alias, record)
          await persistAlias(record)
          return {
            ok: true,
            action: 'alias',
            alias,
            session: sessionId,
            device: cfg.deviceName,
            hub: cfg.hubUrl,
            room: cfg.hubRoom,
            message: `已把本机对话 ${sessionId} 注册为远程员工别名 "${alias}"（设备 ${cfg.deviceName}）。`,
          }
        }
        if (action === 'aliases') {
          return {
            ok: true,
            action: 'aliases',
            device: cfg.deviceName,
            hub: cfg.hubUrl,
            room: cfg.hubRoom,
            aliases: [...remoteAliases.values()].sort((left, right) => left.alias.localeCompare(right.alias)),
            cursor: remoteCursor,
            lastPollAt: remoteLastPollAt === 0 ? null : isoTime(remoteLastPollAt),
            lastError: remoteLastError,
          }
        }
        if (action === 'remove-alias') {
          const alias = aliasText(args?.alias)
          if (alias === '') throw new CollabError('alias 不能为空。')
          const existed = remoteAliases.delete(alias)
          if (existed) await deleteAliasRecord(alias)
          return { ok: true, action: 'remove-alias', alias, removed: existed }
        }
        if (action === 'link') {
          if (workerAssociation(agent.id) !== undefined) throw new CollabError('当前对话是员工，不能作为远程协作的项目经理。')
          const device = typeof args?.device === 'string' ? args.device.trim() : ''
          if (!/^[A-Za-z0-9_-]{1,64}$/.test(device)) throw new CollabError('device 必须由字母、数字、下划线或连字符组成。')
          const worker = aliasText(args?.worker)
          if (worker === '') throw new CollabError('worker 必须是远端设备上的别名。')
          const existing = managerLinks(agent.id).find((link) => link.remote?.device === device && link.remote?.alias === worker && link.status === ACTIVE)
          if (existing !== undefined) throw new CollabError(`已经关联过 ${worker}@${device}（${existing.id}）。`)
          const name = typeof args?.name === 'string' ? args.name.trim() : ''
          const project = typeof args?.project === 'string' && args.project.trim() !== '' ? args.project.trim() : managerProjectName(agent.id)
          const link = {
            v: 1,
            id: `cp-${randomUUID().slice(0, 8)}`,
            manager: agent.id,
            worker: `remote:${device}:${worker}`,
            label: name === '' ? `${worker}@${device}` : name,
            mode: args?.mode === 'permanent' ? 'permanent' : 'temporary',
            project,
            goal: '',
            status: ACTIVE,
            round: 0,
            pending: null,
            lastReport: null,
            history: [],
            nudges: 0,
            remote: { device, alias: worker },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          index(link)
          await persist(link)
          await applyPrefix(agent.id, cfg.prefixManager)
          return {
            ok: true,
            action: 'link',
            linkId: link.id,
            worker: link.worker,
            label: link.label,
            mode: link.mode,
            project: link.project || null,
            remote: link.remote,
            hub: cfg.hubUrl,
            room: cfg.hubRoom,
            message: `已关联远程员工 ${link.label}（设备 ${device}，别名 ${worker}）。用 collab_dispatch 派发任务。`,
          }
        }
        if (action === 'status') {
          return {
            ok: true,
            action: 'status',
            device: cfg.deviceName,
            hub: cfg.hubUrl,
            room: cfg.hubRoom,
            cursor: remoteCursor,
            lastPollAt: remoteLastPollAt === 0 ? null : isoTime(remoteLastPollAt),
            lastError: remoteLastError,
            aliases: [...remoteAliases.values()],
            remoteLinks: managerLinks(agent.id)
              .filter((link) => link.remote !== undefined)
              .map((link) => ({
                linkId: link.id,
                label: link.label,
                device: link.remote.device,
                alias: link.remote.alias,
                status: link.status,
                mode: link.mode,
                round: link.round,
                pending: link.pending === null ? null : link.pending.round,
              })),
          }
        }
        throw new CollabError('action 必须是 alias | aliases | remove-alias | link | status。')
      },
    })

    toolExecutors.dispatch = register({
      name: 'collab_dispatch',
      description:
        '（仅项目经理）把本轮任务发给某个员工对话并立即返回。有多个员工时用 worker 指定（sessionId 或标题）；只有一个员工时可省略。员工完成后产出与反馈会自动回到本对话。该员工上一轮尚未回报时不要重复派发（需要覆盖传 force=true）。',
      parameters: {
        type: 'object',
        properties: {
          task: { type: 'string', description: '本轮要员工完成的任务，写清目标、范围和交付物。' },
          worker: { type: 'string', description: '可选：目标员工的 sessionId 或标题关键词；只有一个员工时可省略。' },
          acceptance: { type: 'string', description: '可选：本轮验收标准。' },
          force: { type: 'boolean', description: '可选：该员工上一轮尚未回报时强制覆盖派发。' },
        },
        required: ['task'],
      },
      async execute(args, exec) {
        const agent = requireAgent(exec)
        const link = resolveManagedLink(agent.id, args?.worker)
        const task = typeof args?.task === 'string' ? args.task.trim() : ''
        if (task === '') throw new CollabError('task 不能为空。')
        const acceptance = typeof args?.acceptance === 'string' ? args.acceptance.trim() : ''
        const sent = await dispatchRound(link, task, acceptance, exec.signal, args?.force === true)
        return {
          ok: true,
          linkId: link.id,
          round: sent.round,
          worker: link.worker,
          message: `第 ${sent.round} 轮任务已派发给员工 ${link.worker}。该员工完成后，产出与反馈会自动作为用户消息回到本对话。`,
        }
      },
      when: ({ agent }) => managerHasWork(agent.id),
    })

    toolExecutors.report = register({
      name: 'collab_report',
      description:
        '（仅员工）向插件汇报本轮任务结果：summary 是交付物/结论摘要，status 取 done（完成）、partial（部分完成）、blocked（受阻需决策），details 写细节，next 写建议。调用后结束本轮回复，插件会把汇报与你的最终产出一起回传给项目经理。',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: '交付物或结论摘要。' },
          status: { type: 'string', enum: ['done', 'partial', 'blocked'], description: '本轮状态。' },
          details: { type: 'string', description: '可选：细节、改动、验证结果。' },
          next: { type: 'string', description: '可选：给项目经理的建议或下一步。' },
        },
        required: ['summary', 'status'],
      },
      async execute(args, exec) {
        const agent = requireAgent(exec)
        const link = workerLink(agent.id)
        if (link === undefined) throw new CollabError('当前对话没有进行中的协作任务；你还没有被分配任务。')
        if (link.pending === null) throw new CollabError('当前没有等待回报的任务；汇报会在下一轮任务派发后生效。')
        const summary = typeof args?.summary === 'string' ? args.summary.trim() : ''
        if (summary === '') throw new CollabError('summary 不能为空。')
        const status = REPORTS.has(args?.status) ? args.status : 'partial'
        link.pending.report = {
          summary,
          status,
          details: typeof args?.details === 'string' ? args.details.trim() : '',
          next: typeof args?.next === 'string' ? args.next.trim() : '',
          reportedAt: Date.now(),
        }
        link.updatedAt = Date.now()
        await persist(link)
        return {
          ok: true,
          round: link.pending.round,
          status,
          message: '汇报已记录。请结束本轮回复；插件会把这份汇报与你的最终产出一起回传给项目经理。',
        }
      },
      when: ({ agent }) => workerLink(agent.id) !== undefined,
    })

    toolExecutors.status = register({
      name: 'collab_status',
      description:
        '查看协作状态：项目经理能看到所有员工（轮次、待回报任务、最近回报）；员工能看到自己的项目经理与当前任务。',
      parameters: { type: 'object', properties: {} },
      async execute(_args, exec) {
        const agent = requireAgent(exec)
        const managed = managerLinks(agent.id)
        const visible = managed.filter((link) => link.status === ACTIVE || link.mode === 'permanent')
        if (visible.length > 0) {
          const workers = []
          for (const link of visible) {
            const title = link.remote === undefined ? await titleOf(link.worker) : undefined
            if (title !== undefined && title !== link.label) link.label = title
            workers.push({
              linkId: link.id,
              worker: link.worker,
              title: title ?? (link.label || null),
              status: link.status,
              mode: link.mode,
              project: link.project || null,
              remote: link.remote ?? null,
              stages: link.stages ?? [],
              round: link.round,
              pending: link.pending === null
                ? null
                : {
                  round: link.pending.round,
                  task: clip(link.pending.task, 1200),
                  acceptance: link.pending.acceptance || null,
                  dispatchedAt: isoTime(link.pending.dispatchedAt),
                  waitedSeconds: Math.max(0, Math.round((Date.now() - link.pending.dispatchedAt) / 1000)),
                  reported: link.pending.report !== null,
                },
              lastReport: link.lastReport === null
                ? null
                : {
                  round: link.lastReport.round,
                  status: link.lastReport.status,
                  summary: link.lastReport.summary,
                  details: link.lastReport.details,
                  next: link.lastReport.next,
                  turnReason: link.lastReport.turnReason,
                  relayedAt: link.lastReport.relayedAt,
                  ...(link.lastReport.deliveryError === undefined ? {} : { deliveryError: link.lastReport.deliveryError }),
                },
              history: link.history,
            })
          }
          return {
            linked: true,
            storage: storageState,
            ...(storageError === null ? {} : { storageError }),
            engine: ENGINE,
            language: cfg.language,
            role: 'manager',
            project: managerProjectName(agent.id) || null,
            manager: { sessionId: agent.id, title: (await titleOf(agent.id)) ?? null },
            maxRounds: cfg.maxRounds === 0 ? null : cfg.maxRounds,
            activeCount: visible.filter((link) => link.status === ACTIVE).length,
            totalCount: managed.length,
            workers,
          }
        }
        const link = workerAssociation(agent.id)
        if (link === undefined) {
          return {
            linked: false,
            storage: storageState,
            ...(storageError === null ? {} : { storageError }),
            engine: ENGINE,
            language: cfg.language,
            hint: '当前对话没有协作关联。用 collab_sessions 查看可关联的对话，再用 collab_link 建立关联（peer="new" 可新建员工对话）。',
          }
        }
        const managerTitle = await titleOf(link.manager)
        return {
          linked: true,
          storage: storageState,
          ...(storageError === null ? {} : { storageError }),
          engine: ENGINE,
          language: cfg.language,
          linkId: link.id,
          role: 'worker',
          mode: link.mode,
          project: link.project || null,
          manager: { sessionId: link.manager, title: managerTitle ?? null },
          goal: link.goal || null,
          status: link.status,
          round: link.round,
          maxRounds: cfg.maxRounds === 0 ? null : cfg.maxRounds,
          pending: link.pending === null
            ? null
            : {
              round: link.pending.round,
              task: clip(link.pending.task, 1200),
              acceptance: link.pending.acceptance || null,
              dispatchedAt: isoTime(link.pending.dispatchedAt),
              reported: link.pending.report !== null,
            },
          lastReport: link.lastReport,
          history: link.history,
        }
      },
    })

    toolExecutors.configure = register({
      name: 'collab_configure',
      description:
        '（仅项目经理）配置某个员工的 agent 预设或模型，不用切到员工对话。只传 worker 时返回可选预设；传 preset 设置预设；传 provider+model 设置模型。有多个员工时用 worker 指定。',
      parameters: {
        type: 'object',
        properties: {
          worker: { type: 'string', description: '可选：员工 sessionId 或标题；只有一个员工时可省略。' },
          preset: { type: 'string', description: '可选：agent 预设 id（如 standard / ptc / minimal）。' },
          provider: { type: 'string', description: '可选：模型供应商 id（配合 model）。' },
          model: { type: 'string', description: '可选：模型 id。' },
          reasoningEffort: { type: 'string', description: '可选：推理强度。' },
        },
      },
      async execute(args, exec) {
        const agent = requireAgent(exec)
        const link = resolveManagedLink(agent.id, args?.worker)
        const presetId = typeof args?.preset === 'string' ? args.preset.trim() : ''
        const modelId = typeof args?.model === 'string' ? args.model.trim() : ''
        const providerId = typeof args?.provider === 'string' ? args.provider.trim() : ''
        const presets = ctx.get('agentPresets')
        if (presetId === '' && modelId === '') {
          const roster = presets === undefined ? [] : await presets.list()
          return {
            ok: true,
            worker: link.worker,
            presets: roster.map((preset) => preset.id),
            hint: presets === undefined
              ? '当前环境没有 agentPresets 服务。'
              : '传 preset 设置代理预设；传 provider+model 设置模型。',
          }
        }
        const configured = []
        if (presetId !== '') {
          if (presets === undefined || typeof presets.select !== 'function') throw new CollabError('当前环境没有 agentPresets 服务，无法设置预设。')
          const roster = await presets.list()
          const matched = roster.find((preset) => preset.id === presetId) ?? roster.find((preset) => preset.name === presetId)
          if (matched === undefined) throw new CollabError(`没有预设 "${presetId}"；可用：${roster.map((preset) => preset.id).join(' / ')}`)
          const workerAgent = await resolveWorkerAgent(link.worker)
          const accepted = await presets.select(workerAgent, matched.id)
          configured.push({ kind: 'preset', value: accepted })
        }
        if (modelId !== '') {
          if (providerId === '') throw new CollabError('设置模型时还需要 provider。')
          const controller = ctx.get('sessionController')
          if (controller === undefined || typeof controller.selectModel !== 'function') throw new CollabError('当前环境缺少 sessionController，无法设置模型。')
          const effort = typeof args?.reasoningEffort === 'string' ? args.reasoningEffort.trim() : ''
          const selected = await controller.selectModel({
            sessionId: link.worker,
            provider: providerId,
            model: modelId,
            ...(effort === '' ? {} : { reasoningEffort: effort }),
          })
          configured.push({ kind: 'model', value: selected?.selected ?? { provider: providerId, model: modelId } })
        }
        link.updatedAt = Date.now()
        await persist(link)
        return {
          ok: true,
          worker: link.worker,
          configured,
          message: '配置已应用；该员工下一轮会按新配置运行。',
        }
      },
      when: ({ agent }) => managerHasWork(agent.id),
    })

    toolExecutors.project = register({
      name: 'collab_project',
      description:
        '（仅项目经理）设置或修改当前项目名。项目名用于把该项目经理的员工归到同一个项目；不同项目经理的项目彼此独立。',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string', description: '新的项目名，不能为空。' } },
        required: ['name'],
      },
      async execute(args, exec) {
        const agent = requireAgent(exec)
        const name = typeof args?.name === 'string' ? args.name.trim() : ''
        if (name === '') throw new CollabError('项目名不能为空。')
        const existing = managerLinks(agent.id)
        if (existing.length === 0) throw new CollabError('当前对话还没有关联员工；先 collab_link 再设置项目名。')
        await renameProject(agent.id, name)
        return { ok: true, project: name, workers: existing.length }
      },
      when: ({ agent }) => managerLinks(agent.id).length > 0,
    })

    toolExecutors.stage = register({
      name: 'collab_stage',
      description:
        '（项目经理）阶段队列：人可以先写好多个大阶段的提示词。action=add 添加阶段，list 查看，start 开始第一个待开始阶段，complete 完成当前阶段并自动派发下一阶段，remove 删除待开始阶段。',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'list', 'start', 'complete', 'remove', 'clear'], description: '要执行的操作。' },
          worker: { type: 'string', description: '可选：目标员工（sessionId、标题或别名）。只有一个员工时可省略。' },
          prompt: { type: 'string', description: 'add：该阶段要派发的提示词/任务。' },
          acceptance: { type: 'string', description: 'add：该阶段的验收标准。' },
          title: { type: 'string', description: 'add：阶段标题，便于人查看。' },
          summary: { type: 'string', description: 'complete：本阶段总结（可选）。' },
          index: { type: 'number', description: 'remove：要删除的待开始阶段序号（从 1 开始）。' },
        },
        required: ['action'],
      },
      async execute(args, exec) {
        const agent = requireAgent(exec)
        const link = resolveManagedLink(agent.id, args?.worker)
        const action = typeof args?.action === 'string' ? args.action : ''
        if (!Array.isArray(link.stages)) link.stages = []
        const view = () => link.stages.map((stage, index) => ({
          index: index + 1,
          id: stage.id,
          title: stage.title || '',
          status: stage.status,
          acceptance: stage.acceptance || '',
          prompt: clip(stage.prompt, 400),
        }))
        if (action === 'add') {
          const prompt = typeof args?.prompt === 'string' ? args.prompt.trim() : ''
          if (prompt === '') throw new CollabError('prompt 不能为空。')
          const stage = {
            id: `st-${randomUUID().slice(0, 8)}`,
            title: typeof args?.title === 'string' ? args.title.trim() : '',
            prompt,
            acceptance: typeof args?.acceptance === 'string' ? args.acceptance.trim() : '',
            status: 'pending',
          }
          link.stages.push(stage)
          link.updatedAt = Date.now()
          await persist(link)
          return { ok: true, action: 'add', stage: view().find((row) => row.id === stage.id), stages: view() }
        }
        if (action === 'list') {
          return {
            ok: true,
            action: 'list',
            worker: link.worker,
            stages: view(),
            active: view().find((row) => row.status === 'active') ?? null,
          }
        }
        if (action === 'remove') {
          const index = clampInt(args?.index, 1, 100, 0)
          const stage = index > 0 ? link.stages[index - 1] : undefined
          if (stage === undefined) throw new CollabError('index 超出范围。')
          if (stage.status !== 'pending') throw new CollabError('只能删除尚未开始的阶段。')
          link.stages.splice(index - 1, 1)
          link.updatedAt = Date.now()
          await persist(link)
          return { ok: true, action: 'remove', stages: view() }
        }
        if (action === 'clear') {
          link.stages = link.stages.filter((stage) => stage.status === 'active')
          link.updatedAt = Date.now()
          await persist(link)
          return { ok: true, action: 'clear', stages: view() }
        }
        if (action === 'start' || action === 'complete') {
          if (link.pending !== null) {
            throw new CollabError(`仍在等待该员工第 ${link.pending.round} 轮回报，等回报后再推进阶段。`)
          }
          let next
          if (action === 'complete') {
            const active = link.stages.find((stage) => stage.status === 'active')
            if (active === undefined) throw new CollabError('当前没有进行中的阶段；用 action=start 开始第一个阶段。')
            active.status = 'done'
            active.completedAt = Date.now()
            active.summary = typeof args?.summary === 'string' ? clip(args.summary.trim(), 2000) : ''
            await persist(link)
            next = link.stages.find((stage) => stage.status === 'pending')
            if (next === undefined) {
              link.updatedAt = Date.now()
              await persist(link)
              return { ok: true, action: 'complete', done: true, next: null, stages: view(), message: '当前阶段已完成，队列里没有下一阶段。' }
            }
          } else {
            if (link.stages.some((stage) => stage.status === 'active')) {
              throw new CollabError('已有进行中的阶段；请先 complete 或等它结束。')
            }
            next = link.stages.find((stage) => stage.status === 'pending')
            if (next === undefined) throw new CollabError('队列里没有待开始的阶段。')
          }
          next.status = 'active'
          next.startedAt = Date.now()
          delete next.completedAt
          link.updatedAt = Date.now()
          await persist(link)
          try {
            const receipt = await dispatchRound(link, next.prompt, next.acceptance, exec.signal, false)
            return {
              ok: true,
              action,
              done: action === 'complete',
              stage: { id: next.id, title: next.title, index: link.stages.indexOf(next) + 1 },
              round: receipt.round,
              stages: view(),
              message: `已开始阶段「${next.title || next.id}」，第 ${receipt.round} 轮任务已派发。`,
            }
          } catch (error) {
            next.status = 'pending'
            delete next.startedAt
            await persist(link)
            throw error
          }
        }
        throw new CollabError('action 必须是 add | list | start | complete | remove | clear。')
      },
      when: ({ agent }) => managerHasWork(agent.id),
    })

    toolExecutors.done = register({
      name: 'collab_done',
      description:
        '（仅项目经理）宣布某个员工的项目完成：记录总结并结束本轮协作。临时关联会同时自动解绑；永久关联保留到 collab_unlink。有多个员工时用 worker 指定；all=true 结束全部进行中的员工。请在验收通过后调用。',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: '项目最终总结：交付了什么、在哪里、如何验证。' },
          worker: { type: 'string', description: '可选：目标员工的 sessionId 或标题关键词。' },
          all: { type: 'boolean', description: '可选：结束全部进行中的员工协作。' },
        },
        required: ['summary'],
      },
      async execute(args, exec) {
        const agent = requireAgent(exec)
        const active = managerLinks(agent.id, true)
        if (active.length === 0) throw new CollabError('当前对话没有进行中的员工协作。')
        const summary = typeof args?.summary === 'string' ? args.summary.trim() : ''
        if (summary === '') throw new CollabError('summary 不能为空。')
        let targets
        if (args?.all === true) {
          targets = active
        } else if (typeof args?.worker === 'string' && args.worker.trim() !== '') {
          targets = [resolveManagedLink(agent.id, args.worker)]
        } else if (active.length === 1) {
          targets = [active[0]]
        } else {
          throw new CollabError(`当前对话有 ${active.length} 个员工，请用 worker 指定或传 all=true：\n${workerList(active)}`)
        }
        const closed = []
        const removed = []
        const notified = []
        for (const link of targets) {
          const temporary = link.mode !== 'permanent'
          link.status = DONE
          link.pending = null
          link.finalSummary = clip(summary, 4000)
          link.closedAt = Date.now()
          link.updatedAt = Date.now()
          index(link)
          await persist(link)
          closed.push({ linkId: link.id, worker: link.worker, mode: link.mode })
          if (link.remote !== undefined) {
            try {
              await sendRemote(link.remote.device, 'done', {
                linkId: link.id,
                round: link.round,
                alias: link.remote.alias,
                summary: link.finalSummary,
              })
            } catch (error) {
              ctx.logger.warn(`collab-pair: notifying the remote device of completion failed: ${String(error)}`)
            }
          } else if (cfg.notifyWorkerOnDone) {
            try {
              await deliver(link.worker, doneText(link, link.finalSummary), `cp-${link.id}-done-to-worker`, 'queue', AbortSignal.timeout(PROMPT_TIMEOUT_MS))
              notified.push(link.worker)
            } catch (error) {
              ctx.logger.warn(`collab-pair: notifying ${link.worker} of completion failed: ${String(error)}`)
            }
          }
          if (temporary) {
            await forget(link)
            if (link.remote === undefined) await clearPrefix(link.worker)
            removed.push({ linkId: link.id, worker: link.worker })
          }
        }
        if (managerLinks(agent.id).length === 0) await clearPrefix(agent.id)
        return {
          ok: true,
          closed,
          removed,
          workerNotified: notified,
          message: removed.length === 0
            ? `已结束 ${closed.length} 个员工协作（永久关联保留，可继续派发或手动解除）。`
            : `已结束 ${closed.length} 个员工协作，其中 ${removed.length} 个临时关联已自动解绑。`,
        }
      },
      when: ({ agent }) => managerHasWork(agent.id),
    })

    toolExecutors.unlink = register({
      name: 'collab_unlink',
      description:
        '解除并删除协作关联（双方都可调用）。项目经理解除某个员工（多个员工时用 worker 指定，all=true 解除全部）；员工调用时解除自己与项目经理的关联。',
      parameters: {
        type: 'object',
        properties: {
          worker: { type: 'string', description: '可选（项目经理）：目标员工的 sessionId 或标题关键词。' },
          all: { type: 'boolean', description: '可选（项目经理）：解除全部员工。' },
          reason: { type: 'string', description: '可选：解除原因。' },
          notify: { type: 'boolean', description: '可选：是否通知对方对话（默认 false）。' },
        },
      },
      async execute(args, exec) {
        const agent = requireAgent(exec)
        const ownWorker = workerAssociation(agent.id)
        if (ownWorker !== undefined) {
          let notified = false
          if (args?.notify === true) {
            const reason = typeof args?.reason === 'string' ? args.reason.trim() : ''
            try {
              await deliver(ownWorker.manager, ['【协作结束】', '员工已退出本次协作。', ...(reason === '' ? [] : ['', `原因：${reason}`]), `[[collab:${ownWorker.id}:unlink]]`].join('\n'), `cp-${ownWorker.id}-unlink-to-manager`, 'queue', AbortSignal.timeout(PROMPT_TIMEOUT_MS))
              notified = true
            } catch (error) {
              ctx.logger.warn(`collab-pair: notifying the manager of unlink failed: ${String(error)}`)
            }
          }
          const linkId = ownWorker.id
          const managerId = ownWorker.manager
          await forget(ownWorker)
          await clearPrefix(agent.id)
          if (managerLinks(managerId).length === 0) await clearPrefix(managerId)
          return { ok: true, removed: [{ linkId, worker: agent.id }], peerNotified: notified }
        }
        const candidates = usableManagerLinks(agent.id)
        if (candidates.length === 0) throw new CollabError('当前对话没有可解除的员工协作。')
        let targets
        if (args?.all === true) {
          targets = candidates
        } else if (typeof args?.worker === 'string' && args.worker.trim() !== '') {
          targets = [resolveManagedLink(agent.id, args.worker)]
        } else if (candidates.length === 1) {
          targets = [candidates[0]]
        } else {
          throw new CollabError(`当前对话有 ${candidates.length} 个员工，请用 worker 指定或传 all=true：\n${workerList(candidates)}`)
        }
        const removed = []
        let notified = 0
        for (const link of targets) {
          if (args?.notify === true) {
            const reason = typeof args?.reason === 'string' ? args.reason.trim() : ''
            if (link.remote !== undefined) {
              try {
                await sendRemote(link.remote.device, 'done', { linkId: link.id, alias: link.remote.alias, summary: reason })
                notified += 1
              } catch (error) {
                ctx.logger.warn(`collab-pair: notifying the remote device of unlink failed: ${String(error)}`)
              }
            } else {
              try {
                await deliver(link.worker, ['【协作结束】', '项目经理已解除本次协作。', ...(reason === '' ? [] : ['', `原因：${reason}`]), `[[collab:${link.id}:unlink]]`].join('\n'), `cp-${link.id}-unlink-to-worker`, 'queue', AbortSignal.timeout(PROMPT_TIMEOUT_MS))
                notified += 1
              } catch (error) {
                ctx.logger.warn(`collab-pair: notifying ${link.worker} of unlink failed: ${String(error)}`)
              }
            }
          }
          removed.push({ linkId: link.id, worker: link.worker })
          await forget(link)
          if (link.remote === undefined) await clearPrefix(link.worker)
        }
        if (managerLinks(agent.id).length === 0) await clearPrefix(agent.id)
        return { ok: true, removed, peerNotified: notified > 0 }
      },
      when: ({ agent }) => managerHasWork(agent.id) || workerAssociation(agent.id) !== undefined,
    })
  }

  /** Whether one session manages at least one active worker. */
  function isManager(sessionId) {
    return managerLinks(sessionId, true).length > 0
  }

  /** Whether one session is an active worker. */
  function isWorker(sessionId) {
    return workerAssociation(sessionId) !== undefined
  }

  /** Require the calling agent. */
  function requireAgent(exec) {
    const agent = exec?.agent
    if (agent === undefined) throw new CollabError('协作工具只能在对话中调用。')
    return agent
  }

  /** Register one tool with canonical JSON output and keep its executor for the command. */
  function register(tool) {
    const { when, ...definition } = tool
    ctx.tools.register({
      ...definition,
      output: {
        schema: { type: 'object' },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
    }, when === undefined ? {} : { when })
    return definition
  }

  /**
   * Register `/collab`, the human/UI entry point. Every action reuses the
   * matching tool executor, so the settings page and the model share one
   * implementation and one set of role checks.
   */
  function registerCommand() {
    const actions = {
      status: 'status',
      link: 'link',
      create: 'create',
      dispatch: 'dispatch',
      configure: 'configure',
      project: 'project',
      stage: 'stage',
      remote: 'remote',
      done: 'done',
      unlink: 'unlink',
      sessions: 'sessions',
    }
    ctx.commands.register({
      name: 'collab',
      description: '双对话协作：查看全部任务、关联员工、阶段队列、跨设备中继、设置项目名、配置预设与语言、派发任务、收尾或解除。',
      input: {
        hint: 'tasks | status | queue --action add --prompt ... | link --peer <id|new> | create --name <名字> | manage --name <名字> | stage --action add --prompt ... | relay --action set --mode hub|ntfy | remote --action link --device <名> --worker <别名> | project --name <项目名> | dispatch --worker <id> --task ... | done --worker <id> --summary ...',
      },
      handler: async (invocation) => {
        try {
          const { action, args } = parseCommandBody(invocation.rawInput)
          if (action === 'tasks' || action === 'board') {
            return { kind: 'success', text: JSON.stringify(await tasksBoard()) }
          }
          if (action === 'queue') {
            const agent = invocation.agent
            if (agent === undefined) return { kind: 'error', text: '无法确定当前对话。' }
            const sub = typeof args?.action === 'string' ? args.action : 'list'
            const queue = await readQueue(agent.id)
            if (sub === 'list' || sub === 'status') {
              return { kind: 'success', text: JSON.stringify(queueView(queue)) }
            }
            if (sub === 'add') {
              const prompt = typeof args?.prompt === 'string' ? args.prompt.trim() : ''
              if (prompt === '') return { kind: 'error', text: 'prompt 不能为空。' }
              if (queue.items.length >= QUEUE_LIMIT) {
                return { kind: 'error', text: '队列最多 ' + QUEUE_LIMIT + ' 条；请先清理待发或已完成条目。' }
              }
              queue.items.push({
                id: `q-${randomUUID().slice(0, 8)}`,
                title: typeof args?.title === 'string' ? args.title.trim() : '',
                prompt,
                status: 'pending',
              })
              queue.updatedAt = Date.now()
              await persistQueue(queue)
              return { kind: 'success', text: JSON.stringify(queueView(queue)) }
            }
            if (sub === 'start') {
              const { queue: started, item } = await startQueueItem(agent.id, invocation.signal)
              return { kind: 'success', text: JSON.stringify({ ...queueView(started), started: item.id }) }
            }
            if (sub === 'pause' || sub === 'resume') {
              queue.auto = sub === 'resume'
              queue.updatedAt = Date.now()
              await persistQueue(queue)
              if (sub === 'resume' && queue.activeId === null && queue.items.some((item) => item.status === 'pending')) {
                const { queue: started, item } = await startQueueItem(agent.id, invocation.signal)
                return { kind: 'success', text: JSON.stringify({ ...queueView(started), started: item.id }) }
              }
              return { kind: 'success', text: JSON.stringify(queueView(queue)) }
            }
            if (sub === 'reset') {
              const reset = await resetQueue(agent.id)
              return { kind: 'success', text: JSON.stringify(queueView(reset)) }
            }
            if (sub === 'remove') {
              const index = Number(args?.index)
              if (!Number.isInteger(index) || index < 1 || index > queue.items.length) {
                return { kind: 'error', text: 'index 必须是 1 到当前条目数之间的整数。' }
              }
              const item = queue.items[index - 1]
              if (item === undefined) return { kind: 'error', text: 'index 超出范围。' }
              if (item.status !== 'pending') return { kind: 'error', text: '只能删除尚未发送的条目。' }
              queue.items.splice(index - 1, 1)
              queue.updatedAt = Date.now()
              await persistQueue(queue)
              return { kind: 'success', text: JSON.stringify(queueView(queue)) }
            }
            if (sub === 'clear') {
              queue.items = queue.items.filter((item) => item.status !== 'pending')
              queue.updatedAt = Date.now()
              await persistQueue(queue)
              return { kind: 'success', text: JSON.stringify(queueView(queue)) }
            }
            return { kind: 'error', text: 'action 必须是 list | add | start | pause | resume | reset | remove | clear。' }
          }
          if (action === 'manage') {
            const agent = invocation.agent
            if (agent === undefined) return { kind: 'error', text: '无法确定当前对话。' }
            if (workerAssociation(agent.id) !== undefined) return { kind: 'error', text: '当前对话是员工，不能设为项目经理。' }
            let worker = null
            if (usableManagerLinks(agent.id).length === 0) {
              try {
                const created = await toolExecutors.create.execute(
                  { name: typeof args?.name === 'string' ? args.name : '', mode: 'temporary' },
                  { agent, signal: invocation.signal },
                )
                worker = created.sessionId
              } catch (error) {
                return { kind: 'error', text: error instanceof Error ? error.message : String(error) }
              }
            }
            const text = cfg.language === 'en'
              ? [
                '[Project manager mode]',
                'You have been set as the project manager. By default you create workers yourself and delegate the execution.',
                '',
                '- When work needs doing, use `collab_worker_create` to make the right worker(s) (multiple roles if needed), then `collab_dispatch`.',
                '- Do not do the workers\' execution work yourself; keep your context for reviewing reports and dispatching again, so a long execution does not make you miss worker reports.',
                '- Confirm the project goal first; if the user has not given one, ask before creating workers and dispatching the first stage.',
              ].join('\n')
              : [
                '【项目经理模式】',
                '你已被设为项目经理。默认由你自主创建员工，并把执行工作派给员工。',
                '',
                '- 需要执行时，先用 `collab_worker_create` 创建合适的员工（可以按角色建多个），再用 `collab_dispatch` 派发。',
                '- 不要自己承担员工的具体执行工作；把上下文留给验收和继续派发，避免因长时间自己干活而错过员工回报。',
                '- 先确认项目目标；如果用户还没给目标，先问清楚，再创建员工并派发第一阶段。',
              ].join('\n')
            try {
              await deliver(agent.id, text, `cp-manage-${randomUUID().slice(0, 8)}`, 'queue', AbortSignal.timeout(PROMPT_TIMEOUT_MS))
            } catch (error) {
              return { kind: 'error', text: `项目经理已设置，但启动提示投递失败：${deliveryFailure(error)}` }
            }
            return { kind: 'success', text: JSON.stringify({ ok: true, worker, prompted: true }) }
          }
          if (action === 'relay') {
            const sub = typeof args?.action === 'string' ? args.action : 'get'
            if (sub === 'get') return { kind: 'success', text: JSON.stringify(relayStatus()) }
            if (sub === 'test') {
              if (!relayConfigured()) return { kind: 'error', text: '中继未启用：先选择模式并保存。' }
              try {
                let message = ''
                if (cfg.relayMode === 'hub') {
                  await hubFetch(`/v1/head?room=${encodeURIComponent(cfg.hubRoom)}`)
                  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(cfg.hubUrl)) {
                    message = '连接成功，但这个地址只在本机可访问；跨设备请改用局域网 IP 或 HTTPS 隧道地址。'
                  }
                } else {
                  const response = await fetch(`https://ntfy.sh/${encodeURIComponent(ntfyTopic())}/json?poll=1&since=10m`, { signal: AbortSignal.timeout(15000) })
                  if (!response.ok) throw new Error(`HTTP ${response.status}`)
                  await response.text()
                }
                return { kind: 'success', text: JSON.stringify({ ok: true, mode: cfg.relayMode, device: cfg.deviceName, room: cfg.hubRoom, ...(message === '' ? {} : { message }) }) }
              } catch (error) {
                return { kind: 'error', text: `连接测试失败：${error instanceof Error ? error.message : String(error)}` }
              }
            }
            if (sub === 'set') {
              const mode = args?.mode === 'hub' || args?.mode === 'ntfy' || args?.mode === 'off' ? args.mode : ''
              if (mode === '') return { kind: 'error', text: 'mode 必须是 hub / ntfy / off。' }
              const hubUrl = normalizeHubUrl(args?.hubUrl)
              const room = typeof args?.hubRoom === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(args.hubRoom) ? args.hubRoom : 'default'
              const providedToken = typeof args?.hubToken === 'string' ? args.hubToken.trim() : ''
              const token = providedToken === '' && args?.keepToken === true ? cfg.hubToken : providedToken
              const device = deviceText(args?.deviceName)
              if (mode === 'hub' && (hubUrl === '' || token === '')) return { kind: 'error', text: '自建 hub 需要 hubUrl 和 token。' }
              if (mode === 'ntfy' && (token.length < 16 || room === 'default')) return { kind: 'error', text: '免费中继需要至少 16 位的 token，以及一个非 default 的房间名。' }
              const entry = ctx.fiber?.entry
              const editor = ctx.get('configEditor')
              if (entry === undefined || editor === undefined) return { kind: 'error', text: '当前环境无法保存中继设置。' }
              await editor.edit(entry, (current) => ({
                ...current,
                relayMode: mode,
                hubUrl,
                hubRoom: room,
                hubToken: token,
                deviceName: device,
              }))
              return { kind: 'success', text: JSON.stringify({ ok: true, mode, reload: true }) }
            }
            return { kind: 'error', text: 'action 必须是 get / set / test。' }
          }
          if (action === 'language') {
            const next = typeof args?.language === 'string' ? args.language : typeof args?.value === 'string' ? args.value : ''
            if (next !== 'zh' && next !== 'en') return { kind: 'error', text: 'language must be zh or en' }
            const entry = ctx.fiber?.entry
            const editor = ctx.get('configEditor')
            if (entry === undefined || editor === undefined) {
              return { kind: 'error', text: '当前环境无法保存语言设置；请手动修改 cordis.patch.yml 里的 language。' }
            }
            await editor.edit(entry, (current) => ({ ...current, language: next }))
            return { kind: 'success', text: JSON.stringify({ ok: true, language: next }) }
          }
          const key = actions[action]
          const executor = key === undefined ? undefined : toolExecutors[key]
          if (executor === undefined) {
            return { kind: 'error', text: `未知操作 "${action}"；可用：${Object.keys(actions).join(' / ')}` }
          }
          const value = await executor.execute(args, { agent: invocation.agent, signal: invocation.signal })
          return { kind: 'success', text: JSON.stringify(compactCommandValue(key, value)) }
        } catch (error) {
          return { kind: 'error', text: error instanceof Error ? error.message : String(error) }
        }
      },
    })
  }

  /** Keep command results out of the session log's long-form fields. */
  function compactCommandValue(key, value) {
    if (key !== 'status' || value === null || typeof value !== 'object' || value.linked !== true) return value
    if (value.role === 'manager' && Array.isArray(value.workers)) {
      return {
        ...value,
        workers: value.workers.map((worker) => ({
          ...worker,
          lastReport: worker.lastReport === null ? null : {
            round: worker.lastReport.round,
            status: worker.lastReport.status,
            summary: worker.lastReport.summary,
            turnReason: worker.lastReport.turnReason,
            relayedAt: worker.lastReport.relayedAt,
            ...(worker.lastReport.deliveryError === undefined ? {} : { deliveryError: worker.lastReport.deliveryError }),
          },
          history: Array.isArray(worker.history) ? worker.history.slice(-3) : [],
        })),
      }
    }
    const { lastReport, ...rest } = value
    if (lastReport === null || typeof lastReport !== 'object') return { ...rest, lastReport: lastReport ?? null }
    return {
      ...rest,
      lastReport: {
        round: lastReport.round,
        status: lastReport.status,
        summary: lastReport.summary,
        details: lastReport.details,
        next: lastReport.next,
        turnReason: lastReport.turnReason,
        relayedAt: lastReport.relayedAt,
        ...(lastReport.deliveryError === undefined ? {} : { deliveryError: lastReport.deliveryError }),
      },
    }
  }
}
