import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method not allowed' })
  try {
    const key = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY
    if (!key) return res.status(200).json({ ok: false, message: 'Google key not configured' })
    const { id } = (req.body || {}) as { id?: string }
    const placeId = String(id || '').trim()
    if (!placeId) return res.status(200).json({ ok: false, message: 'Missing place id' })

    // Try Places API (New)
    try {
      const name = encodeURIComponent(placeId)
      const url = `https://places.googleapis.com/v1/places/${name}`
      const r = await fetch(url, {
        headers: {
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'formattedAddress,addressComponents'
        }
      })
      if (r.ok) {
        const j: any = await r.json()
        const formatted = j.formattedAddress || ''
        const comps = j.addressComponents || []
        const get = (type: string, short = false) => {
          const c = comps.find((x: any) => (x.types || []).includes(type))
          return c ? (short ? c.shortText : c.longText) : ''
        }
        const streetNumber = get('street_number')
        const route = get('route')
        const suburb = get('locality') || get('postal_town') || get('sublocality')
        const state = get('administrative_area_level_1', true)
        const postcode = get('postal_code', true)
        return res.status(200).json({ ok: true, address: { full: formatted, streetNumber, route, suburb, state, postcode } })
      }
    } catch {}

    // Legacy fallback
    const details = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    details.searchParams.set('place_id', placeId)
    details.searchParams.set('fields', 'formatted_address,address_component')
    details.searchParams.set('key', key)
    const dr = await fetch(details.toString())
    const dj: any = await dr.json().catch(() => ({}))
    const formatted = dj.result?.formatted_address || ''
    const comps = dj.result?.address_components || []
    const get = (type: string, short = false) => {
      const c = comps.find((x: any) => (x.types || []).includes(type))
      return c ? (short ? c.short_name : c.long_name) : ''
    }
    const streetNumber = get('street_number')
    const route = get('route')
    const suburb = get('locality') || get('postal_town') || get('sublocality')
    const state = get('administrative_area_level_1', true)
    const postcode = get('postal_code', true)
    return res.status(200).json({ ok: true, address: { full: formatted, streetNumber, route, suburb, state, postcode } })
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e?.message || 'Unexpected error' })
  }
}

