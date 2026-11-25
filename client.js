window.__ModuleLoader__.load({
  id: 'dsh-collab-pair',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'collab-pair'

    const MESSAGES = {
      zh: {
        nav: '协作待办',
        title: '协作待办',
        intro: '把对话组织成协作网络：项目经理自主创建员工、派发任务并验收回报；也可以给任意对话预设一串提示词，完成一轮自动发下一条。核心是协作，待办队列用来把长流程串起来。',
        workSession: '工作会话',
        workSessionHint: '选择要操作的对话。建立关联时，它就是项目经理对话。',
        messageLanguage: '对话消息语言',
        langZh: '中文',
        langEn: 'English',
        languageChanged: '消息语言已切换，正在重新加载…',
        noSessions: '还没有可用的对话，请先在左侧新建一个对话。',
        loading: '读取中…',
        refresh: '刷新',
        busy: '处理中…',
        boardTitle: '全部任务',
        boardSummary: '{active} 进行中 / 共 {total}',
        noTasks: '还没有任何协作任务。',
        currentTitle: '当前会话',
        linkTitle: '关联员工',
        peer: '员工对话',
        peerNew: '新建一个员工对话',
        link: '关联',
        linkMode: '关联模式',
        modeTemporary: '临时关联（完成即解绑）',
        modePermanent: '永久关联（直到手动解除）',
        modeTempShort: '临时',
        modePermShort: '永久',
        projectLabel: '项目',
        remoteLabel: '远程',
        starLabel: '在 GitHub 上给个 Star ★',
        projectUnnamed: '未命名项目',
        projectSave: '保存项目名',
        projectSaved: '项目名已更新',
        linkDone: '已关联员工。接下来在项目经理对话里派发任务。',
        workerPrefixHint: '关联后两个对话的标题会自动加上【项目经理】/【员工】前缀，解除时自动去掉。',
        managerTitle: '项目经理',
        managing: '正在管理',
        workerCount: '个员工',
        workerTitle: '员工',
        workerHint: '这个对话是员工角色；项目目标与验收由项目经理掌握。',
        leave: '退出协作',
        confirmLeave: '退出这个协作？',
        round: '第',
        roundUnit: '轮',
        waited: '已等待 {time}',
        runningNow: '工作中',
        waiting: '等待回报',
        idle: '空闲',
        finished: '已结束',
        noWorkers: '还没有关联员工。',
        lastReport: '最近回报',
        reminder: '已提醒 {count}/{max}',
        unlink: '解除',
        confirmUnlink: '解除与该员工的协作关联？',
        removeDone: '已解除关联。',
        statusDone: '完成',
        statusPartial: '部分完成',
        statusBlocked: '受阻',
        statusUnreported: '未显式汇报',
        seconds: '{count} 秒',
        minutes: '{count} 分钟',
        hours: '{count} 小时',
        unknownError: '操作失败',
        relayTitle: '跨设备协作',
        relayIntro: '把员工对话搬到另一台设备：ntfy.sh 免费、免部署，但消息经过公共服务器，token 只用于派生私有 topic；自建 hub 更私密。两台设备需要填同一个令牌。',
        relayModeLabel: '中继模式',
        relayOff: '关闭',
        relayHub: '自建 hub',
        relayNtfy: '免费公共中继 ntfy.sh',
        relayOffHint: '关闭后不再轮询中继，令牌会保留，切回时无需重填。',
        relayHubUrl: 'Hub 地址',
        relayLocalhostHint: '127.0.0.1 / localhost 只在本机可访问；另一台设备请填这台机器的局域网 IP 或 HTTPS 隧道地址。',
        relayRoom: '房间',
        relayToken: '令牌',
        relayTokenKeep: '留空保留已保存的令牌',
        relayDevice: '设备名',
        relayDeviceHint: '设备名由字母、数字、下划线或连字符组成，两台设备各用一个。',
        relayTokenHint: '令牌不会被回显；有已保存的令牌时，留空即沿用。',
        relaySave: '保存中继设置',
        relayTest: '测试连接',
        relayTestHint: '连接测试使用已保存的设置。',
        relaySaved: '中继设置已保存。',
        relaySavedPending: '已保存，插件正在重新加载；稍后点「刷新」查看状态。',
        relayNotSaved: '中继设置未保存。',
        relayTestOk: '连接测试通过。',
        relayStatusTitle: '中继状态',
        relayConnected: '已连接',
        relayDisconnected: '未连接',
        relayLastPoll: '最近轮询',
        relayNever: '从未',
        relayLastError: '最近错误',
        relayStatusLine: '设备 {device} · 房间 {room}',
        relayMissingHubUrl: '请填写 Hub 地址。',
        relayMissingToken: '请填写令牌。',
        relayMissingRoom: '请填写房间名。',
        aliasTitle: '本机别名',
        aliasHint: '在员工设备上把当前对话注册为别名，经理在另一台设备用「关联远端员工」把它接进来。',
        aliasPlaceholder: '如 worker-a',
        aliasRegister: '把当前对话注册为员工',
        aliasDone: '别名已注册。',
        aliasRemoved: '别名已删除。',
        aliasRemove: '删除',
        aliasEmpty: '本机还没有别名。',
        aliasOff: '启用中继后才能注册别名。',
        remoteTitle: '关联远端员工',
        remoteDevice: '远端设备',
        remoteWorker: '远端别名',
        remoteName: '显示名',
        remoteLink: '关联远端员工',
        remoteMissing: '请填写远端设备和别名。',
        remoteLinkDone: '已关联远端员工，接着给它派发任务。',
        stageTitle: '阶段待办（To-do）',
        stageNoManager: '这个对话还不是项目经理。先在下方关联一个员工，或在侧栏右键该对话选择「设为项目经理并启动」，之后就能在这里预先写多个大阶段。',
        stageIntro: '先写好几个大阶段，完成一个会自动派发下一个。',
        stageEmpty: '还没有阶段。先添加几个大阶段，完成一个会自动派发下一个。',
        stageWorker: '员工',
        stageNoWorker: '还没有可用的员工，先关联一个。',
        stageAddTitle: '阶段标题',
        stagePrompt: '提示词',
        stageAcceptance: '验收标准',
        stageAdd: '添加到阶段队列',
        queueTitle: '对话待办（自动连发）',
        queueIntro: '给这个对话预先写好一系列提示词；每轮结束后自动发下一条。',
        queueAddTitle: '标题（可选）',
        queuePrompt: '提示词 / 任务',
        queueAdd: '加到队尾',
        queueStart: '发送下一条',
        queuePause: '暂停自动连发',
        queueResume: '恢复自动连发',
        queueClear: '清空待发',
        queueEmpty: '还没有待办。',
        queuePending: '待发',
        queueSent: '进行中',
        queueDone: '完成',
        queueRemove: '删除',
        queueUntitled: '未命名任务',
        queueAuto: '自动连发',
        queuePaused: '已暂停',
        queueFailed: '失败',
        queueReset: '重置队列',
        queueLoadFailed: '读取队列失败',
        queueLastError: '最近错误',
        stageAdded: '阶段已添加。',
        stageStarted: '阶段已开始。',
        stageFinished: '阶段已完成。',
        stageRemoved: '阶段已删除。',
        stageUntitled: '未命名阶段',
        stagePromptEmpty: '（无提示词）',
        stageStatusPending: '待开始',
        stageStatusActive: '进行中',
        stageStatusDone: '已完成',
        stageStart: '开始',
        stageComplete: '完成并发下一阶段',
        stageRemove: '删除',
        menuSetManager: '设为项目经理并启动',
        menuWorkerName: '新员工名字',
        menuFailed: '创建员工失败',
      },
      en: {
        nav: 'Collab To-do',
        title: 'Collab To-do',
        intro: 'Organise conversations into a collaboration network: a manager creates workers, dispatches tasks and reviews reports; pre-write a prompt queue for any conversation to advance after each turn. Collaboration is the core; the to-do queue strings long workflows together.',
        workSession: 'Working conversation',
        workSessionHint: 'The conversation to act on. When you create a link, it becomes the project manager.',
        messageLanguage: 'Message language',
        langZh: '中文',
        langEn: 'English',
        languageChanged: 'Message language changed; reloading…',
        noSessions: 'No conversation is available yet. Create one in the sidebar first.',
        loading: 'Loading…',
        refresh: 'Refresh',
        busy: 'Working…',
        boardTitle: 'All tasks',
        boardSummary: '{active} active / {total} total',
        noTasks: 'No collaboration task yet.',
        currentTitle: 'Current conversation',
        linkTitle: 'Link a worker',
        peer: 'Worker conversation',
        peerNew: 'Create a new worker conversation',
        link: 'Link',
        linkMode: 'Link mode',
        modeTemporary: 'Temporary (unbind when done)',
        modePermanent: 'Permanent (until unlinked)',
        modeTempShort: 'Temporary',
        modePermShort: 'Permanent',
        projectLabel: 'Project',
        remoteLabel: 'remote',
        starLabel: 'Star it on GitHub ★',
        projectUnnamed: 'Unnamed project',
        projectSave: 'Save project name',
        projectSaved: 'Project name updated',
        linkDone: 'Worker linked. Dispatch tasks from the manager conversation.',
        workerPrefixHint: 'Linking adds a 【项目经理】/【员工】 prefix to both titles; unlinking removes it.',
        managerTitle: 'Project manager',
        managing: 'Managing',
        workerCount: 'workers',
        workerTitle: 'Worker',
        workerHint: 'This conversation is a worker; the project goal and acceptance stay with the project manager.',
        leave: 'Leave',
        confirmLeave: 'Leave this collaboration?',
        round: 'Round',
        roundUnit: '',
        waited: 'waiting {time}',
        runningNow: 'Working',
        waiting: 'Waiting for report',
        idle: 'Idle',
        finished: 'Finished',
        noWorkers: 'No worker linked yet.',
        lastReport: 'Latest report',
        reminder: 'reminder {count}/{max}',
        unlink: 'Unlink',
        confirmUnlink: 'Remove the link to this worker?',
        removeDone: 'Link removed.',
        statusDone: 'Done',
        statusPartial: 'Partially done',
        statusBlocked: 'Blocked',
        statusUnreported: 'No explicit report',
        seconds: '{count}s',
        minutes: '{count}m',
        hours: '{count}h',
        unknownError: 'The operation failed',
        relayTitle: 'Cross-device relay',
        relayIntro: 'Move a worker conversation to another machine. ntfy.sh is free and needs no deployment, but messages pass through a public server and the token only derives a private topic; a self-hosted hub is more private. Both devices use the same token.',
        relayModeLabel: 'Relay mode',
        relayOff: 'Off',
        relayHub: 'Self-hosted hub',
        relayNtfy: 'Free public relay ntfy.sh',
        relayOffHint: 'Turning it off stops polling and keeps the token for next time.',
        relayHubUrl: 'Hub URL',
        relayLocalhostHint: '127.0.0.1 / localhost only works on this machine; on another device use this machine’s LAN address or an HTTPS tunnel URL.',
        relayRoom: 'Room',
        relayToken: 'Token',
        relayTokenKeep: 'Leave blank to keep the saved token',
        relayDevice: 'Device name',
        relayDeviceHint: 'A device name uses letters, digits, underscore or hyphen; one per machine.',
        relayTokenHint: 'The token is never echoed back; leave it blank to reuse a saved one.',
        relaySave: 'Save relay settings',
        relayTest: 'Test connection',
        relayTestHint: 'The test uses the saved settings.',
        relaySaved: 'Relay settings saved.',
        relaySavedPending: 'Saved; the plugin is reloading. Refresh in a moment to see the state.',
        relayNotSaved: 'Relay settings were not saved.',
        relayTestOk: 'Connection test passed.',
        relayStatusTitle: 'Relay status',
        relayConnected: 'Connected',
        relayDisconnected: 'Not connected',
        relayLastPoll: 'Last poll',
        relayNever: 'never',
        relayLastError: 'Last error',
        relayStatusLine: 'Device {device} · room {room}',
        relayMissingHubUrl: 'Enter the hub URL.',
        relayMissingToken: 'Enter the token.',
        relayMissingRoom: 'Enter a room name.',
        aliasTitle: 'Local aliases',
        aliasHint: 'Register this conversation as an alias on the worker device; the manager links it from the other machine.',
        aliasPlaceholder: 'e.g. worker-a',
        aliasRegister: 'Register this conversation as a worker',
        aliasDone: 'Alias registered.',
        aliasRemoved: 'Alias removed.',
        aliasRemove: 'Remove',
        aliasEmpty: 'No alias on this device yet.',
        aliasOff: 'Enable the relay before registering an alias.',
        remoteTitle: 'Link a remote worker',
        remoteDevice: 'Remote device',
        remoteWorker: 'Remote alias',
        remoteName: 'Display name',
        remoteLink: 'Link remote worker',
        remoteMissing: 'Enter the remote device and alias.',
        remoteLinkDone: 'Remote worker linked; dispatch a task next.',
        stageTitle: 'To-do list',
        stageNoManager: 'This conversation is not a project manager yet. Link a worker below, or right-click the conversation in the sidebar and choose "Set as project manager (start)"; then you can pre-write multiple stages here.',
        stageIntro: 'Write a few large stages up front; completing one dispatches the next automatically.',
        stageEmpty: 'No stage yet. Add a few large stages; completing one dispatches the next automatically.',
        stageWorker: 'Worker',
        stageNoWorker: 'No worker available; link one first.',
        stageAddTitle: 'Stage title',
        stagePrompt: 'Prompt',
        stageAcceptance: 'Acceptance',
        stageAdd: 'Add to stage queue',
        queueTitle: 'Conversation to-do (auto-advance)',
        queueIntro: 'Pre-write a series of prompts for this conversation; the next one is sent when a turn ends.',
        queueAddTitle: 'Title (optional)',
        queuePrompt: 'Prompt / task',
        queueAdd: 'Append',
        queueStart: 'Send next',
        queuePause: 'Pause auto-advance',
        queueResume: 'Resume auto-advance',
        queueClear: 'Clear pending',
        queueEmpty: 'No items yet.',
        queuePending: 'Pending',
        queueSent: 'Running',
        queueDone: 'Done',
        queueRemove: 'Remove',
        queueUntitled: 'Untitled task',
        queueAuto: 'Auto-advance',
        queuePaused: 'Paused',
        queueFailed: 'Failed',
        queueReset: 'Reset queue',
        queueLoadFailed: 'Failed to load the queue',
        queueLastError: 'Last error',
        stageAdded: 'Stage added.',
        stageStarted: 'Stage started.',
        stageFinished: 'Stage finished.',
        stageRemoved: 'Stage removed.',
        stageUntitled: 'Untitled stage',
        stagePromptEmpty: '(no prompt)',
        stageStatusPending: 'Pending',
        stageStatusActive: 'Active',
        stageStatusDone: 'Done',
        stageStart: 'Start',
        stageComplete: 'Complete and dispatch next',
        stageRemove: 'Remove',
        menuSetManager: 'Set as project manager (start)',
        menuWorkerName: 'New worker name',
        menuFailed: 'Could not create the worker',
      },
    }

    const S = {
      page: { maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 18, color: 'var(--dsw-alias-label-primary)', fontSize: 13, lineHeight: 1.55 },
      title: { margin: 0, fontSize: 18, fontWeight: 600 },
      intro: { margin: 0, color: 'var(--dsw-alias-label-secondary)' },
      hint: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12, margin: 0 },
      card: { display: 'flex', flexDirection: 'column', gap: 12, padding: 16, border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 12, background: 'var(--dsw-alias-bg-layer-1)' },
      cardHead: { display: 'flex', gap: 8, alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' },
      cardTitle: { margin: 0, fontSize: 14, fontWeight: 600 },
      row: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
      label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--dsw-alias-label-secondary)' },
      input: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--dsw-alias-border-l1)', background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-primary)', fontSize: 13, fontFamily: 'inherit' },
      primary: { padding: '8px 14px', borderRadius: 8, border: '1px solid transparent', background: 'var(--dsw-alias-brand-primary)', color: '#fff', fontSize: 13, cursor: 'pointer' },
      secondary: { padding: '6px 12px', borderRadius: 8, border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent', color: 'var(--dsw-alias-label-primary)', fontSize: 12, cursor: 'pointer' },
      starLink: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, border: '1px solid var(--dsw-alias-border-l2)', color: 'var(--dsw-alias-label-secondary)', fontSize: 12, textDecoration: 'none' },
      danger: { padding: '6px 12px', borderRadius: 8, border: '1px solid var(--dsw-alias-state-error-primary)', background: 'transparent', color: 'var(--dsw-alias-state-error-primary)', fontSize: 12, cursor: 'pointer' },
      badge: { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'var(--dsw-alias-bg-layer-2)', whiteSpace: 'nowrap' },
      mono: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11, color: 'var(--dsw-alias-label-secondary)', wordBreak: 'break-all' },
      muted: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12 },
      notice: { fontSize: 12, whiteSpace: 'pre-wrap', margin: 0 },
      worker: { display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 10, background: 'var(--dsw-alias-bg-base)' },
      workerMain: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
      workerName: { fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      taskRow: { display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 10, background: 'var(--dsw-alias-bg-base)' },
      taskMain: { display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 },
      taskTitle: { fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      taskText: { margin: 0, color: 'var(--dsw-alias-label-secondary)', fontSize: 12, maxHeight: 34, overflow: 'hidden', wordBreak: 'break-word' },
    }

    /** Read every renderable conversation from the client session store. */
    function sessionRows(snapshot) {
      const byId = snapshot && typeof snapshot === 'object' && snapshot.byId !== null && typeof snapshot.byId === 'object' ? snapshot.byId : {}
      const rows = []
      for (const key of Object.keys(byId)) {
        const item = byId[key]
        if (item === null || typeof item !== 'object') continue
        const id = typeof item.id === 'string' ? item.id : key
        if (typeof id !== 'string' || id === '') continue
        if (item.origin === 'subagent') continue
        const retained = item.retainedBy !== undefined && (item.retainedBy.mainView ?? 0) > 0
        rows.push({
          id,
          title: typeof item.title === 'string' && item.title !== '' ? item.title : id,
          updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : (typeof item.createdAt === 'number' ? item.createdAt : 0),
          retained,
          running: item.running === true,
        })
      }
      rows.sort((left, right) => (Number(right.retained) - Number(left.retained)) || (right.updatedAt - left.updatedAt))
      return rows
    }

    /** Run one `/collab` line on a session and return its JSON payload. */
    async function runCommand(commands, sessionId, line) {
      if (commands === undefined || commands === null || typeof commands.execute !== 'function') throw new Error('command channel unavailable')
      const response = await commands.execute(sessionId, line, [])
      if (response === undefined || response === null || response.ok !== true) {
        const failure = response && response.error
        throw new Error(failure === undefined ? 'command failed' : `${failure.code}: ${failure.message}`)
      }
      const execution = response.value
      if (execution === undefined) throw new Error(`unknown command: ${line}`)
      const result = execution.result
      if (result === undefined || result === null) throw new Error('command returned no result')
      if (result.kind === 'error') throw new Error(result.text)
      const text = result.text ?? ''
      if (text === '') return null
      try {
        return JSON.parse(text)
      } catch {
        return { message: text }
      }
    }

    function CollabSettings(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key
      const commands = props.commands
      const useSessions = typeof props.useSessions === 'function' ? props.useSessions : (selector) => selector(undefined)
      const snapshot = useSessions((state) => state)
      const sessions = React.useMemo(() => sessionRows(snapshot), [snapshot])
      const [workId, setWorkId] = React.useState(props.initialWorkId)
      const [board, setBoard] = React.useState(props.initialBoard === undefined ? null : props.initialBoard)
      const [error, setError] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [peer, setPeer] = React.useState('new')
      const [mode, setMode] = React.useState('temporary')
      const [projectDraft, setProjectDraft] = React.useState('')
      const [relayMode, setRelayMode] = React.useState('off')
      const [relayHubUrl, setRelayHubUrl] = React.useState('')
      const [relayRoom, setRelayRoom] = React.useState('')
      const [relayToken, setRelayToken] = React.useState('')
      const [relayDevice, setRelayDevice] = React.useState('')
      const [relayState, setRelayState] = React.useState(null)
      const [relayMessage, setRelayMessage] = React.useState(null)
      const [relayError, setRelayError] = React.useState(null)
      const [relayBusy, setRelayBusy] = React.useState(false)
      const [aliases, setAliases] = React.useState([])
      const [aliasDraft, setAliasDraft] = React.useState('')
      const [remoteDevice, setRemoteDevice] = React.useState('')
      const [remoteWorker, setRemoteWorker] = React.useState('')
      const [remoteName, setRemoteName] = React.useState('')
      const [stageWorker, setStageWorker] = React.useState('')
      const [stageTitle, setStageTitle] = React.useState('')
      const [stagePrompt, setStagePrompt] = React.useState('')
      const [stageAcceptance, setStageAcceptance] = React.useState('')
      const [queue, setQueue] = React.useState(null)
      const [queueTitle, setQueueTitle] = React.useState('')
      const [queuePrompt, setQueuePrompt] = React.useState('')
      const [queueBusy, setQueueBusy] = React.useState(false)
      const [queueError, setQueueError] = React.useState(null)
      const commandsRef = React.useRef(commands)
      commandsRef.current = commands
      const workIdRef = React.useRef(workId)
      workIdRef.current = workId
      const queueReadSeq = React.useRef(0)

      React.useEffect(() => {
        if (workId !== undefined) return
        if (sessions.length === 0) return
        const preferred = sessions.find((row) => row.retained) ?? sessions[0]
        setWorkId(preferred.id)
      }, [sessions, workId])

      const loadBoard = React.useCallback(async (sessionId) => {
        const value = await runCommand(commandsRef.current, sessionId, '/collab tasks')
        setBoard(value)
        return value
      }, [])

      React.useEffect(() => {
        if (workId === undefined) return undefined
        let cancelled = false
        setBusy(true)
        setError(null)
        setNotice(null)
        setBoard(null)
        loadBoard(workId)
          .then((value) => {
            if (!cancelled) setBoard(value)
          })
          .catch((cause) => {
            if (cancelled) return
            setBoard(null)
            setError(cause instanceof Error ? cause.message : String(cause))
          })
          .finally(() => {
            if (!cancelled) setBusy(false)
          })
        return () => {
          cancelled = true
        }
      }, [workId, loadBoard])

      React.useEffect(() => {
        if (workId === undefined) return undefined
        let cancelled = false
        const load = async () => {
          try {
            const value = await runCommand(commandsRef.current, workId, '/collab relay {"action":"get"}')
            if (cancelled) return
            applyRelayState(value)
            if (value === null || typeof value !== 'object' || value.mode === 'off') {
              setAliases([])
              return
            }
            const list = await runCommand(commandsRef.current, workId, '/collab remote {"action":"aliases"}')
            if (!cancelled && list !== null && typeof list === 'object' && Array.isArray(list.aliases)) setAliases(list.aliases)
          } catch {
            // The relay state is optional for this page; keep whatever the person is typing.
          }
        }
        void load()
        return () => {
          cancelled = true
        }
      }, [workId])

      const act = async (line, successText) => {
        if (workId === undefined) return
        setBusy(true)
        setError(null)
        setNotice(null)
        try {
          const value = await runCommand(commandsRef.current, workId, line)
          setNotice(value !== null && typeof value === 'object' && typeof value.message === 'string' ? value.message : successText)
          await loadBoard(workId)
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
          setBusy(false)
        }
      }

      const refresh = async () => {
        if (workId === undefined) return
        setBusy(true)
        setError(null)
        try {
          await loadBoard(workId)
          if (!queueBusy) await readQueue(workId)
          const relay = await readRelay(workId).catch(() => null)
          if (relay !== null && relay.mode !== 'off') await loadAliases(workId).catch(() => undefined)
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
          setBusy(false)
        }
      }

      const changeLanguage = async (code) => {
        if (workId === undefined) return
        setBusy(true)
        setError(null)
        setNotice(t('languageChanged'))
        try {
          await runCommand(commandsRef.current, workId, `/collab language ${JSON.stringify({ language: code })}`)
        } catch {
          // A config write restarts the Host plugin; the pending call may reject.
        }
        await new Promise((resolve) => setTimeout(resolve, 1200))
        try {
          const next = await loadBoard(workId)
          if (next === null || next === undefined || next.language !== code) {
            setError('语言未保存：请手动修改 cordis.patch.yml 里的 language。')
          }
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
          setBusy(false)
        }
      }

      const linkWorker = () => {
        void act(`/collab link ${JSON.stringify({ peer, mode })}`, t('linkDone'))
      }

      const removeWorker = (worker) => {
        if (typeof window.confirm === 'function' && !window.confirm(t('confirmUnlink'))) return
        void act(`/collab unlink ${JSON.stringify({ worker })}`, t('removeDone'))
      }

      const leaveCollaboration = () => {
        if (typeof window.confirm === 'function' && !window.confirm(t('confirmLeave'))) return
        void act(`/collab unlink ${JSON.stringify({})}`, t('removeDone'))
      }

      const saveProject = () => {
        const name = projectDraft.trim()
        if (name === '') return
        void act(`/collab project ${JSON.stringify({ name })}`, t('projectSaved')).then(() => setProjectDraft(''))
      }

      const applyRelayState = (value) => {
        if (value === null || typeof value !== 'object') return
        setRelayState(value)
        setRelayMode(value.mode === 'hub' || value.mode === 'ntfy' ? value.mode : 'off')
        setRelayHubUrl(typeof value.hubUrl === 'string' ? value.hubUrl : '')
        setRelayRoom(typeof value.room === 'string' ? value.room : '')
        setRelayDevice(typeof value.device === 'string' ? value.device : '')
      }

      const readRelay = async (sessionId) => {
        const value = await runCommand(commandsRef.current, sessionId, '/collab relay {"action":"get"}')
        applyRelayState(value)
        return value
      }

      const loadAliases = async (sessionId) => {
        const value = await runCommand(commandsRef.current, sessionId, '/collab remote {"action":"aliases"}')
        setAliases(value !== null && typeof value === 'object' && Array.isArray(value.aliases) ? value.aliases : [])
        return value
      }

      /** Read one session's queue; stale session responses are discarded. */
      const readQueue = async (sessionId, isCancelled) => {
        const seq = ++queueReadSeq.current
        const stale = () => (typeof isCancelled === 'function' && isCancelled())
          || workIdRef.current !== sessionId || seq !== queueReadSeq.current
        try {
          const value = await runCommand(commandsRef.current, sessionId, '/collab queue {"action":"list"}')
          if (value !== null && typeof value === 'object' && Array.isArray(value.items)
            && value.sessionId === sessionId && !stale()) {
            setQueue(value)
            setQueueError(null)
          }
          return value
        } catch (cause) {
          if (!stale()) {
            setQueue(null)
            setQueueError(cause instanceof Error ? cause.message : String(cause))
          }
          return null
        }
      }

      const queueAction = async (action, extra = {}) => {
        if (workId === undefined) return
        const sessionId = workId
        const seq = ++queueReadSeq.current
        setQueueBusy(true)
        setError(null)
        setNotice(null)
        setQueueError(null)
        try {
          const value = await runCommand(commandsRef.current, sessionId, `/collab queue ${JSON.stringify({ action, ...extra })}`)
          const current = workIdRef.current === sessionId && seq === queueReadSeq.current
          if (current && value !== null && typeof value === 'object' && Array.isArray(value.items) && value.sessionId === sessionId) {
            setQueue(value)
            setQueueError(null)
          }
          if (action === 'add' && current) {
            setQueueTitle('')
            setQueuePrompt('')
          }
        } catch (cause) {
          if (workIdRef.current === sessionId && seq === queueReadSeq.current) {
            setError(cause instanceof Error ? cause.message : String(cause))
          }
        } finally {
          setQueueBusy(false)
        }
      }

      React.useEffect(() => {
        if (workId === undefined) {
          setQueue(null)
          setQueueError(null)
          return undefined
        }
        let cancelled = false
        setQueue(null)
        setQueueError(null)
        void readQueue(workId, () => cancelled)
        return () => {
          cancelled = true
        }
      }, [workId])

      const runAction = async (line, successText) => {
        if (workId === undefined) return
        setBusy(true)
        setError(null)
        setNotice(null)
        try {
          await runCommand(commandsRef.current, workId, line)
          setNotice(successText)
          await loadBoard(workId)
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
          setBusy(false)
        }
      }

      const saveRelay = async () => {
        if (workId === undefined) return
        const mode = relayMode
        const token = relayToken.trim()
        // The Host keeps the stored token when hubToken is empty and keepToken is set.
        const keepToken = token === '' && relayState !== null && relayState.hasToken === true
        if (mode === 'hub' && relayHubUrl.trim() === '') {
          setRelayError(t('relayMissingHubUrl'))
          return
        }
        if (mode !== 'off' && token === '' && !keepToken) {
          setRelayError(t('relayMissingToken'))
          return
        }
        if (mode === 'ntfy' && relayRoom.trim() === '') {
          setRelayError(t('relayMissingRoom'))
          return
        }
        setRelayBusy(true)
        setRelayError(null)
        setRelayMessage(null)
        const payload = {
          action: 'set',
          mode,
          hubUrl: relayHubUrl.trim(),
          hubRoom: relayRoom.trim(),
          hubToken: token,
          ...(keepToken ? { keepToken: true } : {}),
          deviceName: relayDevice.trim(),
        }
        let failure = null
        try {
          await runCommand(commandsRef.current, workId, `/collab relay ${JSON.stringify(payload)}`)
        } catch (cause) {
          // Saving a setting restarts the Host plugin, so this call may be interrupted.
          failure = cause instanceof Error ? cause.message : String(cause)
        }
        await new Promise((resolve) => setTimeout(resolve, 2000))
        try {
          const value = await readRelay(workId)
          if (value !== null && typeof value === 'object' && value.mode === mode) {
            setRelayMessage(t('relaySaved'))
            if (mode === 'off') setAliases([])
            else await loadAliases(workId).catch(() => undefined)
            await loadBoard(workId).catch(() => undefined)
          } else {
            setRelayError(failure === null ? t('relayNotSaved') : failure)
          }
        } catch {
          // The page may still be reconnecting after the reload.
          if (failure === null) setRelayMessage(t('relaySavedPending'))
          else setRelayError(failure)
        } finally {
          setRelayBusy(false)
        }
      }

      const testRelay = async () => {
        if (workId === undefined) return
        setRelayBusy(true)
        setRelayError(null)
        setRelayMessage(null)
        try {
          const value = await runCommand(commandsRef.current, workId, '/collab relay {"action":"test"}')
          const text = value !== null && typeof value === 'object' && typeof value.message === 'string' ? value.message : ''
          setRelayMessage(text === '' ? t('relayTestOk') : text)
          await readRelay(workId).catch(() => undefined)
        } catch (cause) {
          setRelayError(cause instanceof Error ? cause.message : String(cause))
        } finally {
          setRelayBusy(false)
        }
      }

      const registerAlias = async () => {
        if (workId === undefined) return
        const alias = aliasDraft.trim()
        if (alias === '') return
        setRelayBusy(true)
        setRelayError(null)
        setRelayMessage(null)
        try {
          await runCommand(commandsRef.current, workId, `/collab remote ${JSON.stringify({ action: 'alias', alias })}`)
          setRelayMessage(t('aliasDone'))
          setAliasDraft('')
          await loadAliases(workId).catch(() => undefined)
        } catch (cause) {
          setRelayError(cause instanceof Error ? cause.message : String(cause))
        } finally {
          setRelayBusy(false)
        }
      }

      const removeAlias = async (alias) => {
        if (workId === undefined) return
        setRelayBusy(true)
        setRelayError(null)
        setRelayMessage(null)
        try {
          await runCommand(commandsRef.current, workId, `/collab remote ${JSON.stringify({ action: 'remove-alias', alias })}`)
          setRelayMessage(t('aliasRemoved'))
          await loadAliases(workId).catch(() => undefined)
        } catch (cause) {
          setRelayError(cause instanceof Error ? cause.message : String(cause))
        } finally {
          setRelayBusy(false)
        }
      }

      const linkRemote = async () => {
        if (workId === undefined) return
        const device = remoteDevice.trim()
        const worker = remoteWorker.trim()
        if (device === '' || worker === '') {
          setRelayError(t('remoteMissing'))
          return
        }
        setRelayBusy(true)
        setRelayError(null)
        setRelayMessage(null)
        try {
          await runCommand(commandsRef.current, workId, `/collab remote ${JSON.stringify({ action: 'link', device, worker, name: remoteName.trim() })}`)
          setRelayMessage(t('remoteLinkDone'))
          setRemoteDevice('')
          setRemoteWorker('')
          setRemoteName('')
          await loadBoard(workId).catch(() => undefined)
        } catch (cause) {
          setRelayError(cause instanceof Error ? cause.message : String(cause))
        } finally {
          setRelayBusy(false)
        }
      }

      const links = board !== null && Array.isArray(board.links) ? board.links : []
      const messageLang = board !== null && board.language === 'en' ? 'en' : 'zh'
      const associated = links.filter((link) => link.status === 'active' || link.mode === 'permanent')
      const activeLinks = links.filter((link) => link.status === 'active')
      const managed = workId === undefined ? [] : associated.filter((link) => link.manager === workId)
      const mine = workId === undefined ? undefined : associated.find((link) => link.worker === workId)
      const role = managed.length > 0 ? 'manager' : mine === undefined ? null : 'worker'
      const managerProject = managed.find((link) => typeof link.project === 'string' && link.project !== '')?.project ?? ''
      const peerChoices = sessions.filter((row) => row.id !== workId)

      /** What the stage queue can pass as the worker parameter for one board link. */
      const stageRef = (link) => (typeof link.linkId === 'string' && link.linkId !== '' ? link.linkId : link.worker)
      const managedKey = managed.map((link) => stageRef(link)).join('|')
      React.useEffect(() => {
        if (managed.length === 0) return
        if (managed.some((link) => stageRef(link) === stageWorker)) return
        setStageWorker(stageRef(managed[0]))
      }, [managedKey, stageWorker])

      const stageLink = managed.find((link) => stageRef(link) === stageWorker) ?? (managed.length === 0 ? undefined : managed[0])
      const stageList = stageLink !== undefined && Array.isArray(stageLink.stages) ? stageLink.stages : []
      const stageStatusOf = (value) => {
        if (value === 'active') return { label: t('stageStatusActive'), color: 'var(--dsw-alias-state-success-primary)' }
        if (value === 'done') return { label: t('stageStatusDone'), color: 'var(--dsw-alias-label-secondary)' }
        return { label: t('stageStatusPending'), color: 'var(--dsw-alias-state-warn-primary)' }
      }
      const runStage = (payload) => {
        if (workId === undefined || stageLink === undefined) return
        const line = `/collab stage ${JSON.stringify({ ...payload, worker: stageRef(stageLink) })}`
        void runAction(line, payload.action === 'remove' ? t('stageRemoved') : payload.action === 'complete' ? t('stageFinished') : t('stageStarted'))
      }
      const addStage = () => {
        if (workId === undefined || stageLink === undefined) return
        const prompt = stagePrompt.trim()
        if (prompt === '') return
        const line = `/collab stage ${JSON.stringify({ action: 'add', worker: stageRef(stageLink), title: stageTitle.trim(), prompt, acceptance: stageAcceptance.trim() })}`
        setStageTitle('')
        setStagePrompt('')
        setStageAcceptance('')
        void runAction(line, t('stageAdded'))
      }

      const statusText = (value) => {
        if (value === 'done') return t('statusDone')
        if (value === 'partial') return t('statusPartial')
        if (value === 'blocked') return t('statusBlocked')
        return t('statusUnreported')
      }
      const formatWait = (seconds) => {
        if (typeof seconds !== 'number' || seconds < 0) return ''
        if (seconds < 60) return t('seconds', { count: seconds })
        if (seconds < 3600) return t('minutes', { count: Math.round(seconds / 60) })
        return t('hours', { count: Math.round(seconds / 360) / 10 })
      }
      const stateOf = (link) => {
        if (link.status !== 'active') return { label: t('finished'), color: 'var(--dsw-alias-label-secondary)' }
        if (link.workerRunning === true) return { label: t('runningNow'), color: 'var(--dsw-alias-state-success-primary)' }
        if (link.pending !== null && link.pending !== undefined) return { label: t('waiting'), color: 'var(--dsw-alias-state-warn-primary)' }
        return { label: t('idle'), color: 'var(--dsw-alias-state-idle-primary)' }
      }
      const roundText = (link) => {
        const base = `${t('round')} ${link.round} ${t('roundUnit')}`.trim()
        if (link.pending === null || link.pending === undefined) return base
        const wait = formatWait(link.waitedSeconds)
        return wait === '' ? base : `${base} · ${t('waited', { time: wait })}`
      }

      const header = h('div', { style: S.page },
        h('h2', { style: S.title }, t('title')),
        h('p', { style: S.intro }, t('intro')),
        h('div', { style: S.card },
          h('label', { style: S.label }, t('workSession'),
            h('select', {
              style: S.input,
              value: workId ?? '',
              disabled: busy || sessions.length === 0,
              onChange: (event) => setWorkId(event.target.value),
            },
            sessions.length === 0
              ? h('option', { value: '' }, t('noSessions'))
              : sessions.map((row) => h('option', { key: row.id, value: row.id }, `${row.title}${row.running ? ' · ●' : ''}`))),
          ),
          h('div', { style: S.hint }, t('workSessionHint')),
          h('div', { style: S.mono }, workId ?? ''),
          h('label', { style: S.label }, t('messageLanguage'),
            h('select', {
              style: S.input,
              value: board !== null && board.language === 'en' ? 'en' : 'zh',
              disabled: busy || workId === undefined,
              onChange: (event) => void changeLanguage(event.target.value),
            },
            h('option', { value: 'zh' }, t('langZh')),
            h('option', { value: 'en' }, t('langEn'))),
          ),
          h('div', { style: S.row },
            h('button', { type: 'button', style: S.secondary, disabled: busy || queueBusy || workId === undefined, onClick: () => void refresh() }, t('refresh')),
            busy ? h('span', { style: S.muted }, t('busy')) : null,
          ),
        ),
      )

      const feedback = (error !== null || notice !== null)
        ? h('div', { style: S.card },
          error !== null ? h('p', { style: { ...S.notice, color: 'var(--dsw-alias-state-error-primary)' } }, error) : null,
          notice !== null ? h('p', { style: { ...S.notice, color: 'var(--dsw-alias-state-success-primary)' } }, notice) : null,
        )
        : null

      const stateBadge = (state) => h('span', { style: { ...S.badge, color: state.color } }, state.label)

      const reminderText = (link) => (link.nudges > 0
        ? ` · ${t('reminder', { count: link.nudges, max: board !== null && typeof board.maxNudges === 'number' ? board.maxNudges : 3 })}`
        : '')
      const modeText = (link) => (link.mode === 'permanent' ? t('modePermShort') : t('modeTempShort'))

      const taskRow = (link) => {
        const state = stateOf(link)
        return h('div', { key: link.linkId, style: S.taskRow },
          h('div', { style: S.taskMain },
            h('div', { style: S.taskTitle }, link.workerTitle || link.worker),
            h('div', { style: S.mono }, link.worker),
            h('div', { style: S.muted },
              `${link.remote ? `${t('remoteLabel')} ${link.remote.device}/${link.remote.alias} · ` : ''}${link.managerTitle || link.manager} · ${roundText(link)}${reminderText(link)} · ${modeText(link)}`,
            ),
            link.pending === null || link.pending === undefined
              ? null
              : h('p', { style: S.taskText }, link.pending.task),
            link.lastReport === null || link.lastReport === undefined
              ? null
              : h('div', { style: S.muted }, `${t('lastReport')}：${statusText(link.lastReport.status)}${link.lastReport.summary ? ` · ${link.lastReport.summary}` : ''}`),
          ),
          stateBadge(state),
        )
      }

      const relayModeText = (value) => (value === 'hub' ? t('relayHub') : value === 'ntfy' ? t('relayNtfy') : t('relayOff'))
      const relayTimeText = (value) => {
        if (typeof value !== 'string' || value === '') return t('relayNever')
        const time = new Date(value)
        return Number.isNaN(time.getTime()) ? value : time.toLocaleTimeString()
      }
      const relayReady = relayState !== null && typeof relayState === 'object' && relayState.mode !== 'off'
      const relayField = (value) => (busy || relayBusy || workId === undefined)

      const relayStatusView = h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
        h('div', { style: S.muted }, t('relayStatusTitle')),
        relayState === null
          ? h('div', { style: S.muted }, t('loading'))
          : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
            h('div', { style: S.row },
              h('span', { style: S.badge }, relayModeText(relayState.mode)),
              h('span', { style: { ...S.badge, color: relayState.connected === true ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-label-secondary)' } }, relayState.connected === true ? t('relayConnected') : t('relayDisconnected')),
            ),
            h('div', { style: S.muted }, t('relayStatusLine', {
              device: typeof relayState.device === 'string' && relayState.device !== '' ? relayState.device : '-',
              room: typeof relayState.room === 'string' && relayState.room !== '' ? relayState.room : '-',
            })),
            h('div', { style: S.muted }, `${t('relayLastPoll')}：${relayTimeText(relayState.lastPollAt)}`),
            typeof relayState.lastError === 'string' && relayState.lastError !== ''
              ? h('div', { style: { ...S.muted, color: 'var(--dsw-alias-state-warn-primary)' } }, `${t('relayLastError')}：${relayState.lastError}`)
              : null,
          ),
      )

      const relayCard = h('div', { style: S.card },
        h('h3', { style: S.cardTitle }, t('relayTitle')),
        h('p', { style: S.hint }, t('relayIntro')),
        h('label', { style: S.label }, t('relayModeLabel'),
          h('select', {
            style: S.input,
            value: relayMode,
            disabled: relayField(),
            onChange: (event) => setRelayMode(event.target.value),
          },
          h('option', { value: 'off' }, t('relayOff')),
          h('option', { value: 'hub' }, t('relayHub')),
          h('option', { value: 'ntfy' }, t('relayNtfy'))),
        ),
        relayMode === 'off' ? h('div', { style: S.hint }, t('relayOffHint')) : null,
        relayMode === 'hub'
          ? h('label', { style: S.label }, t('relayHubUrl'),
            h('input', {
              style: S.input,
              value: relayHubUrl,
              placeholder: 'https://hub.example.com',
              disabled: relayField(),
              onChange: (event) => setRelayHubUrl(event.target.value),
            }))
          : null,
        relayMode === 'hub' && /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(relayHubUrl.trim())
          ? h('p', { style: S.hint }, t('relayLocalhostHint'))
          : null,
        relayMode === 'off'
          ? null
          : h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            h('label', { style: { ...S.label, flex: 1, minWidth: 160 } }, t('relayRoom'),
              h('input', {
                style: S.input,
                value: relayRoom,
                placeholder: 'default',
                disabled: relayField(),
                onChange: (event) => setRelayRoom(event.target.value),
              })),
            h('label', { style: { ...S.label, flex: 1, minWidth: 160 } }, t('relayToken'),
              h('input', {
                type: 'password',
                style: S.input,
                value: relayToken,
                placeholder: relayState !== null && relayState.hasToken === true && relayToken === '' ? t('relayTokenKeep') : '',
                disabled: relayField(),
                onChange: (event) => setRelayToken(event.target.value),
              })),
          ),
        h('label', { style: S.label }, t('relayDevice'),
          h('input', {
            style: S.input,
            value: relayDevice,
            disabled: relayField(),
            onChange: (event) => setRelayDevice(event.target.value),
          })),
        h('div', { style: S.hint }, t('relayDeviceHint')),
        relayMode === 'off' ? null : h('div', { style: S.hint }, t('relayTokenHint')),
        h('div', { style: S.row },
          h('button', { type: 'button', style: S.primary, disabled: relayField(), onClick: () => void saveRelay() }, t('relaySave')),
          h('button', { type: 'button', style: S.secondary, disabled: relayField() || !relayReady, onClick: () => void testRelay() }, t('relayTest')),
          relayBusy ? h('span', { style: S.muted }, t('busy')) : null,
        ),
        h('div', { style: S.hint }, t('relayTestHint')),
        relayStatusView,
        relayError !== null ? h('p', { style: { ...S.notice, color: 'var(--dsw-alias-state-error-primary)' } }, relayError) : null,
        relayMessage !== null ? h('p', { style: { ...S.notice, color: 'var(--dsw-alias-state-success-primary)' } }, relayMessage) : null,
        h('hr', { style: { border: 0, borderTop: '1px solid var(--dsw-alias-border-l1)', margin: '2px 0' } }),
        h('h4', { style: S.cardTitle }, t('aliasTitle')),
        h('p', { style: S.hint }, t('aliasHint')),
        relayReady ? null : h('p', { style: S.hint }, t('aliasOff')),
        h('div', { style: S.row },
          h('input', {
            style: { ...S.input, flex: 1, minWidth: 160 },
            value: aliasDraft,
            placeholder: t('aliasPlaceholder'),
            disabled: relayField() || !relayReady,
            onChange: (event) => setAliasDraft(event.target.value),
          }),
          h('button', {
            type: 'button',
            style: S.secondary,
            disabled: relayField() || !relayReady || aliasDraft.trim() === '',
            onClick: () => void registerAlias(),
          }, t('aliasRegister')),
        ),
        aliases.length === 0
          ? h('p', { style: S.hint }, t('aliasEmpty'))
          : aliases.map((record) => h('div', { key: String(record.alias), style: S.worker },
            h('div', { style: S.workerMain },
              h('div', { style: S.workerName }, record.alias),
              h('div', { style: S.mono }, record.session),
            ),
            h('button', {
              type: 'button',
              style: S.danger,
              disabled: relayField(),
              onClick: () => void removeAlias(record.alias),
            }, t('aliasRemove')),
          )),
        role === 'worker'
          ? null
          : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            h('h4', { style: S.cardTitle }, t('remoteTitle')),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('label', { style: { ...S.label, flex: 1, minWidth: 120 } }, t('remoteDevice'),
                h('input', {
                  style: S.input,
                  value: remoteDevice,
                  disabled: relayField() || !relayReady,
                  onChange: (event) => setRemoteDevice(event.target.value),
                })),
              h('label', { style: { ...S.label, flex: 1, minWidth: 120 } }, t('remoteWorker'),
                h('input', {
                  style: S.input,
                  value: remoteWorker,
                  disabled: relayField() || !relayReady,
                  onChange: (event) => setRemoteWorker(event.target.value),
                })),
              h('label', { style: { ...S.label, flex: 1, minWidth: 120 } }, t('remoteName'),
                h('input', {
                  style: S.input,
                  value: remoteName,
                  disabled: relayField() || !relayReady,
                  onChange: (event) => setRemoteName(event.target.value),
                })),
            ),
            h('div', { style: S.row },
              h('button', {
                type: 'button',
                style: S.primary,
                disabled: relayField() || !relayReady || remoteDevice.trim() === '' || remoteWorker.trim() === '',
                onClick: () => void linkRemote(),
              }, t('remoteLink')),
            ),
          ),
      )

      const stageRow = (stage, index) => {
        const status = stageStatusOf(stage.status)
        return h('div', { key: typeof stage.id === 'string' ? stage.id : String(index), style: S.taskRow },
          h('div', { style: S.taskMain },
            h('div', { style: S.taskTitle }, `${index + 1}. ${typeof stage.title === 'string' && stage.title !== '' ? stage.title : t('stageUntitled')}`),
            h('p', { style: S.taskText }, typeof stage.prompt === 'string' && stage.prompt !== '' ? stage.prompt : t('stagePromptEmpty')),
            stage.status === 'done' && typeof stage.summary === 'string' && stage.summary !== ''
              ? h('div', { style: S.muted }, stage.summary)
              : null,
          ),
          h('div', { style: S.row },
            h('span', { style: { ...S.badge, color: status.color } }, status.label),
            stage.status === 'pending'
              ? h('button', { type: 'button', style: S.secondary, disabled: busy, onClick: () => void runStage({ action: 'start' }) }, t('stageStart'))
              : null,
            stage.status === 'pending'
              ? h('button', { type: 'button', style: S.danger, disabled: busy, onClick: () => void runStage({ action: 'remove', index: index + 1 }) }, t('stageRemove'))
              : null,
            stage.status === 'active'
              ? h('button', { type: 'button', style: S.primary, disabled: busy, onClick: () => void runStage({ action: 'complete' }) }, t('stageComplete'))
              : null,
          ),
        )
      }

      const stageCard = role !== 'manager' ? null : h('div', { style: S.card },
        h('div', { style: S.cardHead },
          h('h3', { style: S.cardTitle }, t('stageTitle')),
          h('span', { style: S.muted }, t('stageIntro')),
        ),
        role !== 'manager'
          ? h('p', { style: S.intro }, t('stageNoManager'))
          : managed.length === 0
            ? h('p', { style: S.intro }, t('stageNoWorker'))
            : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
              h('label', { style: S.label }, t('stageWorker'),
                h('select', {
                  style: S.input,
                  value: stageLink === undefined ? '' : stageRef(stageLink),
                  disabled: busy,
                  onChange: (event) => {
                    setStageWorker(event.target.value)
                    setStageTitle('')
                    setStagePrompt('')
                    setStageAcceptance('')
                  },
                },
                managed.map((link) => h('option', { key: stageRef(link), value: stageRef(link) },
                  link.remote !== null && link.remote !== undefined
                    ? `${link.workerTitle || link.worker} · ${t('remoteLabel')}`
                    : link.workerTitle || link.worker))),
              ),
              h('label', { style: S.label }, t('stageAddTitle'),
                h('input', {
                  style: S.input,
                  value: stageTitle,
                  disabled: busy,
                  onChange: (event) => setStageTitle(event.target.value),
                })),
              h('label', { style: S.label }, t('stagePrompt'),
                h('textarea', {
                  style: { ...S.input, minHeight: 88, resize: 'vertical' },
                  value: stagePrompt,
                  disabled: busy,
                  onChange: (event) => setStagePrompt(event.target.value),
                })),
              h('label', { style: S.label }, t('stageAcceptance'),
                h('textarea', {
                  style: { ...S.input, minHeight: 56, resize: 'vertical' },
                  value: stageAcceptance,
                  disabled: busy,
                  onChange: (event) => setStageAcceptance(event.target.value),
                })),
              h('div', { style: S.row },
                h('button', {
                  type: 'button',
                  style: S.primary,
                  disabled: busy || stagePrompt.trim() === '',
                  onClick: () => void addStage(),
                }, t('stageAdd')),
              ),
              stageList.length === 0
                ? h('p', { style: S.intro }, t('stageEmpty'))
                : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, stageList.map(stageRow)),
            ),
        )

      const queueItems = queue !== null && typeof queue === 'object' && Array.isArray(queue.items) ? queue.items : []
      const queueCard = role === 'manager'
        ? null
        : h('div', { style: S.card },
          h('div', { style: S.cardHead },
            h('h3', { style: S.cardTitle }, t('queueTitle')),
            h('span', { style: S.badge }, queue !== null && queue.auto === false ? t('queuePaused') : t('queueAuto')),
          ),
          h('p', { style: S.intro }, t('queueIntro')),
          queue !== null && typeof queue.lastError === 'string' && queue.lastError !== ''
            ? h('p', { style: { ...S.notice, color: 'var(--dsw-alias-state-error-primary)' } }, t('queueLastError') + '：' + queue.lastError)
            : null,
          h('label', { style: S.label }, t('queueAddTitle'),
            h('input', {
              style: S.input,
              value: queueTitle,
              disabled: queueBusy,
              onChange: (event) => setQueueTitle(event.target.value),
            })),
          h('label', { style: S.label }, t('queuePrompt'),
            h('textarea', {
              style: { ...S.input, minHeight: 88, resize: 'vertical' },
              value: queuePrompt,
              disabled: queueBusy,
              onChange: (event) => setQueuePrompt(event.target.value),
            })),
          h('div', { style: S.row },
            h('button', {
              type: 'button',
              style: S.primary,
              disabled: queueBusy || queuePrompt.trim() === '',
              onClick: () => void queueAction('add', { title: queueTitle.trim(), prompt: queuePrompt.trim() }),
            }, t('queueAdd')),
          ),
          h('div', { style: S.row },
            h('button', {
              type: 'button',
              style: S.secondary,
              disabled: queueBusy || queue === null || queue.active !== null || !queueItems.some((item) => item.status === 'pending'),
              onClick: () => void queueAction('start'),
            }, t('queueStart')),
            h('button', {
              type: 'button',
              style: S.secondary,
              disabled: queueBusy || queue === null,
              onClick: () => void queueAction(queue !== null && queue.auto === false ? 'resume' : 'pause'),
            }, queue !== null && queue.auto === false ? t('queueResume') : t('queuePause')),
            h('button', {
              type: 'button',
              style: S.danger,
              disabled: queueBusy || queue === null || !queueItems.some((item) => item.status === 'pending'),
              onClick: () => void queueAction('clear'),
            }, t('queueClear')),
            queue !== null && ((queue.active !== null && queue.active !== undefined) || (typeof queue.lastError === 'string' && queue.lastError !== ''))
              ? h('button', {
                type: 'button',
                style: S.secondary,
                disabled: queueBusy,
                onClick: () => void queueAction('reset'),
              }, t('queueReset'))
              : null,
          ),
          queueError !== null
            ? h('p', { style: { ...S.notice, color: 'var(--dsw-alias-state-error-primary)' } }, t('queueLoadFailed') + '：' + queueError)
            : queue === null
              ? h('p', { style: S.intro }, t('loading'))
              : queueItems.length === 0
                ? h('p', { style: S.intro }, t('queueEmpty'))
                : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                  queueItems.map((item, index) => h('div', { key: item.id, style: S.worker },
                  h('div', { style: S.workerMain },
                    h('div', { style: S.workerName }, `${index + 1}. ${item.title || t('queueUntitled')}`),
                    item.status === 'failed'
                      ? h('span', { style: { ...S.badge, alignSelf: 'flex-start', color: 'var(--dsw-alias-state-error-primary)' } }, t('queueFailed'))
                      : null,
                    h('div', { style: S.muted }, `${item.status === 'pending' ? t('queuePending') : item.status === 'sent' ? t('queueSent') : item.status === 'failed' ? t('queueFailed') : t('queueDone')} · ${item.prompt}`),
                  ),
                  item.status === 'pending'
                    ? h('button', {
                      type: 'button',
                      style: S.danger,
                      disabled: queueBusy,
                      onClick: () => void queueAction('remove', { index: index + 1 }),
                    }, t('queueRemove'))
                    : null,
                )),
              ),
        )

      const groups = []
      const groupMap = new Map()
      for (const link of links) {
        const key = `${link.manager}\u0000${link.project || ''}`
        let group = groupMap.get(key)
        if (group === undefined) {
          group = { key, manager: link.manager, managerTitle: link.managerTitle || link.manager, project: link.project || '', links: [] }
          groupMap.set(key, group)
          groups.push(group)
        }
        group.links.push(link)
      }

      const boardCard = h('div', { style: S.card },
        h('div', { style: S.cardHead },
          h('h3', { style: S.cardTitle }, t('boardTitle')),
          h('span', { style: S.muted }, t('boardSummary', {
            active: board === null ? 0 : board.activeCount ?? activeLinks.length,
            total: board === null ? 0 : board.totalCount ?? links.length,
          })),
        ),
        board === null
          ? h('p', { style: S.intro }, busy ? t('loading') : t('noTasks'))
          : links.length === 0
            ? h('p', { style: S.intro }, t('noTasks'))
            : groups.map((group) => h('div', { key: group.key, style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              h('div', { style: { display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' } },
                h('span', { style: { fontSize: 13, fontWeight: 600 } }, group.project || t('projectUnnamed')),
                h('span', { style: S.muted }, `${t('managerTitle')}：${group.managerTitle}`),
              ),
              group.links.map(taskRow),
            )),
      )

      const workerRow = (link) => {
        const state = stateOf(link)
        return h('div', { key: link.linkId, style: S.worker },
          h('div', { style: S.workerMain },
            h('div', { style: S.workerName }, link.workerTitle || link.worker),
            h('div', { style: S.mono }, link.worker),
            h('div', { style: S.muted }, `${roundText(link)}${reminderText(link)} · ${modeText(link)}${link.remote ? ` · ${t('remoteLabel')}` : ''}`),
            link.pending === null || link.pending === undefined
              ? null
              : h('p', { style: S.taskText }, link.pending.task),
            link.lastReport === null || link.lastReport === undefined
              ? null
              : h('div', { style: S.muted }, `${t('lastReport')}：${statusText(link.lastReport.status)}${link.lastReport.summary ? ` · ${link.lastReport.summary}` : ''}`),
          ),
          h('div', { style: S.row },
            stateBadge(state),
            h('button', { type: 'button', style: S.danger, disabled: busy, onClick: () => removeWorker(link.worker) }, t('unlink')),
          ),
        )
      }

      const linkForm = h('div', { style: S.card },
        h('h3', { style: S.cardTitle }, t('linkTitle')),
        h('label', { style: S.label }, t('peer'),
          h('select', {
            style: S.input,
            value: peer,
            disabled: busy,
            onChange: (event) => setPeer(event.target.value),
          },
          h('option', { value: 'new' }, t('peerNew')),
          peerChoices.map((row) => h('option', { key: row.id, value: row.id }, row.title))),
        ),
        h('label', { style: S.label }, t('linkMode'),
          h('select', {
            style: S.input,
            value: mode,
            disabled: busy,
            onChange: (event) => setMode(event.target.value),
          },
          h('option', { value: 'temporary' }, t('modeTemporary')),
          h('option', { value: 'permanent' }, t('modePermanent'))),
        ),
        h('div', { style: S.row },
          h('button', { type: 'button', style: S.primary, disabled: busy, onClick: linkWorker }, t('link')),
        ),
        h('p', { style: S.hint }, t('workerPrefixHint')),
      )

      let currentCard
      if (sessions.length === 0) {
        currentCard = h('div', { style: S.card }, h('p', { style: S.intro }, t('noSessions')))
      } else if (role === 'manager') {
        currentCard = h('div', { style: { display: 'flex', flexDirection: 'column', gap: 18 } },
          h('div', { style: S.card },
            h('div', { style: S.row },
              h('span', { style: S.badge }, t('managerTitle')),
              h('span', { style: S.muted }, `${t('managing')} ${managed.length} ${t('workerCount')}`),
            ),
            h('div', { style: S.row },
              h('span', { style: S.muted }, `${t('projectLabel')}：${managerProject || t('projectUnnamed')}`),
            ),
            h('div', { style: S.row },
              h('input', {
                style: { ...S.input, flex: 1 },
                value: projectDraft,
                placeholder: managerProject || t('projectUnnamed'),
                disabled: busy,
                onChange: (event) => setProjectDraft(event.target.value),
              }),
              h('button', { type: 'button', style: S.secondary, disabled: busy || projectDraft.trim() === '', onClick: saveProject }, t('projectSave')),
            ),
            managed.length === 0 ? h('p', { style: S.intro }, t('noWorkers')) : managed.map(workerRow),
          ),
          linkForm,
        )
      } else if (role === 'worker' && mine !== undefined) {
        const pending = mine.pending
        currentCard = h('div', { style: S.card },
          h('div', { style: S.row },
            h('span', { style: S.badge }, t('workerTitle')),
            stateBadge(stateOf(mine)),
          ),
          h('div', { style: S.label }, t('managerTitle'),
            h('div', null, mine.managerTitle || mine.manager),
            h('div', { style: S.mono }, mine.manager),
          ),
          h('div', { style: S.muted }, roundText(mine)),
          pending === null || pending === undefined ? null : h('p', { style: S.taskText }, pending.task),
          mine.lastReport === null || mine.lastReport === undefined
            ? null
            : h('div', { style: S.muted }, `${t('lastReport')}：${statusText(mine.lastReport.status)}${mine.lastReport.summary ? ` · ${mine.lastReport.summary}` : ''}`),
          h('p', { style: S.hint }, t('workerHint')),
          h('div', { style: S.row },
            h('button', { type: 'button', style: S.danger, disabled: busy, onClick: leaveCollaboration }, t('leave')),
          ),
        )
      } else {
        currentCard = linkForm
      }

      const workTitle = sessions.find((row) => row.id === workId)?.title
      const starRow = h('div', { style: { display: 'flex', justifyContent: 'center', padding: '2px 0 6px' } },
        h('a', {
          href: 'https://github.com/awa1231/dsh-collab-pair',
          target: '_blank',
          rel: 'noreferrer noopener',
          style: S.starLink,
        }, t('starLabel')),
      )
      return h('div', { style: S.page },
        starRow,
        header,
        feedback,
        h('h3', { style: S.cardTitle }, workTitle === undefined ? t('currentTitle') : `${t('currentTitle')} · ${workTitle}`),
        currentCard,
        relayCard,
        stageCard,
        queueCard,
        boardCard,
      )
    }

    const inject = ['slots', 'locale', 'remote', 'remote.commands']

    function apply(ctx) {
      const locale = ctx.locale
      if (locale !== undefined && typeof locale.register === 'function') {
        ctx.effect(() => locale.register(NS, MESSAGES), 'collab-pair: locale dictionaries')
      }
      const t = locale !== undefined && typeof locale.bind === 'function' ? locale.bind(NS) : (key) => key
      const boundT = locale !== undefined && typeof locale.bind === 'function' ? locale.bind(NS) : (key) => key
      const commands = ctx.remote !== undefined && ctx.remote !== null ? ctx.remote.commands : undefined

      /** Session context menu: make this conversation a manager with one fresh worker. */
      function SetManagerItem(props) {
        const [busy, setBusy] = React.useState(false)
        const menu = typeof props.useMenuOpenState === 'function' ? props.useMenuOpenState() : undefined
        /** Close the menu through whatever handle the owner hands us; older menus pass none. */
        const closeMenu = () => {
          if (typeof menu === 'function') {
            menu()
            return
          }
          if (Array.isArray(menu) && typeof menu[1] === 'function') {
            menu[1](false)
            return
          }
          if (menu === undefined || menu === null) return
          if (typeof menu.close === 'function') {
            menu.close()
            return
          }
          if (typeof menu.setOpen === 'function') menu.setOpen(false)
        }
        const setManager = async () => {
          if (busy) return
          closeMenu()
          const sessionId = typeof props.sessionId === 'string' ? props.sessionId : ''
          if (sessionId === '') return
          const answer = typeof window.prompt === 'function' ? window.prompt(boundT('menuWorkerName'), '员工') : null
          if (answer === null) return
          const name = typeof answer === 'string' ? answer.trim() : ''
          setBusy(true)
          try {
            await runCommand(commands, sessionId, `/collab manage ${JSON.stringify(name === '' ? {} : { name })}`)
          } catch (cause) {
            const detail = cause instanceof Error ? cause.message : String(cause)
            if (typeof window.alert === 'function') window.alert(`${boundT('menuFailed')}\n${detail}`)
          } finally {
            setBusy(false)
          }
        }
        return h('button', {
          type: 'button',
          role: 'menuitem',
          disabled: busy,
          onClick: () => void setManager(),
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '6px 10px',
            border: '1px solid transparent',
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--dsw-alias-label-primary)',
            fontFamily: 'inherit',
            fontSize: 13,
            lineHeight: 1.4,
            textAlign: 'left',
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.6 : 1,
          },
        }, boundT('menuSetManager'))
      }

      ctx.slots.inject('sidebar.workspaces.session.menu.item', () => ctx.slots.register({
        name: 'sidebar.workspaces.session.menu.item',
        id: 'collab-pair-set-manager',
        order: 20,
      }, (props) => h(SetManagerItem, { ...props, t: boundT })))

      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'collab-pair',
        order: 16,
        label: () => t('nav'),
        inject: () => ({ t, commands: ctx.remote.commands }),
      }, CollabSettings))
    }

    return { inject, apply }
  },
})
