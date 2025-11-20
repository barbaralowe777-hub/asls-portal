import type { AbrLookupResponse, ApplicationPayload } from './types'

export async function lookupAbn(abn: string): Promise<AbrLookupResponse> {
  // Try serverless API first
  try {
    const res = await fetch(`/api/abr-lookup?abn=${encodeURIComponent(abn)}`, {
      headers: { accept: 'application/json,text/plain;q=0.9,*/*;q=0.8' },
      cache: 'no-store'
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`Serverless error ${res.status}`)
    try {
      return JSON.parse(text)
    } catch {
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start !== -1 && end !== -1) return JSON.parse(text.slice(start, end + 1))
      return { status: 'error', message: 'Unexpected server response (HTML). Try refreshing and retry.' }
    }
  } catch (e) {
    // ignore and fall back
  }

  // Client-side fallback (may be blocked by CORS on ABR)
  try {
    const guid = (import.meta as any)?.env?.VITE_ABR_GUID
    if (!guid) return { status: 'error', message: 'ABR GUID not configured (VITE_ABR_GUID)' }
    const url = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${encodeURIComponent(abn)}&guid=${encodeURIComponent(guid)}`
    const r = await fetch(url)
    if (!r.ok) return { status: 'error', message: `ABR request failed (${r.status})` }
    const text = await r.text()
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) return { status: 'error', message: 'Invalid ABR response' }
    const data = JSON.parse(text.substring(start, end + 1))
    const entityName = data?.EntityName || data?.MainName?.OrganisationName || data?.MainTradingName?.OrganisationName || undefined
    const gstEffective = data?.GoodsAndServicesTax?.EffectiveFrom || null
    const registered = Boolean(gstEffective)
    const abnStatus = (data?.AbnStatus || '').toString().toLowerCase()
    const isActive = abnStatus.includes('active')
    return {
      status: isActive ? 'ok' : 'not_found',
      abn,
      entityName,
      entityType: data?.EntityType?.EntityDescription || data?.EntityTypeName || undefined,
      gst: { registered, effectiveFrom: gstEffective },
      raw: { AbnStatus: data?.AbnStatus, Abn: data?.Abn, EntityTypeCode: data?.EntityTypeCode }
    }
  } catch (e: any) {
    return { status: 'error', message: 'Client ABR lookup blocked (CORS) or failed' }
  }
}

export async function submitApplication(payload: ApplicationPayload): Promise<{ ok: boolean; id?: string; message?: string }> {
  const res = await fetch('/api/submit-application', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return res.json()
}

// Compress images client-side to avoid 413 payloads and keep uploads fast
async function compressImageToJpegBase64(file: File, maxDim = 1600, quality = 0.8): Promise<{ base64: string; size: number }> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    fr.onload = () => resolve(String(fr.result || ''))
    fr.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error(`Failed to load image ${file.name}`))
    el.src = dataUrl
  })
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  const scale = Math.min(1, maxDim / Math.max(w, h))
  const dstW = Math.max(1, Math.round(w * scale))
  const dstH = Math.max(1, Math.round(h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = dstW
  canvas.height = dstH
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, dstW, dstH)
  const outUrl = canvas.toDataURL('image/jpeg', quality)
  const base64 = outUrl.substring(outUrl.indexOf(',') + 1)
  // rough size estimate from base64
  const size = Math.floor((base64.length * 3) / 4)
  return { base64, size }
}

export async function fileToAttachment(file: File): Promise<{ filename: string; type: string; size: number; base64: string }> {
  const hardCap = 5 * 1024 * 1024 // 5MB absolute cap per file
  if (file.size > hardCap) {
    // allow large camera images but compress below cap
    if (file.type.startsWith('image/')) {
      const { base64, size } = await compressImageToJpegBase64(file, 1600, 0.78)
      if (size > hardCap) throw new Error(`${file.name} is too large after compression (>5MB)`)
      return { filename: file.name, type: 'image/jpeg', size, base64 }
    }
    throw new Error(`${file.name} exceeds 5MB`)
  }
  // For images > 400KB, compress to keep total payload small
  if (file.type.startsWith('image/') && file.size > 400 * 1024) {
    try {
      const { base64, size } = await compressImageToJpegBase64(file, 1600, 0.8)
      return { filename: file.name, type: 'image/jpeg', size, base64 }
    } catch {
      // fall back to raw if compression fails
    }
  }
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.onload = () => {
      const result = String(reader.result || '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.readAsDataURL(file)
  })
  return { filename: file.name, type: file.type || 'application/octet-stream', size: file.size, base64 }
}
