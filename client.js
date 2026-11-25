window.__ModuleLoader__.load({
  id: 'dsh-collab-pair',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'collab-pair'

    const MESSAGES = {
      zh: {
        nav: '双对话协作',
        title: '双对话协作',
        intro: '做大项目时，不必再反复把同一套提示词分别发给多个对话：关联一次，之后每轮都由项目经理派发，员工产出自动回传；长时间挂机也能自动推进。插件只负责关联与推进，目标、任务和验收仍由项目经理掌握。',
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
      },
      en: {
        nav: 'Collaboration pair',
        title: 'Collaboration pair',
        intro: 'On large projects you no longer repeat the same prompts across conversations: link once, then the manager dispatches every round and worker results come back automatically, with unattended runs kept moving. The plugin only links and drives; the goal, tasks, and acceptance stay with the manager.',
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
      const commandsRef = React.useRef(commands)
      commandsRef.current = commands

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

      const links = board !== null && Array.isArray(board.links) ? board.links : []
      const messageLang = board !== null && board.language === 'en' ? 'en' : 'zh'
      const associated = links.filter((link) => link.status === 'active' || link.mode === 'permanent')
      const activeLinks = links.filter((link) => link.status === 'active')
      const managed = workId === undefined ? [] : associated.filter((link) => link.manager === workId)
      const mine = workId === undefined ? undefined : associated.find((link) => link.worker === workId)
      const role = managed.length > 0 ? 'manager' : mine === undefined ? null : 'worker'
      const managerProject = managed.find((link) => typeof link.project === 'string' && link.project !== '')?.project ?? ''
      const peerChoices = sessions.filter((row) => row.id !== workId)

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
            h('button', { type: 'button', style: S.secondary, disabled: busy || workId === undefined, onClick: () => void refresh() }, t('refresh')),
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
        header,
        feedback,
        h('h3', { style: S.cardTitle }, workTitle === undefined ? t('currentTitle') : `${t('currentTitle')} · ${workTitle}`),
        currentCard,
        boardCard,
        starRow,
      )
    }

    const inject = ['slots', 'locale', 'remote', 'remote.commands']

    function apply(ctx) {
      const locale = ctx.locale
      if (locale !== undefined && typeof locale.register === 'function') {
        ctx.effect(() => locale.register(NS, MESSAGES), 'collab-pair: locale dictionaries')
      }
      const t = locale !== undefined && typeof locale.bind === 'function' ? locale.bind(NS) : (key) => key
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
