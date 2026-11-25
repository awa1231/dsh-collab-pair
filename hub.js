#!/usr/bin/env node
// collab-pair hub: a tiny store-and-forward relay for cross-device collaboration.
//
// One device (or a small VPS) runs this; every DSH that wants to collaborate
// connects out to it. Clients only need outbound HTTP, so a tunnel (cloudflared,
// ngrok, frp, Tailscale) is enough on the hub side; no inbound port on workers.
//
//   node hub.js --port 8787 --token <shared-secret> [--host 0.0.0.0]
//
// Protocol (all JSON, token in `Authorization: Bearer <token>`):
//   POST /v1/send  {room, from, to, type, payload} -> {ok, id}
//   GET  /v1/poll?room=&device=&since=  (long-poll, 15s) -> {ok, cursor, messages}
//   GET  /v1/head?room=                 -> {ok, cursor}
//   GET  /v1/health                     -> {ok, service, rooms}
//
// Messages live in memory only, for 15 minutes / 1000 per room. That is enough
// for dispatch/report round trips; it is deliberately not a durable queue.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { createServer } from 'node:http'

const args = new Map()
for (let index = 2; index < process.argv.length; index++) {
  const arg = process.argv[index]
  if (!arg.startsWith('--')) continue
  const key = arg.slice(2)
  const next = process.argv[index + 1]
  if (next === undefined || next.startsWith('--')) args.set(key, 'true')
  else {
    args.set(key, next)
    index++
  }
}

const port = Number(args.get('port') ?? process.env.PORT ?? 8787)
const host = args.get('host') ?? '0.0.0.0'
const token = args.get('token') ?? process.env.COLLAB_HUB_TOKEN ?? randomBytes(12).toString('hex')
const tokenHash = createHash('sha256').update(token).digest()
const TTL_MS = 15 * 60 * 1000
const MAX_MESSAGES = 1000
const MAX_BODY = 256 * 1024

const rooms = new Map()
const waiters = new Map()

function stateOf(room) {
  let state = rooms.get(room)
  if (state === undefined) {
    state = { messages: [], nextId: 0 }
    rooms.set(room, state)
  }
  return state
}

function prune(state) {
  const cutoff = Date.now() - TTL_MS
  while (state.messages.length > 0 && (state.messages[0].at < cutoff || state.messages.length > MAX_MESSAGES)) state.messages.shift()
}

function notify(room) {
  const set = waiters.get(room)
  if (set === undefined) return
  for (const resolve of [...set]) resolve()
}

function waitForMessage(room, timeoutMs) {
  return new Promise((resolve) => {
    let set = waiters.get(room)
    if (set === undefined) {
      set = new Set()
      waiters.set(room, set)
    }
    const done = () => {
      clearTimeout(timer)
      set.delete(done)
      resolve()
    }
    const timer = setTimeout(done, timeoutMs)
    set.add(done)
  })
}

function json(response, status, value) {
  const body = JSON.stringify(value)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  })
  response.end(body)
}

function authorized(request) {
  const header = request.headers.authorization ?? ''
  const value = header.startsWith('Bearer ') ? header.slice(7) : ''
  const candidate = createHash('sha256').update(value).digest()
  return candidate.length === tokenHash.length && timingSafeEqual(candidate, tokenHash)
}

async function readJson(request) {
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_BODY) throw new Error('body too large')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function roomName(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : undefined
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
    if (url.pathname === '/v1/health') {
      json(response, 200, { ok: true, service: 'collab-pair-hub', rooms: rooms.size })
      return
    }
    if (!authorized(request)) {
      json(response, 401, { ok: false, error: 'unauthorized' })
      return
    }
    if (url.pathname === '/v1/head') {
      const room = roomName(url.searchParams.get('room'))
      if (room === undefined) return json(response, 400, { ok: false, error: 'bad room' })
      const state = stateOf(room)
      prune(state)
      json(response, 200, { ok: true, cursor: state.nextId })
      return
    }
    if (url.pathname === '/v1/poll') {
      const room = roomName(url.searchParams.get('room'))
      const device = url.searchParams.get('device') ?? ''
      const since = Number(url.searchParams.get('since') ?? 0)
      if (room === undefined || device === '' || !Number.isFinite(since)) {
        json(response, 400, { ok: false, error: 'bad poll parameters' })
        return
      }
      const state = stateOf(room)
      const deadline = Date.now() + 15000
      for (;;) {
        prune(state)
        const messages = state.messages.filter((message) => message.id > since && (message.to === device || message.to === '*'))
        if (messages.length > 0) {
          json(response, 200, { ok: true, cursor: messages[messages.length - 1].id, messages })
          return
        }
        const remaining = deadline - Date.now()
        if (remaining <= 0) {
          json(response, 200, { ok: true, cursor: since, messages: [] })
          return
        }
        await waitForMessage(room, Math.min(remaining, 15000))
      }
    }
    if (url.pathname === '/v1/send' && request.method === 'POST') {
      const body = await readJson(request)
      const room = roomName(body.room)
      const from = typeof body.from === 'string' ? body.from.trim() : ''
      const to = typeof body.to === 'string' ? body.to.trim() : ''
      const type = typeof body.type === 'string' ? body.type.trim() : ''
      if (room === undefined || from === '' || from.length > 64 || to === '' || to.length > 64 || type === '' || type.length > 32) {
        json(response, 400, { ok: false, error: 'bad message' })
        return
      }
      const state = stateOf(room)
      prune(state)
      state.nextId += 1
      const message = {
        id: state.nextId,
        from,
        to,
        type,
        payload: body.payload ?? null,
        at: Date.now(),
      }
      state.messages.push(message)
      prune(state)
      notify(room)
      json(response, 200, { ok: true, id: message.id, cursor: state.nextId })
      return
    }
    json(response, 404, { ok: false, error: 'not found' })
  } catch (error) {
    json(response, 400, { ok: false, error: String(error?.message ?? error) })
  }
})

server.listen(port, host, () => {
  console.log(`collab-pair hub listening on http://${host}:${port}`)
  console.log(`token: ${token}`)
  console.log('put the hub behind HTTPS before using it across untrusted networks')
})
