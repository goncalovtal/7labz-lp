import { next } from '@vercel/functions'

// One shared password for the whole brand kit. Any username works.
// Until BRAND_PASSWORD is set in the project's environment variables, nothing is served.
export default function middleware(request) {
  const password = process.env.BRAND_PASSWORD
  if (!password) {
    return new Response('Brand kit is not configured yet', { status: 503 })
  }

  const header = request.headers.get('authorization') || ''
  const [scheme, encoded] = header.split(' ')
  if (scheme === 'Basic' && encoded) {
    const decoded = atob(encoded)
    const given = decoded.slice(decoded.indexOf(':') + 1)
    if (safeEqual(given, password)) return next()
  }

  return new Response('Password required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="7labz brand kit", charset="UTF-8"' },
  })
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export const config = { runtime: 'nodejs' }
