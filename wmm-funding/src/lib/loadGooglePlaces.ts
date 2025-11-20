export function loadGooglePlaces(apiKey?: string): Promise<typeof google> {
  return new Promise(async (resolve, reject) => {
    const w = window as any
    if (w.google?.maps?.places) return resolve(w.google)

    // Fallback: fetch key from server if not provided at build time
    let key = apiKey
    if (!key) {
      try {
        const r = await fetch('/api/maps-key', { cache: 'no-store' })
        const j = await r.json().catch(() => ({}))
        if (j?.ok && j?.key) key = j.key
      } catch {}
    }
    if (!key) return reject(new Error('Missing Google Maps API key'))

    const existing = document.querySelector('script[data-google-places]') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve(w.google))
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')))
      return
    }

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = true
    script.defer = true
    script.dataset.googlePlaces = '1'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&v=weekly`
    script.onload = () => resolve(w.google)
    script.onerror = () => reject(new Error('Failed to load Google Maps script'))
    document.head.appendChild(script)
  })
}
