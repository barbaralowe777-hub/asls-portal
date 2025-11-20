import type { VercelRequest, VercelResponse } from '@vercel/node'

// Normalizes Google Places (New) and legacy Autocomplete results into a simple list
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method not allowed' })
  try {
    const key = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY
    if (!key) return res.status(200).json({ ok: false, message: 'Google key not configured' })
    const { q } = (req.body || {}) as { q?: string }
    const input = String(q || '').trim()
    if (!input) return res.status(200).json({ ok: true, suggestions: [] })

    // Prefer Places API (New)
    try {
      const url = 'https://places.googleapis.com/v1/places:autocomplete'
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text'
        },
        body: JSON.stringify({ input, languageCode: 'en', regionCode: 'AU' })
      })
      if (r.ok) {
        const j: any = await r.json()
        const suggestions = (j.suggestions || []).map((s: any) => ({
          id: s?.placePrediction?.placeId,
          text: s?.placePrediction?.text?.text || s?.placePrediction?.text || ''
        })).filter((x: any) => x.id && x.text)
        return res.status(200).json({ ok: true, suggestions })
      }
    } catch {}

    // Fallback to legacy Autocomplete if new API fails
    const legacy = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
    legacy.searchParams.set('input', input)
    legacy.searchParams.set('components', 'country:au')
    legacy.searchParams.set('key', key)
    const lr = await fetch(legacy.toString())
    const lj: any = await lr.json().catch(() => ({}))
    const suggestions = (lj.predictions || []).map((p: any) => ({ id: p.place_id, text: p.description }))
    return res.status(200).json({ ok: true, suggestions })
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e?.message || 'Unexpected error' })
  }
}

