import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const key = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || ''
    if (!key) return res.status(200).json({ ok: false, message: 'Google Maps key not configured' })
    return res.status(200).json({ ok: true, key })
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e?.message || 'Unexpected error' })
  }
}

