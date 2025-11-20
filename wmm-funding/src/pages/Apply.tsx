import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { normalizeAbn, isValidAbn } from '../lib/abn'
import { fileToAttachment, submitApplication, lookupAbn } from '../apiClient'
import { downloadSummaryPdf } from '../lib/summaryPdf'
import { loadGooglePlaces } from '../lib/loadGooglePlaces'
import { downloadSummaryPdf } from '../lib/summaryPdf'
import useMedia from '../lib/useMedia'

export default function Apply() {
  const isMobile = useMedia('(max-width: 640px)')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [form, setForm] = useState<any>({
    // ABN + Entity
    businessName: '',
    abn: '',
    entityType: 'Sole Trader',
    acn: '',
    trustDetails: '',
    gstRegistered: false,
    abnActive: false,

    // Loan
    requestedAmount: '' as any as number,
    loanPurpose: '',

    // Security
    isOwnerOfProperty: 'Yes',
    propertyOwnershipNames: '',
    securityAddress: '',
    estimatedPropertyValue: '' as any as number,
    loanTermMonths: 12 as 6 | 12 | 18,
    existingDebtAndLender: '',
    existingDebtAmount: '' as any as number,
    existingDebtLender: '',

    // Exit & Timing
    exitStrategy: '',
    exitStrategyDetails: '',
    turnaroundExpectation: '',

    // Contact
    contactName: '',
    contactEmail: '',
    contactPhone: '',

    // Directors + Guarantors
    directors: [
      { title: '', firstName: '', lastName: '', dob: '', phone: '', address: '', email: '', id: {} },
      { title: '', firstName: '', lastName: '', dob: '', phone: '', address: '', email: '', id: {} }
    ],
    directorsAreGuarantors: true,
    guarantors: [
      { title: '', firstName: '', lastName: '', dob: '', phone: '', address: '', email: '', relationshipToDirector: '', id: {} },
      { title: '', firstName: '', lastName: '', dob: '', phone: '', address: '', email: '', relationshipToDirector: '', id: {} }
    ],

    // Docs
    supportingDocs: [],
    accountantsLetter: undefined,

    // Misc
    notes: '',
    acceptTerms: false,
    consentName: '',
    consentDate: '',
    consentSignature: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [placesStatus, setPlacesStatus] = useState<'idle' | 'ready' | 'error' | 'missing_key'>('idle')

  // Google Places Autocomplete for security address
  const securityAddrRef = useRef<HTMLInputElement | null>(null)
  const [addrQuery, setAddrQuery] = useState('')
  const [addrSuggestions, setAddrSuggestions] = useState<{ id: string; text: string }[]>([])
  const [addrOpen, setAddrOpen] = useState(false)
  // Directors & Guarantors REST fallback state
  const [directorAddrQuery, setDirectorAddrQuery] = useState<string[]>(['', ''])
  const [directorAddrSuggestions, setDirectorAddrSuggestions] = useState<Array<Array<{ id: string; text: string }>>>([[], []])
  const [directorAddrOpen, setDirectorAddrOpen] = useState<boolean[]>([false, false])
  const [guarantorAddrQuery, setGuarantorAddrQuery] = useState<string[]>(['', ''])
  const [guarantorAddrSuggestions, setGuarantorAddrSuggestions] = useState<Array<Array<{ id: string; text: string }>>>([[], []])
  const [guarantorAddrOpen, setGuarantorAddrOpen] = useState<boolean[]>([false, false])
  const directorAddrRefs = useRef<Array<HTMLInputElement | null>>([])
  const guarantorAddrRefs = useRef<Array<HTMLInputElement | null>>([])
  useEffect(() => {
    const el = securityAddrRef.current
    if (!el) return
    // Avoid double-attaching
    if ((el as any)._wmPlacesAttached) return
    let ac: any
    loadGooglePlaces((import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY)
      .then((google) => {
        if (!securityAddrRef.current) return
        ac = new google.maps.places.Autocomplete(securityAddrRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'au' },
          fields: ['address_components']
        })
        ;(securityAddrRef.current as any)._wmPlacesAttached = true
        setPlacesStatus('ready')
        ac.addListener('place_changed', () => {
          const place = ac.getPlace?.() || {}
          const comps: any[] = place.address_components || []
          const get = (type: string, short = false) => {
            const c = comps.find((x: any) => Array.isArray(x.types) && x.types.includes(type))
            return c ? (short ? c.short_name : c.long_name) : ''
          }
          const streetNumber = get('street_number')
          const route = get('route')
          const locality = get('locality')
          const state = get('administrative_area_level_1', true)
          const postcode = get('postal_code')
          const full = [streetNumber, route, locality, state, postcode].filter(Boolean).join(' ')
          setForm((f: any) => ({ ...f, securityAddress: full || f.securityAddress }))
        })
      })
      .catch(() => { setPlacesStatus('error') })
    return () => { /* no-op */ }
  }, [securityAddrRef.current])

  // REST fallback for address suggestions when SDK is not ready
  useEffect(() => {
    const ready = !!(window as any).google?.maps?.places
    if (ready) { setAddrSuggestions([]); return }
    const q = (addrQuery || '').trim()
    if (q.length < 3) { setAddrSuggestions([]); return }
    const t = setTimeout(async () => {
      try {
        const r = await fetch('/api/places-autocomplete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q }) })
        const j = await r.json()
        setAddrSuggestions(Array.isArray(j?.suggestions) ? j.suggestions : [])
        setAddrOpen(true)
      } catch { setAddrSuggestions([]) }
    }, 250)
    return () => clearTimeout(t)
  }, [addrQuery])

  // REST fallback for Directors & Guarantors
  useEffect(() => {
    const ready = !!(window as any).google?.maps?.places
    if (ready) {
      setDirectorAddrSuggestions([[], []]);
      setGuarantorAddrSuggestions([[], []]);
      return
    }
    const timers: any[] = []
    const fetchFor = (q: string, setFn: (s: any) => void, idx: number) => {
      const query = (q || '').trim()
      if (query.length < 3) { setFn((prev: any) => { const arr = [...prev]; arr[idx] = []; return arr }) ; return }
      const t = setTimeout(async () => {
        try {
          const r = await fetch('/api/places-autocomplete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: query }) })
          const j = await r.json()
          setFn((prev: any) => { const arr = [...prev]; arr[idx] = Array.isArray(j?.suggestions) ? j.suggestions : []; return arr })
        } catch {
          setFn((prev: any) => { const arr = [...prev]; arr[idx] = []; return arr })
        }
      }, 250)
      timers.push(t)
    }
    directorAddrQuery.forEach((q, i) => fetchFor(q, setDirectorAddrSuggestions as any, i))
    guarantorAddrQuery.forEach((q, i) => fetchFor(q, setGuarantorAddrSuggestions as any, i))
    return () => { timers.forEach(clearTimeout) }
  }, [directorAddrQuery, guarantorAddrQuery])

  // Google Places Autocomplete for Directors and Guarantors addresses
  useEffect(() => {
    loadGooglePlaces((import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY).then((google) => {
      // Directors
      (form.directors || []).forEach((_: any, idx: number) => {
        const input = directorAddrRefs.current[idx]
        if (!input) return
        if ((input as any)._wmPlacesAttached) return
        const ac = new google.maps.places.Autocomplete(input, {
          types: ['address'],
          componentRestrictions: { country: 'au' },
          fields: ['address_components']
        })
        ;(input as any)._wmPlacesAttached = true
        ac.addListener('place_changed', () => {
          const place = ac.getPlace?.() || {}
          const comps: any[] = place.address_components || []
          const get = (type: string, short = false) => {
            const c = comps.find((x: any) => Array.isArray(x.types) && x.types.includes(type))
            return c ? (short ? c.short_name : c.long_name) : ''
          }
          const streetNumber = get('street_number')
          const route = get('route')
          const locality = get('locality')
          const state = get('administrative_area_level_1', true)
          const postcode = get('postal_code')
          const full = [streetNumber, route, locality, state, postcode].filter(Boolean).join(' ')
          setForm((f: any) => ({
            ...f,
            directors: (f.directors || []).map((d: any, i: number) => i === idx ? { ...d, address: full || d.address } : d)
          }))
        })
      })
      // Guarantors
      ;(form.guarantors || []).forEach((_: any, idx: number) => {
        const input = guarantorAddrRefs.current[idx]
        if (!input) return
        if ((input as any)._wmPlacesAttached) return
        const ac = new google.maps.places.Autocomplete(input, {
          types: ['address'],
          componentRestrictions: { country: 'au' },
          fields: ['address_components']
        })
        ;(input as any)._wmPlacesAttached = true
        ac.addListener('place_changed', () => {
          const place = ac.getPlace?.() || {}
          const comps: any[] = place.address_components || []
          const get = (type: string, short = false) => {
            const c = comps.find((x: any) => Array.isArray(x.types) && x.types.includes(type))
            return c ? (short ? c.short_name : c.long_name) : ''
          }
          const streetNumber = get('street_number')
          const route = get('route')
          const locality = get('locality')
          const state = get('administrative_area_level_1', true)
          const postcode = get('postal_code')
          const full = [streetNumber, route, locality, state, postcode].filter(Boolean).join(' ')
          setForm((f: any) => ({
            ...f,
            guarantors: (f.guarantors || []).map((g: any, i: number) => i === idx ? { ...g, address: full || g.address } : g)
          }))
        })
      })
    }).catch(() => {})
  }, [form.directors?.length, form.guarantors?.length, form.directorsAreGuarantors])

  useEffect(() => {
    const abn = normalizeAbn(params.get('abn') || '')
    const gst = params.get('gst') === '1'
    const name = params.get('name') || ''
    if (abn || gst || name) setForm((f: any) => ({ ...f, abn, gstRegistered: gst, businessName: name }))
  }, [params])

  const abnValid = useMemo(() => isValidAbn(form.abn), [form.abn])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const missing: string[] = []
    const isBlank = (v: any) => !String(v ?? '').trim()

    if (!abnValid) missing.push('Valid ABN')
    if (isBlank(form.businessName)) missing.push('Business Name')
    if (isBlank(form.entityType)) missing.push('Entity Type')
    if (isBlank(form.requestedAmount)) missing.push('Requested Amount')
    if (isBlank(form.loanTermMonths)) missing.push('Loan Term')
    if (isBlank(form.loanPurpose)) missing.push('Loan Purpose')
    if (isBlank(form.securityAddress)) missing.push('Property Address')

    // Contact
    if (isBlank(form.contactName)) missing.push('Contact Name')
    if (isBlank(form.contactEmail)) missing.push('Contact Email')
    if (isBlank(form.contactPhone)) missing.push('Contact Phone')

    // Directors mandatory (title optional, names + email required)
    const d1 = form.directors?.[0] || {}
    if (isBlank(d1.firstName)) missing.push('Director 1 First Name')
    if (isBlank(d1.lastName)) missing.push('Director 1 Last Name')
    if (isBlank(d1.email)) missing.push('Director 1 Email')
    if (isBlank(d1.dob)) missing.push('Director 1 DOB')

    if ((form.directors?.length || 1) > 1) {
      const d2 = form.directors?.[1] || {}
      if (isBlank(d2.firstName)) missing.push('Director 2 First Name')
      if (isBlank(d2.lastName)) missing.push('Director 2 Last Name')
      if (isBlank(d2.email)) missing.push('Director 2 Email')
      if (isBlank(d2.dob)) missing.push('Director 2 DOB')
    }

    // Guarantors required if not same as directors
    if (form.directorsAreGuarantors === false) {
      (form.guarantors || []).forEach((g: any, idx: number) => {
        if (isBlank(g.firstName)) missing.push(`Guarantor ${idx + 1} First Name`)
        if (isBlank(g.lastName)) missing.push(`Guarantor ${idx + 1} Last Name`)
        if (isBlank(g.email)) missing.push(`Guarantor ${idx + 1} Email`)
        if (isBlank(g.relationshipToDirector)) missing.push(`Guarantor ${idx + 1} Relationship`)
        if (isBlank(g.dob)) missing.push(`Guarantor ${idx + 1} DOB`)
      })
    }

    // Terms/consent
    if (!form.acceptTerms) missing.push('Accept Terms')
    if (isBlank(form.consentName)) missing.push('Applicant Name')
    if (isBlank(form.consentDate)) missing.push('Consent Date')
    if (isBlank(form.consentSignature)) missing.push('Signature')

    if (missing.length) {
      setError(`Please complete: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? '…' : ''}`)
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        businessName: form.businessName,
        abn: normalizeAbn(form.abn),
        entityType: form.entityType,
        acn: form.acn || undefined,
        trustDetails: form.trustDetails || undefined,
        gstRegistered: !!form.gstRegistered,
        abnActive: !!form.abnActive,
        requestedAmount: form.requestedAmount ? Number(form.requestedAmount) : undefined,
        loanPurpose: form.loanPurpose || undefined,
        isOwnerOfProperty: form.isOwnerOfProperty as 'Yes' | 'No',
        propertyOwnershipNames: form.propertyOwnershipNames || undefined,
        securityAddress: form.securityAddress || undefined,
        estimatedPropertyValue: form.estimatedPropertyValue ? Number(form.estimatedPropertyValue) : undefined,
        loanTermMonths: form.loanTermMonths as 6 | 12 | 18,
        existingDebtAndLender: form.existingDebtAndLender || undefined,
        existingDebtAmount: form.existingDebtAmount ? Number(form.existingDebtAmount) : undefined,
        existingDebtLender: form.existingDebtLender || undefined,
        exitStrategy: form.exitStrategy || undefined,
        exitStrategyDetails: form.exitStrategyDetails || undefined,
        turnaroundExpectation: form.turnaroundExpectation || undefined,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone || undefined,
        directors: form.directors,
        directorsAreGuarantors: !!form.directorsAreGuarantors,
        guarantors: form.directorsAreGuarantors ? [] : form.guarantors,
        supportingDocs: form.supportingDocs,
        accountantsLetter: form.accountantsLetter,
        trustDeed: form.trustDeed,
        notes: form.notes || undefined,
        acceptTerms: !!form.acceptTerms,
        consentName: form.consentName || undefined,
        consentDate: form.consentDate || undefined,
        consentSignature: form.consentSignature || undefined
      }
      const res = await submitApplication(payload)
      if (res.ok) navigate('/success')
      else setError(res.message || 'Submission failed.')
    } catch (e) {
      setError('Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1>Second Mortgage Funding Application</h1>
      <p className="wm-help">Provide your details and we’ll email the application to our team.</p>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16, maxWidth: 900, marginTop: 12 }}>
        {/* ABN Verification & Entity */}
        <div className="wm-card" style={{ display: 'grid', gap: 12 }}>
          <div className="wm-section-title">ABN Verification & Entity</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <label>
              <div>ABN</div>
              <input className="wm-input" value={form.abn} onChange={(e) => setForm({ ...form, abn: e.target.value })} inputMode="numeric" />
              {!abnValid && form.abn && <div className="wm-error" style={{ fontSize: 12 }}>Invalid ABN</div>}
            </label>
            <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
              <button type="button" className="wm-button" onClick={async () => {
                const clean = normalizeAbn(form.abn)
                if (!/^[0-9]{11}$/.test(clean)) { setError('Enter an 11-digit ABN'); return }
                const res: any = await lookupAbn(clean)
                if (!res || res.status === 'not_found') { setError('ABN not found or inactive'); return }
                if (res.status === 'error') { setError(res.message || 'ABN lookup failed'); return }
                const t = (res.entityType || '').toString().toLowerCase()
                let mapped: 'Sole Trader' | 'Company' | 'Trust' = form.entityType
                if (t.includes('trust')) mapped = 'Trust'
                else if (t.includes('company')) mapped = 'Company'
                else if (t.includes('sole') || t.includes('individual')) mapped = 'Sole Trader'
                setForm((f: any) => ({ ...f, businessName: res.entityName || f.businessName, gstRegistered: !!res.gst?.registered, abnActive: !!res.abnActive || res.status === 'ok', entityType: mapped }))
                setError(null)
              }}>Verify ABN</button>
            </div>
          </div>
          {form.abnActive && (
            <div className="wm-help" style={{ display: 'grid', gap: 4 }}>
              <div style={{ color: '#22c55e' }}>✓ ABN Active</div>
              <div>
                GST Registered: <strong style={{ color: form.gstRegistered ? '#22c55e' : '#ef4444' }}>
                  {form.gstRegistered ? 'Yes' : 'No'}
                </strong>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <label>
              <div>Borrowing Entity Name</div>
              <input className="wm-input" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
            </label>
            <label>
              <div>Entity Type</div>
              <select className="wm-input" value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value })}>
                <option>Sole Trader</option>
                <option>Company</option>
                <option>Trust</option>
              </select>
            </label>
          </div>
          {(form.entityType === 'Company' || form.entityType === 'Trust') && (
            <label>
              <div>ACN (if Company)</div>
              <input className="wm-input" value={form.acn} onChange={(e) => setForm({ ...form, acn: e.target.value })} />
            </label>
          )}
          {form.entityType === 'Trust' && (
            <label>
              <div>Details of Trust</div>
              <textarea className="wm-textarea" rows={3} value={form.trustDetails} onChange={(e) => setForm({ ...form, trustDetails: e.target.value })} />
            </label>
          )}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={!!form.gstRegistered}
                onChange={(e) => setForm({ ...form, gstRegistered: e.target.checked })}
              />
              GST Registered
            </label>
          </div>
        </div>

        {/* Loan Details */}
        <div className="wm-card" style={{ display: 'grid', gap: 12 }}>
          <div className="wm-section-title">Loan Details</div>
          <label>
            <div>Loan Amount Required</div>
            <input className="wm-input" type="number" min="0" step="1000" value={form.requestedAmount as any} onChange={(e) => setForm({ ...form, requestedAmount: (e.target.value as any) })} />
          </label>
          <label>
            <div>Purpose of Loan</div>
            <textarea className="wm-textarea" rows={5} value={form.loanPurpose} onChange={(e) => setForm({ ...form, loanPurpose: e.target.value })} />
          </label>
        </div>

        {/* Security Details */}
        <div className="wm-card" style={{ display: 'grid', gap: 12 }}>
          <div className="wm-section-title">Security Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <label>
              <div>Is the applicant the owner of the secured property?</div>
              <select className="wm-input" value={form.isOwnerOfProperty} onChange={(e) => setForm({ ...form, isOwnerOfProperty: e.target.value })}>
                <option>Yes</option>
                <option>No</option>
              </select>
            </label>
            <label>
              <div>Property Ownership - Name(s) on Title</div>
              <input className="wm-input" value={form.propertyOwnershipNames} onChange={(e) => setForm({ ...form, propertyOwnershipNames: e.target.value })} />
            </label>
          </div>
          <label>
              <div>Security Property Address</div>
              <div style={{ position: 'relative' }}>
                <input
                  ref={securityAddrRef}
                  className="wm-input"
                  autoComplete="off"
                  placeholder="Start typing address…"
                  value={form.securityAddress}
                  onFocus={() => setAddrOpen(true)}
                  onBlur={() => setTimeout(() => setAddrOpen(false), 150)}
                  onChange={(e) => { setForm({ ...form, securityAddress: e.target.value }); setAddrQuery(e.target.value) }}
                />
                {!!addrOpen && addrSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', border: '1px solid #333', zIndex: 9999, maxHeight: 220, overflowY: 'auto', borderRadius: 6 }}>
                    {addrSuggestions.map((s, i) => (
                      <div key={s.id + i} style={{ padding: '8px 10px', cursor: 'pointer' }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={async () => {
                          try {
                            const r = await fetch('/api/place-details', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id }) })
                            const j = await r.json()
                            const full = j?.address?.full || s.text
                            setForm((f:any) => ({ ...f, securityAddress: full }))
                          } catch {
                            setForm((f:any) => ({ ...f, securityAddress: s.text }))
                          }
                          setAddrSuggestions([]); setAddrOpen(false)
                        }}
                      >{s.text}</div>
                    ))}
                  </div>
                )}
              </div>
              {/* Suppress error messaging while configuring Places; only show help when active */}
              {placesStatus === 'ready' && (
                <div className="wm-help" style={{ fontSize: 12, color: '#888' }}>Autocomplete powered by Google Places.</div>
              )}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
            <label>
              <div>Estimated Value of Security Property</div>
              <input className="wm-input" type="number" min="0" step="1000" value={form.estimatedPropertyValue as any} onChange={(e) => setForm({ ...form, estimatedPropertyValue: (e.target.value as any) })} />
            </label>
            <label>
              <div>Loan Term</div>
              <select className="wm-input" value={form.loanTermMonths} onChange={(e) => setForm({ ...form, loanTermMonths: Number(e.target.value) })}>
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
                <option value={18}>18 months</option>
              </select>
            </label>
          </div>
        </div>

        {/* Existing Debt (separate row for spacing) */}
        <div className="wm-card" style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <label>
              <div>Existing Debt (First Mortgage) Amount</div>
              <input className="wm-input" type="number" inputMode="decimal" placeholder="$"
                value={form.existingDebtAmount}
                onChange={(e) => setForm({ ...form, existingDebtAmount: e.target.value })}
              />
            </label>
            <label>
              <div>Existing Debt Lender Details</div>
              <input className="wm-input" value={form.existingDebtLender}
                onChange={(e) => setForm({ ...form, existingDebtLender: e.target.value })}
              />
            </label>
          </div>
        </div>

        {/* Directors */}
        <div className="wm-card" style={{ display: 'grid', gap: 12 }}>
          <div className="wm-section-title">Directors</div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>Number of Directors</span>
            <select
              className="wm-input"
              value={(form.directors?.length || 1) >= 2 ? '2' : '1'}
              onChange={(e) => {
                const n = e.target.value === '2' ? 2 : 1
                setForm((prev: any) => {
                  const current = prev.directors || []
                  if (n === 1) {
                    return { ...prev, directors: [current[0] || { firstName: '', lastName: '', phone: '', address: '', email: '', id: {} }] }
                  }
                  // ensure two entries, preserving existing values
                  const d0 = current[0] || { firstName: '', lastName: '', phone: '', address: '', email: '', id: {} }
                  const d1 = current[1] || { firstName: '', lastName: '', phone: '', address: '', email: '', id: {} }
                  return { ...prev, directors: [d0, d1] }
                })
              }}
            >
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </label>
          {(form.directors?.length === 2 ? [0,1] : [0]).map((idx) => (
            <div key={idx} className="wm-card" style={{ display: 'grid', gap: 12 }}>
              {idx === 1 ? <div style={{ fontWeight: 600, marginBottom: 4 }}>Director 2</div> : null}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'auto 1fr 1fr' : '120px 1fr 1fr', gap: 12, alignItems: 'end' }}>
                <label>
                  <div>Title</div>
                  <select className="wm-input" value={form.directors[idx].title || ''} onChange={(e) => setForm({ ...form, directors: form.directors.map((d:any,i:number)=> i===idx? { ...d, title: e.target.value }: d) })}>
                    <option value="">Select</option>
                    <option>Mr</option>
                    <option>Mrs</option>
                    <option>Miss</option>
                    <option>Ms</option>
                    <option>Dr</option>
                  </select>
                </label>
                <label>
                  <div>First Name</div>
                  <input className="wm-input" value={form.directors[idx].firstName} onChange={(e) => setForm({ ...form, directors: form.directors.map((d:any,i:number)=> i===idx? { ...d, firstName: e.target.value }: d) })} />
                </label>
                <label>
                  <div>Last Name</div>
                  <input className="wm-input" value={form.directors[idx].lastName} onChange={(e) => setForm({ ...form, directors: form.directors.map((d:any,i:number)=> i===idx? { ...d, lastName: e.target.value }: d) })} />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
                <label>
                  <div>Phone</div>
                  <input className="wm-input" value={form.directors[idx].phone} onChange={(e) => setForm({ ...form, directors: form.directors.map((d:any,i:number)=> i===idx? { ...d, phone: e.target.value }: d) })} />
                </label>
                <label>
                  <div>Email</div>
                  <input className="wm-input" type="email" value={form.directors[idx].email} onChange={(e) => setForm({ ...form, directors: form.directors.map((d:any,i:number)=> i===idx? { ...d, email: e.target.value }: d) })} />
                </label>
                <label>
                  <div>Date of Birth</div>
                  <input className="wm-input" type="date" lang="en-AU" placeholder="dd/mm/yyyy" value={form.directors[idx].dob || ''} onChange={(e) => setForm({ ...form, directors: form.directors.map((d:any,i:number)=> i===idx? { ...d, dob: e.target.value }: d) })} />
                </label>
              </div>
              <label>
                <div>Address</div>
                <div style={{ position: 'relative' }}>
                  <input
                    className="wm-input"
                    ref={(el) => (directorAddrRefs.current[idx] = el)}
                    value={form.directors[idx].address}
                    onFocus={() => setDirectorAddrOpen((prev) => { const a=[...prev]; a[idx]=true; return a })}
                    onBlur={() => setTimeout(() => setDirectorAddrOpen((prev) => { const a=[...prev]; a[idx]=false; return a }), 150)}
                    onChange={(e) => {
                      const v = e.target.value
                      setForm({
                        ...form,
                        directors: form.directors.map((d: any, i: number) => i === idx ? { ...d, address: v } : d)
                      })
                      setDirectorAddrQuery((prev) => { const a=[...prev]; a[idx]=v; return a })
                    }}
                  />
                  {!!directorAddrOpen[idx] && (directorAddrSuggestions[idx] || []).length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', border: '1px solid #333', zIndex: 9999, maxHeight: 220, overflowY: 'auto', borderRadius: 6 }}>
                      {(directorAddrSuggestions[idx] || []).map((s, j) => (
                        <div key={s.id + j} style={{ padding: '8px 10px', cursor: 'pointer' }}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={async () => {
                            try {
                              const r = await fetch('/api/place-details', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id }) })
                              const j = await r.json()
                              const full = j?.address?.full || s.text
                              setForm((f:any) => ({ ...f, directors: f.directors.map((d:any,i:number)=> i===idx? { ...d, address: full }: d) }))
                            } catch {
                              setForm((f:any) => ({ ...f, directors: f.directors.map((d:any,i:number)=> i===idx? { ...d, address: s.text }: d) }))
                            }
                            setDirectorAddrSuggestions((prev:any)=>{ const a=[...prev]; a[idx]=[]; return a })
                            setDirectorAddrOpen((prev)=>{ const a=[...prev]; a[idx]=false; return a })
                          }}
                        >{s.text}</div>
                      ))}
                    </div>
                  )}
                </div>
              </label>
              <div className="wm-card" style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
                  <label>
                    <div>Driver Licence Number</div>
                    <input className="wm-input" value={form.directors[idx].id?.licenseNumber || ''} onChange={(e) => setForm({ ...form, directors: form.directors.map((d:any,i:number)=> i===idx? { ...d, id: { ...d.id, licenseNumber: e.target.value } }: d) })} />
                  </label>
                  <label>
                    <div>State of Issue</div>
                    <select className="wm-input" value={form.directors[idx].id?.licenseState || ''} onChange={(e) => setForm({ ...form, directors: form.directors.map((d:any,i:number)=> i===idx? { ...d, id: { ...d.id, licenseState: e.target.value } }: d) })}>
                      <option value="">Select</option>
                      <option>NSW</option><option>QLD</option><option>VIC</option><option>SA</option><option>WA</option><option>TAS</option><option>NT</option><option>ACT</option>
                    </select>
                  </label>
                  <label>
                    <div>Licence Expiry</div>
                    <input className="wm-input" type="date" lang="en-AU" placeholder="dd/mm/yyyy" value={form.directors[idx].id?.licenseExpiry || ''} onChange={(e) => setForm({ ...form, directors: form.directors.map((d:any,i:number)=> i===idx? { ...d, id: { ...d.id, licenseExpiry: e.target.value } }: d) })} />
                  </label>
                </div>
                {/* ID uploads */}
                <div className="wm-help">Accepted files: PDF, JPG, PNG — max 5MB each</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
                  <label>
                    <div>Licence Front (JPG/PNG/PDF, max 5MB)</div>
                    <input className="wm-input" type="file" accept="image/*,application/pdf" onChange={async (e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      try { const a = await fileToAttachment(f); setForm({ ...form, directors: form.directors.map((d:any,i:number)=> i===idx? { ...d, id: { ...d.id, licenseFront: a } }: d) }) } catch(err:any){ alert(err.message) }
                    }} />
                  </label>
                  <label>
                    <div>Licence Back (JPG/PNG/PDF, max 5MB)</div>
                    <input className="wm-input" type="file" accept="image/*,application/pdf" onChange={async (e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      try { const a = await fileToAttachment(f); setForm({ ...form, directors: form.directors.map((d:any,i:number)=> i===idx? { ...d, id: { ...d.id, licenseBack: a } }: d) }) } catch(err:any){ alert(err.message) }
                    }} />
                  </label>
                  <div />
                </div>
                {/* Medicare number + expiry side-by-side on desktop */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  <label>
                    <div>Medicare Number</div>
                    <input className="wm-input" value={form.directors[idx].id?.medicareNumber || ''} onChange={(e) => setForm({ ...form, directors: form.directors.map((d:any,i:number)=> i===idx? { ...d, id: { ...d.id, medicareNumber: e.target.value } }: d) })} />
                  </label>
                  <label>
                    <div>Medicare Expiry</div>
                    <input className="wm-input" type="month" value={form.directors[idx].id?.medicareExpiry || ''} onChange={(e) => setForm({ ...form, directors: form.directors.map((d:any,i:number)=> i===idx? { ...d, id: { ...d.id, medicareExpiry: e.target.value } }: d) })} />
                  </label>
                </div>
                {/* Medicare front upload on its own row to avoid squish */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                  <label>
                    <div>Medicare Front (JPG/PNG/PDF, max 5MB)</div>
                    <input className="wm-input" type="file" accept="image/*,application/pdf" onChange={async (e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      try { const a = await fileToAttachment(f); setForm({ ...form, directors: form.directors.map((d:any,i:number)=> i===idx? { ...d, id: { ...d.id, medicareFront: a } }: d) }) } catch(err:any){ alert(err.message) }
                    }} />
                  </label>
                </div>
              </div>
            </div>
          ))}
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>Are the Directors the Guarantors?</span>
            <select className="wm-input" value={form.directorsAreGuarantors ? 'Yes' : 'No'} onChange={(e) => setForm({ ...form, directorsAreGuarantors: e.target.value === 'Yes' })}>
              <option>Yes</option>
              <option>No</option>
            </select>
          </label>
        </div>

        {/* Guarantors */}
        {!form.directorsAreGuarantors && (
          <div className="wm-card" style={{ display: 'grid', gap: 12 }}>
            <div className="wm-section-title">Guarantors</div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>Number of Guarantors</span>
              <select
                className="wm-input"
                value={(form.guarantors?.length || 1) >= 2 ? '2' : '1'}
                onChange={(e) => {
                  const n = e.target.value === '2' ? 2 : 1
                  setForm((prev: any) => {
                    const current = prev.guarantors || []
                    if (n === 1) {
                      return { ...prev, guarantors: [current[0] || { title: '', firstName: '', lastName: '', dob: '', phone: '', address: '', email: '', relationshipToDirector: '', id: {} }] }
                    }
                    const g0 = current[0] || { title: '', firstName: '', lastName: '', dob: '', phone: '', address: '', email: '', relationshipToDirector: '', id: {} }
                    const g1 = current[1] || { title: '', firstName: '', lastName: '', dob: '', phone: '', address: '', email: '', relationshipToDirector: '', id: {} }
                    return { ...prev, guarantors: [g0, g1] }
                  })
                }}
              >
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </label>
            {(form.guarantors?.length === 2 ? [0,1] : [0]).map((idx) => (
              <div key={idx} className="wm-card" style={{ display: 'grid', gap: 12 }}>
                {idx === 1 ? <div style={{ fontWeight: 600, marginBottom: 4 }}>Guarantor 2</div> : null}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'auto 1fr 1fr 1fr' : '120px 1fr 1fr 1fr', gap: 12, alignItems: 'end' }}>
                  <label>
                    <div>Title</div>
                    <select className="wm-input" value={form.guarantors[idx].title || ''} onChange={(e) => setForm({ ...form, guarantors: form.guarantors.map((g:any,i:number)=> i===idx? { ...g, title: e.target.value }: g) })}>
                      <option value="">Select</option>
                      <option>Mr</option>
                      <option>Mrs</option>
                      <option>Miss</option>
                      <option>Ms</option>
                      <option>Dr</option>
                    </select>
                  </label>
                  <label>
                    <div>First Name</div>
                    <input className="wm-input" value={form.guarantors[idx].firstName} onChange={(e) => setForm({ ...form, guarantors: form.guarantors.map((g:any,i:number)=> i===idx? { ...g, firstName: e.target.value }: g) })} />
                  </label>
                  <label>
                    <div>Last Name</div>
                    <input className="wm-input" value={form.guarantors[idx].lastName} onChange={(e) => setForm({ ...form, guarantors: form.guarantors.map((g:any,i:number)=> i===idx? { ...g, lastName: e.target.value }: g) })} />
                  </label>
                  <label>
                    <div>Relationship to Director</div>
                    <select className="wm-input" value={form.guarantors[idx].relationshipToDirector} onChange={(e) => setForm({ ...form, guarantors: form.guarantors.map((g:any,i:number)=> i===idx? { ...g, relationshipToDirector: e.target.value }: g) })}>
                      <option value="">Select</option>
                      <option>Mother</option><option>Father</option><option>Brother</option><option>Sister</option><option>Business Partner</option><option>Work Colleague</option><option>Friend</option><option>Relative</option>
                    </select>
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
                  <label>
                    <div>Phone</div>
                    <input className="wm-input" value={form.guarantors[idx].phone} onChange={(e) => setForm({ ...form, guarantors: form.guarantors.map((g:any,i:number)=> i===idx? { ...g, phone: e.target.value }: g) })} />
                  </label>
                  <label>
                    <div>Email</div>
                    <input className="wm-input" type="email" value={form.guarantors[idx].email} onChange={(e) => setForm({ ...form, guarantors: form.guarantors.map((g:any,i:number)=> i===idx? { ...g, email: e.target.value }: g) })} />
                  </label>
                  <label>
                    <div>Date of Birth</div>
                    <input className="wm-input" type="date" lang="en-AU" placeholder="dd/mm/yyyy" value={form.guarantors[idx].dob || ''} onChange={(e) => setForm({ ...form, guarantors: form.guarantors.map((g:any,i:number)=> i===idx? { ...g, dob: e.target.value }: g) })} />
                  </label>
                </div>
                <label>
                  <div>Address</div>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="wm-input"
                      ref={(el) => (guarantorAddrRefs.current[idx] = el)}
                      value={form.guarantors[idx].address}
                      onFocus={() => setGuarantorAddrOpen((prev) => { const a=[...prev]; a[idx]=true; return a })}
                      onBlur={() => setTimeout(() => setGuarantorAddrOpen((prev) => { const a=[...prev]; a[idx]=false; return a }), 150)}
                      onChange={(e) => {
                        const v = e.target.value
                        setForm({
                          ...form,
                          guarantors: form.guarantors.map((g: any, i: number) => i === idx ? { ...g, address: v } : g)
                        })
                        setGuarantorAddrQuery((prev) => { const a=[...prev]; a[idx]=v; return a })
                      }}
                    />
                    {!!guarantorAddrOpen[idx] && (guarantorAddrSuggestions[idx] || []).length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', border: '1px solid #333', zIndex: 9999, maxHeight: 220, overflowY: 'auto', borderRadius: 6 }}>
                        {(guarantorAddrSuggestions[idx] || []).map((s, j) => (
                          <div key={s.id + j} style={{ padding: '8px 10px', cursor: 'pointer' }}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={async () => {
                              try {
                                const r = await fetch('/api/place-details', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id }) })
                                const j = await r.json()
                                const full = j?.address?.full || s.text
                                setForm((f:any) => ({ ...f, guarantors: f.guarantors.map((g:any,i:number)=> i===idx? { ...g, address: full }: g) }))
                              } catch {
                                setForm((f:any) => ({ ...f, guarantors: f.guarantors.map((g:any,i:number)=> i===idx? { ...g, address: s.text }: g) }))
                              }
                              setGuarantorAddrSuggestions((prev:any)=>{ const a=[...prev]; a[idx]=[]; return a })
                              setGuarantorAddrOpen((prev)=>{ const a=[...prev]; a[idx]=false; return a })
                            }}
                          >{s.text}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
                <div className="wm-card" style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
                    <label>
                      <div>Driver Licence Number</div>
                      <input className="wm-input" value={form.guarantors[idx].id?.licenseNumber || ''} onChange={(e) => setForm({ ...form, guarantors: form.guarantors.map((g:any,i:number)=> i===idx? { ...g, id: { ...g.id, licenseNumber: e.target.value } }: g) })} />
                    </label>
                    <label>
                      <div>State of Issue</div>
                      <select className="wm-input" value={form.guarantors[idx].id?.licenseState || ''} onChange={(e) => setForm({ ...form, guarantors: form.guarantors.map((g:any,i:number)=> i===idx? { ...g, id: { ...g.id, licenseState: e.target.value } }: g) })}>
                        <option value="">Select</option>
                        <option>NSW</option><option>QLD</option><option>VIC</option><option>SA</option><option>WA</option><option>TAS</option><option>NT</option><option>ACT</option>
                      </select>
                    </label>
                    <label>
                      <div>Licence Expiry</div>
                      <input className="wm-input" type="date" lang="en-AU" placeholder="dd/mm/yyyy" value={form.guarantors[idx].id?.licenseExpiry || ''} onChange={(e) => setForm({ ...form, guarantors: form.guarantors.map((g:any,i:number)=> i===idx? { ...g, id: { ...g.id, licenseExpiry: e.target.value } }: g) })} />
                    </label>
                  </div>
                  <div className="wm-help">Accepted files: PDF, JPG, PNG — max 5MB each</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
                    <label>
                      <div>Licence Front (JPG/PNG/PDF, max 5MB)</div>
                      <input className="wm-input" type="file" accept="image/*,application/pdf" onChange={async (e) => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        try { const a = await fileToAttachment(f); setForm({ ...form, guarantors: form.guarantors.map((g:any,i:number)=> i===idx? { ...g, id: { ...g.id, licenseFront: a } }: g) }) } catch(err:any){ alert(err.message) }
                      }} />
                    </label>
                    <label>
                      <div>Licence Back (JPG/PNG/PDF, max 5MB)</div>
                      <input className="wm-input" type="file" accept="image/*,application/pdf" onChange={async (e) => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        try { const a = await fileToAttachment(f); setForm({ ...form, guarantors: form.guarantors.map((g:any,i:number)=> i===idx? { ...g, id: { ...g.id, licenseBack: a } }: g) }) } catch(err:any){ alert(err.message) }
                      }} />
                    </label>
                    <div />
                  </div>
                  {/* Medicare number + expiry side-by-side on desktop */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                    <label>
                      <div>Medicare Number</div>
                      <input className="wm-input" value={form.guarantors[idx].id?.medicareNumber || ''} onChange={(e) => setForm({ ...form, guarantors: form.guarantors.map((g:any,i:number)=> i===idx? { ...g, id: { ...g.id, medicareNumber: e.target.value } }: g) })} />
                    </label>
                    <label>
                      <div>Medicare Expiry</div>
                      <input className="wm-input" type="month" value={form.guarantors[idx].id?.medicareExpiry || ''} onChange={(e) => setForm({ ...form, guarantors: form.guarantors.map((g:any,i:number)=> i===idx? { ...g, id: { ...g.id, medicareExpiry: e.target.value } }: g) })} />
                    </label>
                  </div>
                  {/* Medicare front upload on its own row to avoid squish */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                    <label>
                      <div>Medicare Front (JPG/PNG/PDF, max 5MB)</div>
                      <input className="wm-input" type="file" accept="image/*,application/pdf" onChange={async (e) => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        try { const a = await fileToAttachment(f); setForm({ ...form, guarantors: form.guarantors.map((g:any,i:number)=> i===idx? { ...g, id: { ...g.id, medicareFront: a } }: g) }) } catch(err:any){ alert(err.message) }
                      }} />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Supporting Documents */}
        <div className="wm-card" style={{ display: 'grid', gap: 12 }}>
          <div className="wm-section-title">Supporting Documents</div>
          <div className="wm-help">Accepted files: PDF, JPG, PNG — max 5MB each. You can upload multiple supporting files.</div>
          <label>
            <div>Rates Notice (JPG/PNG/PDF, max 5MB)</div>
            <input className="wm-input" type="file" accept="image/*,application/pdf" onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              try { const a = await fileToAttachment(f); setForm({ ...form, supportingDocs: [...(form.supportingDocs || []), a] }) } catch(err:any){ alert(err.message) }
            }} />
          </label>
          {form.entityType === 'Trust' && (
            <label>
              <div>Trust Deed (JPG/PNG/PDF, max 5MB)</div>
              <input className="wm-input" type="file" accept="image/*,application/pdf" onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                try { const a = await fileToAttachment(f); setForm({ ...form, trustDeed: a }) } catch(err:any){ alert(err.message) }
              }} />
            </label>
          )}
          <label>
            <div>Accountant’s Letter (JPG/PNG/PDF, max 5MB)</div>
            <input className="wm-input" type="file" accept="image/*,application/pdf" onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              try { const a = await fileToAttachment(f); setForm({ ...form, accountantsLetter: a }) } catch(err:any){ alert(err.message) }
            }} />
          </label>
          <label>
            <div>Bank Statements (12 months) — you can add multiple files</div>
            <input className="wm-input" type="file" multiple accept="image/*,application/pdf" onChange={async (e) => {
              const files = Array.from(e.target.files || [])
              const current = form.supportingDocs || []
              let list = [...current]
              for (const f of files) { try { list.push(await fileToAttachment(f)) } catch(err:any){ alert(err.message) } }
              setForm({ ...form, supportingDocs: list })
            }} />
          </label>
          {form.supportingDocs?.length ? <div className="wm-help">Attached: {form.supportingDocs.length} file(s)</div> : null}
          {form.accountantsLetter ? <div className="wm-help">Accountant’s Letter attached: {form.accountantsLetter.filename}</div> : null}
        </div>

        {/* Exit Strategy & Timing + Contact */}
        <div className="wm-card" style={{ display: 'grid', gap: 12 }}>
          <div className="wm-section-title">Exit Strategy & Timing</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <label>
              <div>Exit Strategy</div>
              <select className="wm-input" value={form.exitStrategy} onChange={(e) => setForm({ ...form, exitStrategy: e.target.value })}>
                <option value="">Select</option>
                <option>Sale of Asset</option>
                <option>Refinancing to Bank</option>
                <option>Trading with increased trade</option>
                <option>Sale of Other Assets</option>
              </select>
            </label>
            <label>
              <div>Expectation on turnaround time</div>
              <input className="wm-input" value={form.turnaroundExpectation} onChange={(e) => setForm({ ...form, turnaroundExpectation: e.target.value })} />
            </label>
          </div>
          <label>
            <div>Exit Strategy — explain in more detail</div>
            <textarea className="wm-textarea" rows={4} value={form.exitStrategyDetails} onChange={(e) => setForm({ ...form, exitStrategyDetails: e.target.value })} />
          </label>

          <div className="wm-section-title">Contact</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <label>
              <div>Contact Name</div>
              <input className="wm-input" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </label>
            <label>
              <div>Contact Email</div>
              <input className="wm-input" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <label>
              <div>Contact Phone (optional)</div>
              <input className="wm-input" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </label>
            <label>
              <div>Special conditions (optional)</div>
              <textarea className="wm-textarea" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="wm-card" style={{ display: 'grid', gap: 12 }}>
          <div className="wm-section-title">Terms & Conditions and Privacy Consent</div>
          <div style={{ display: 'grid', gap: 8, color: 'var(--wm-text)' }}>
            <div><strong>1. Purpose of Application</strong><br />This application is submitted to World Machine Money Pty Ltd (WMM) for the purpose of assessing suitability for a private lending facility. Submission of this application does not guarantee approval or funding.</div>
            <div><strong>2. Privacy and Use of Information</strong><br />WMM collects, holds, and uses personal, business, and financial information provided for the purpose of: (a) assessing eligibility for a private lending product; (b) communicating with lenders, introducers, valuers, solicitors, or other relevant third parties; and (c) meeting obligations under the Privacy Act 1988 (Cth), Anti‑Money Laundering and Counter‑Terrorism Financing Act 2006 (Cth), and related legislation.</div>
            <div><strong>3. Disclosure to Third Parties</strong><br />The applicant authorises WMM to disclose information to: private lenders and investors engaged by WMM; valuers, solicitors, accountants, and professional advisers; verification or identity service providers; and aggregator or funding partners supporting WMM operations. Information will only be shared for purposes directly related to the assessment and processing of the loan.</div>
            <div><strong>4. No Credit Check</strong><br />This private lending product does not involve a credit check. Assessment is based on the security offered and supporting documentation.</div>
            <div><strong>5. Accuracy and Acknowledgement</strong><br />The applicant confirms that all information supplied is true and complete. Any inaccurate or misleading information may result in the withdrawal of an offer or cancellation of an application.</div>
            <div><strong>6. Confidentiality and Limitation of Liability</strong><br />All information will be treated in strict confidence and managed according to the WMM Privacy Policy. WMM acts as an introducer and arranger only and shall not be liable for any loss, cost, or damage resulting from any decision made by the applicant or any lender.</div>
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
            <input type="checkbox" checked={!!form.acceptTerms} onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })} />
            <span> I have read, understood, and agree to the above Terms & Conditions, and I consent to the collection, use, and disclosure of my personal information by World Machine Money as outlined.</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <label>
              <div>Applicant Name</div>
              <input className="wm-input" value={form.consentName} onChange={(e) => setForm({ ...form, consentName: e.target.value })} />
            </label>
            <label>
              <div>Date</div>
              <input className="wm-input" type="date" lang="en-AU" placeholder="dd/mm/yyyy" value={form.consentDate} onChange={(e) => setForm({ ...form, consentDate: e.target.value })} />
            </label>
          </div>
          <label>
            <div>Signature (type full name)</div>
            <input className="wm-input" placeholder="e.g. Jane Citizen" value={form.consentSignature} onChange={(e) => setForm({ ...form, consentSignature: e.target.value })} />
          </label>
          <div className="wm-help">World Machine Money Pty Ltd acts as an introducer and arranger only and does not itself lend funds. All private lending is subject to lender approval and supporting documentation.</div>
        </div>

        {error && <div className="wm-error">{error}</div>}
        <div style={{ marginBottom: 12 }}>
          <button
            type="button"
            className="wm-button"
            style={{ background: '#2d2d2d' }}
            onClick={async () => {
              try { await downloadSummaryPdf(form) } catch (e) { alert('Could not generate PDF') }
            }}
          >
            Download Summary PDF
          </button>
        </div>
        <div>
          <button className="wm-button" disabled={submitting || !form.acceptTerms}>{submitting ? 'Submitting…' : 'Submit Application'}</button>
        </div>
      </form>
    </div>
  )
}
