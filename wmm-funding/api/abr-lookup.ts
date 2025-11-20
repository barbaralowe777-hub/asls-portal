import type { VercelRequest, VercelResponse } from '@vercel/node'

// ABR JSON endpoint example:
// https://abr.business.gov.au/json/AbnDetails.aspx?abn=XX&guid=YOUR_GUID

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const version = 'gst-v3';
  try {
    const abn = String(req.query.abn || '').replace(/\D/g, '')
    if (!abn || abn.length !== 11) {
      return res.status(400).json({ status: 'error', message: 'Invalid ABN' })
    }
    const guid = process.env.ABR_GUID
    if (!guid) return res.status(500).json({ status: 'error', message: 'Server not configured (ABR_GUID missing)' })

    const url = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${abn}&guid=${encodeURIComponent(guid)}`
    const r = await fetch(url, { headers: { accept: 'application/json, text/javascript;q=0.9, */*;q=0.8' } })
    if (!r.ok) throw new Error(`ABR error ${r.status}`)
    let data: any
    const text = await r.text()
    // ABR sometimes returns JSON or JSONP-like JS. Extract the JSON object safely.
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start !== -1 && end !== -1) {
      const jsonStr = text.slice(start, end + 1)
      data = JSON.parse(jsonStr)
    } else {
      // Fallback to JSON parse (in case content-type was correct JSON)
      data = JSON.parse(text)
    }

    // Normalize response
    const toMs = (val: any): number | undefined => {
      if (!val) return undefined
      const s = String(val)
      const m = /Date\(([-0-9]+)(?:[+-]\d+)?\)/.exec(s)
      if (m) {
        const n = Number(m[1])
        return Number.isFinite(n) ? n : undefined
      }
      const t = Date.parse(s)
      return Number.isFinite(t) ? t : undefined
    }
    const entityName = data?.EntityName || data?.MainName?.OrganisationName || data?.MainTradingName?.OrganisationName || undefined
    // Handle GST periods (object or array). Consider registered if a current period exists
    let gstEffective: string | null = null
    let registered = false
    const gstRaw: any = data?.GoodsAndServicesTax ?? data?.GST
    const periods: any[] = Array.isArray(gstRaw) ? gstRaw : (gstRaw ? [gstRaw] : [])
    if (periods.length) {
      const now = Date.now()
      const norm = periods
        .map((p) => ({
          from: toMs(p?.EffectiveFrom),
          to: toMs(p?.EffectiveTo),
          raw: p
        }))
        .filter((p) => typeof p.from === 'number')

      // Current means no EffectiveTo or a future EffectiveTo
      const current = norm
        .filter((p) => !p.to || p.to >= now)
        .sort((a, b) => (b.from! - a.from!))[0]

      if (current?.from) {
        registered = true
        gstEffective = new Date(current.from).toLocaleDateString('en-AU')
      }
    }
    // Some ABR responses expose GST as a single top-level field: Gst: 'YYYY-MM-DD' or /Date(...)/
    if (!registered && (data as any)?.Gst) {
      const alt = (data as any).Gst
      const ms = toMs(alt)
      registered = true
      gstEffective = ms ? new Date(ms).toLocaleDateString('en-AU') : String(alt)
    }
    const abnStatus = (data?.AbnStatus || data?.ABNStatus || '').toString().toLowerCase()
    const isActive = abnStatus.includes('active')
    const entityTypeDesc = data?.EntityType?.EntityDescription || data?.EntityTypeName || undefined
    const addr = data?.MainBusinessPhysicalAddress || {}

    // Prevent stale caches causing mismatched results across devices
    res.setHeader('Cache-Control', 'no-store, max-age=0')
    const debugKeys = Object.keys(data || {})
    return res.status(200).json({
      version,
      status: isActive ? 'ok' : 'not_found',
      abn,
      entityName,
      entityType: entityTypeDesc,
      abnActive: isActive,
      abnRegisteredOn: data?.ABNStatusEffectiveFrom || null,
      gst: { registered, effectiveFrom: gstEffective },
      address: {
        streetNumber: addr.Flat || '',
        streetName: `${addr.StreetName || ''} ${addr.StreetType || ''}`.trim(),
        suburb: addr.Suburb || '',
        state: addr.StateCode || '',
        postcode: addr.Postcode || ''
      },
      raw: {
        AbnStatus: data?.AbnStatus ?? data?.ABNStatus,
        Abn: data?.Abn,
        EntityTypeCode: data?.EntityTypeCode,
        GoodsAndServicesTax: data?.GoodsAndServicesTax ?? data?.GST,
        Gst: (data as any)?.Gst,
        sourceUrl: url,
        debugKeys,
        full: data
      }
    })
  } catch (e: any) {
    res.setHeader('Cache-Control', 'no-store, max-age=0')
    return res.status(200).json({ version, status: 'not_found', message: 'ABN not found or lookup failed' })
  }
}
