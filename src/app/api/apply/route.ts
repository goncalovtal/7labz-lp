import { NextResponse } from 'next/server'

const REQUIRED = ['name', 'email', 'company', 'building'] as const

/** Takes a Ventures application. Nothing stores or forwards it yet: it's only logged. */
export async function POST(request: Request) {
  const data: unknown = await request.json().catch(() => null)
  if (!data || typeof data !== 'object') return NextResponse.json({ ok: false }, { status: 400 })
  const fields = data as Record<string, unknown>

  // The honeypot is hidden from people, so anything in it came from a bot.
  if (fields.fax) return NextResponse.json({ ok: true })

  for (const key of REQUIRED) {
    const value = fields[key]
    if (typeof value !== 'string' || !value.trim()) {
      return NextResponse.json({ ok: false, missing: key }, { status: 400 })
    }
  }

  console.log('[apply]', JSON.stringify(fields))
  return NextResponse.json({ ok: true })
}
