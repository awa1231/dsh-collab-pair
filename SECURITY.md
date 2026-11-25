# Security

## Cross-device relay

`hub.js` authenticates every request with a shared Bearer token and scopes messages by room. Anyone holding the token can deliver prompts to devices in that room, so:

- use a long random token (for example `openssl rand -hex 32`),
- expose the hub over HTTPS (a tunnel such as cloudflared, ngrok, frp, or Tailscale),
- use a dedicated room name per project,
- do not reuse the token elsewhere.

The hub keeps messages in memory only (15 minutes, at most 1000 per room) and is not a durable queue.

## Remote workers

A remote worker executes the dispatched prompt in its own DSH session, with that session's sandbox and approval policy. Cross-device collaboration does not bypass local permissions.

## Reporting

Open a GitHub issue for security concerns. Do not include tokens, session ids, or private project contents.
