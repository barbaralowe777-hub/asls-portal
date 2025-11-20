import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

// Brand colors (module scope so helpers can access safely)
const BRAND_GOLD = rgb(0.827, 0.686, 0.216) // #D3AF37
const BRAND_DARK = rgb(0.043, 0.043, 0.043) // #0B0B0B
// Safe Mode: no external fetch, no attachments section
const SAFE_PDF_MODE = true

// Replace unsupported glyphs to keep Standard Helvetica happy
function sanitizeText(input: any): string {
  const s = String(input ?? '')
    // various dashes (hyphen/non-breaking/en/em/minus) -> '-'
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')
    // smart quotes -> ASCII quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // bullets and ellipsis
    .replace(/[\u2022]/g, '-')
    .replace(/[\u2026]/g, '...')
    // non-breaking space -> space
    .replace(/\u00A0/g, ' ')
  // remove any other weird control chars outside printable + Latin-1 range
  return s.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A1-\u00FF]/g, '')
}

export async function generateSummaryPdf(form: any): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)

  // Page + layout vars
  const pageSize: [number, number] = [612, 792]
  let page = doc.addPage(pageSize)
  const left = 40
  const right = pageSize[0] - 40
  const contentWidth = right - left
  const headerHeight = 48
  let y = pageSize[1] - headerHeight - 16
  let logoImg: any | null = null
  const step = (n: string) => { try { console.debug('PDF step:', n) } catch {} }

  // Header/footer helpers
  const drawFooter = (p: any) => {
    const footerY = 28
    p.drawRectangle({ x: left, y: footerY + 10, width: contentWidth, height: 0.5, color: BRAND_GOLD })
    p.drawText('World Machine Money - apply.worldmachinemoney.online', { x: left, y: footerY, size: 9, font, color: rgb(0.55,0.55,0.55) })
  }
  const drawHeader = () => {
    // Bar
    page.drawRectangle({ x: 0, y: pageSize[1] - headerHeight, width: pageSize[0], height: headerHeight, color: BRAND_DARK })
    // Logo + title
    let titleX = left
    if (logoImg) {
      const h = 26; const w = (logoImg.width / logoImg.height) * h
      page.drawImage(logoImg, { x: left, y: pageSize[1] - headerHeight + 10, width: w, height: h })
      titleX = left + w + 10
    }
    page.drawText('Second Mortgage Funding Application', { x: titleX, y: pageSize[1] - headerHeight + 16, size: 14, font, color: BRAND_GOLD })
    page.drawText(new Date().toLocaleString('en-AU'), { x: left, y: pageSize[1] - headerHeight + 2, size: 9, font, color: rgb(0.7,0.7,0.7) })
    drawFooter(page)
  }

  const newPage = () => { page = doc.addPage(pageSize); drawHeader(); y = pageSize[1] - headerHeight - 16 }
  const ensure = (min = 60) => { if (y < min) newPage() }
  const drawLine = (yy: number) => page.drawRectangle({ x: left, y: yy, width: contentWidth, height: 0.5, color: BRAND_GOLD })
  const wrap = (text: string, size: number, maxW: number): string[] => {
    const t = sanitizeText(text)
    try {
      const words = t.split(/\s+/)
      const lines: string[] = []
      let cur = ''
      for (const w of words) {
        const trial = cur ? cur + ' ' + w : w
        if (font.widthOfTextAtSize(trial, size) > maxW) {
          if (cur) lines.push(cur)
          cur = w
        } else {
          cur = trial
        }
      }
      if (cur) lines.push(cur)
      return lines
    } catch (e) {
      // Fallback: approximate char-based wrapping if width calc throws
      const approxCharWidth = Math.max(0.5, size * 0.6)
      const maxChars = Math.max(10, Math.floor(maxW / approxCharWidth))
      const out: string[] = []
      for (let i = 0; i < t.length; i += maxChars) out.push(t.slice(i, i + maxChars))
      return out
    }
  }
  const drawText = (text: string, size = 11, color = rgb(0, 0, 0)) => {
    const lines = wrap(text, size, contentWidth)
    for (const l of lines) {
      ensure()
      page.drawText(l, { x: left, y, size, font, color })
      y -= size + 6 // extra leading for readability
    }
  }
  const section = (title: string) => {
    ensure()
    page.drawText(title, { x: left, y, size: 13, font, color: BRAND_GOLD })
    y -= 12
    drawLine(y)
    y -= 10
  }
  // (Rollback) keep single regular font for stability
  const kvRow = (pairs: Array<[string, any]>) => {
    const size = 11
    const gap = 18
    const colW = (contentWidth - gap) / 2
    // render in rows of 2, computing height per row
    for (let i = 0; i < pairs.length; i += 2) {
      const leftWrap = wrap(`${pairs[i][0]}: ${pairs[i][1] ?? '-'}`, size, colW)
      const rightWrap = i + 1 < pairs.length ? wrap(`${pairs[i+1][0]}: ${pairs[i+1][1] ?? '-'}`, size, colW) : []
      const rowLines = Math.max(leftWrap.length, rightWrap.length, 1)
      const rowBlock = rowLines * (size + 6) + 2
      ensure(60 + rowBlock)
      // left column
      for (let li = 0; li < leftWrap.length; li++) {
        page.drawText(leftWrap[li], { x: left, y: y - li * (size + 4), size, font, color: rgb(0,0,0) })
      }
      // right column
      if (rightWrap.length) {
        const x = left + colW + gap
        for (let li = 0; li < rightWrap.length; li++) {
          page.drawText(rightWrap[li], { x, y: y - li * (size + 4), size, font, color: rgb(0,0,0) })
        }
      }
      y -= rowBlock
    }
    y -= 10
  }

  // Prepare logo once and draw initial header
  step('logo')
  if (!SAFE_PDF_MODE) {
    try {
      const url = (import.meta as any)?.env?.VITE_WMM_LOGO_URL || '/wmm-logo.png'
      const resp = await fetch(url)
      if (resp.ok) {
        const ct = (resp.headers?.get?.('content-type') || '').toLowerCase()
        const buf = new Uint8Array(await resp.arrayBuffer())
        let done = false
        try { if (ct.includes('png') || !ct || ct.includes('image')) { logoImg = await doc.embedPng(buf); done = true } } catch {}
        if (!done) { try { logoImg = await doc.embedJpg(buf); done = true } catch {} }
      }
    } catch {}
  }
  step('header')
  drawHeader()

  // Business
  step('business')
  section('Business')
  kvRow([
    ['Business Name', form.businessName || '-'],
    ['ABN', form.abn || '-'],
    ['ABN Active', form.abnActive ? 'Yes' : 'No'],
    ['GST Registered', form.gstRegistered ? 'Yes' : 'No'],
    ['Entity Type', form.entityType || '-'],
    ['ACN', form.acn || '-'],
  ])
  if (form.trustDetails) drawText(`Trust Details: ${form.trustDetails}`)

  // Loan
  step('loan')
  section('Loan')
  kvRow([
    ['Requested Amount', form.requestedAmount ? `$${Number(form.requestedAmount).toLocaleString()}` : '-'],
    ['Loan Term (months)', form.loanTermMonths ?? '-'],
    ['Purpose', form.loanPurpose || '-'],
    ['Exit Strategy', form.exitStrategy || '-'],
  ])
  if (form.exitStrategyDetails) drawText(`Exit Details: ${form.exitStrategyDetails}`)
  if (form.turnaroundExpectation) drawText(`Turnaround Expectation: ${form.turnaroundExpectation}`)

  // Security
  step('security')
  section('Security')
  kvRow([
    ['Owner of Property', form.isOwnerOfProperty || '-'],
    ['Names on Title', form.propertyOwnershipNames || '-'],
    ['Property Address', form.securityAddress || '-'],
    ['Estimated Value', form.estimatedPropertyValue != null ? `$${Number(form.estimatedPropertyValue).toLocaleString()}` : '-'],
    ['Existing Debt Amount', (form.existingDebtAmount != null && form.existingDebtAmount !== '') ? `$${Number(form.existingDebtAmount).toLocaleString()}` : '-'],
    ['Existing Debt Lender', form.existingDebtLender || (form.existingDebtAndLender || '-')],
  ])

  // Contact
  step('contact')
  section('Contact')
  kvRow([
    ['Contact Name', form.contactName || '-'],
    ['Contact Email', form.contactEmail || '-'],
    ['Contact Phone', form.contactPhone || '-'],
  ])

  // Directors
  const directors = form.directors || []
  if (directors.length) {
    step('directors')
    section('Directors')
    directors.forEach((d: any, i: number) => {
      const fullName = [d.title, d.firstName, d.lastName].filter(Boolean).join(' ')
      drawText(`Director ${i + 1}: ${fullName || '-'}`)
      if (d.address) drawText(`Address: ${d.address}`)
      if (d.email) drawText(`Email: ${d.email}`)
      if (d.dob) {
        try {
          const dobStr = new Date(d.dob).toLocaleDateString('en-AU')
          drawText(`DOB: ${dobStr}`)
        } catch { drawText(`DOB: ${d.dob}`) }
      }
      const id = d.id || {}
      if (id.licenseNumber || id.licenseState || id.licenseExpiry) {
        kvRow([
          ['Licence #', id.licenseNumber || '-'],
          ['State', id.licenseState || '-'],
          ['Expiry', id.licenseExpiry || '-'],
        ])
      }
    })
  }

  // Guarantors
  if (form.directorsAreGuarantors === false) {
    step('guarantors')
    const guarantors = form.guarantors || []
    if (guarantors.length) {
      section('Guarantors')
      guarantors.forEach((g: any, i: number) => {
        const gFull = [g.title, g.firstName, g.lastName].filter(Boolean).join(' ')
        drawText(`Guarantor ${i + 1}: ${gFull || '-'}`)
        if (g.address) drawText(`Address: ${g.address}`)
        if (g.email) drawText(`Email: ${g.email}`)
        if (g.dob) {
          try {
            const gd = new Date(g.dob).toLocaleDateString('en-AU')
            drawText(`DOB: ${gd}`)
          } catch { drawText(`DOB: ${g.dob}`) }
        }
        kvRow([
          ['Relationship', g.relationshipToDirector || '-'],
          ['Phone', g.phone || '-'],
          ['Email', g.email || '-'],
        ])
      })
    }
  }

  // Terms
  step('terms')
  section('Terms')
  kvRow([
    ['Accepted Terms', form.acceptTerms ? 'Yes' : 'No'],
    ['Applicant Name', form.consentName || '-'],
    ['Consent Date', form.consentDate ? new Date(form.consentDate).toLocaleDateString('en-AU') : '-'],
    ['Signature', form.consentSignature || '-'],
  ])

  // Inline Terms & Conditions text (as shown on screen)
  /* Legacy Terms array removed
    '1. Purpose of Application: This application is submitted to World Machine Money Pty Ltd (WMM) for the purpose of assessing suitability for a private lending facility. Submission of this application does not guarantee approval or funding.',
    '2. Privacy and Use of Information: WMM collects, holds, and uses personal, business, and financial information provided for the purpose of: (a) assessing eligibility for a private lending product; (b) communicating with lenders, introducers, valuers, solicitors, or other relevant third parties; and (c) meeting obligations under the Privacy Act 1988 (Cth), Anti‑Money Laundering and Counter‑Terrorism Financing Act 2006 (Cth), and related legislation.',
    '3. Disclosure to Third Parties: The applicant authorises WMM to disclose information to: private lenders and investors engaged by WMM; valuers, solicitors, accountants, and professional advisers; verification or identity service providers; and aggregator or funding partners supporting WMM operations. Information will only be shared for purposes directly related to the assessment and processing of the loan.',
    '4. No Credit Check: This private lending product does not involve a credit check. Assessment is based on the security offered and supporting documentation.',
    '5. Accuracy and Acknowledgement: The applicant confirms that all information supplied is true and complete. Any inaccurate or misleading information may result in the withdrawal of an offer or cancellation of an application.',
    '6. Confidentiality and Limitation of Liability: All information will be treated in strict confidence and managed according to the WMM Privacy Policy. WMM acts as an introducer and arranger only and shall not be liable for any loss, cost, or damage resulting from any decision made by the applicant or any lender.'
  ]
  */

  // Inline Terms & Conditions (match on-screen, headings unnumbered; headings styled via gold color/size)
  const termsHeading = (t: string) => { ensure(); page.drawText(sanitizeText(t), { x: left, y, size: 12, font, color: BRAND_GOLD }); y -= 12 }
  const termsPara = (t: string) => { drawText(sanitizeText(t), 11, rgb(0,0,0)) }

  termsHeading('1. Purpose of Application')
  termsPara('This application is submitted to World Machine Money Pty Ltd (WMM) for the purpose of assessing suitability for a private lending facility. Submission of this application does not guarantee approval or funding.')

  termsHeading('2. Privacy and Use of Information')
  termsPara('WMM collects, holds, and uses personal, business, and financial information provided for the purpose of: (a) assessing eligibility for a private lending product; (b) communicating with lenders, introducers, valuers, solicitors, or other relevant third parties; and (c) meeting obligations under the Privacy Act 1988 (Cth), Anti-Money Laundering and Counter-Terrorism Financing Act 2006 (Cth), and related legislation.')

  termsHeading('3. Disclosure to Third Parties')
  termsPara('The applicant authorises WMM to disclose information to private lenders and investors engaged by WMM; valuers, solicitors, accountants, and professional advisers; verification or identity service providers; and aggregator or funding partners supporting WMM operations. Information will only be shared for purposes directly related to the assessment and processing of the loan.')

  termsHeading('4. No Credit Check')
  termsPara('This private lending product does not involve a credit check. Assessment is based on the security offered and supporting documentation.')

  termsHeading('5. Accuracy and Acknowledgement')
  termsPara('The applicant confirms that all information supplied is true and complete. Any inaccurate or misleading information may result in the withdrawal of an offer or cancellation of an application.')

  termsHeading('6. Confidentiality and Limitation of Liability')
  termsPara('All information will be treated in strict confidence and managed according to the WMM Privacy Policy. WMM acts as an introducer and arranger only and shall not be liable for any loss, cost, or damage resulting from any decision made by the applicant or any lender.')

  // Terms are included inline above; no external Terms PDF is appended.
  // Attachments (detailed headings)
  step('attachments')
  if (SAFE_PDF_MODE) {
    // Safe mode: show a simple listing (no embedding, no heavy loops)
    try {
      section('Attachments')
      const all = collectAllAttachments(form)
      const total = all.length
      kvRow([["Accountant's Letter", form.accountantsLetter ? 'Provided' : 'Not provided'], ['Total Files', String(total)]])
      // List filenames (trim to avoid layout issues)
      all.forEach((a: any, i: number) => {
        const name = String(a?.filename || 'file')
        const short = name.length > 60 ? name.slice(0, 57) + '…' : name
        drawText(`${i + 1}. ${short}`, 10, rgb(0.25,0.25,0.25))
      })
    } catch {}
  } else {
    try {
      section('Attachments')
      const all = collectAllAttachments(form)
      kvRow([["Accountant's Letter", form.accountantsLetter ? 'Provided' : 'Not provided'], ['Supporting Docs', `${all.length} file(s)`]])

      const miniHeading = (t: string) => {
        ensure()
        page.drawText(t, { x: left, y, size: 12, font, color: BRAND_GOLD })
        y -= 8
        drawLine(y)
        y -= 6
      }
      const guessLabel = (name?: string) => {
        const n = String(name || '').toLowerCase()
        if (/(rate|rates).*notice/.test(n) || /council.*rate/.test(n)) return 'Rates Notice'
        if (/bank.*statement/.test(n) || /statement.*bank/.test(n) || /stmt/.test(n)) return 'Bank Statement'
        if (/trust.*deed/.test(n)) return 'Trust Deed'
        if (/accountant|cpa|letter.*account/.test(n)) return "Accountant's Letter"
        return 'Supporting Document'
      }
      const labelFile = (label: string, f?: any) => {
        const name = f?.filename ? ` ${f.filename}` : ' Not provided'
        drawText(`${label}:${name}`, 10, rgb(0.25,0.25,0.25))
      }

      // Accountant's letter
      miniHeading("Accountant's Letter")
      if (form.accountantsLetter) {
        labelFile('Provided', form.accountantsLetter)
      } else {
        drawText('Not provided', 10, rgb(0.25,0.25,0.25))
      }

      // Directors' ID files
      const dlist = form.directors || []
      dlist.forEach((d: any, i: number) => {
        miniHeading(`Director ${i + 1} ID`)
        labelFile('Licence Front', d?.id?.licenseFront)
        labelFile('Licence Back', d?.id?.licenseBack)
        labelFile('Medicare Card', d?.id?.medicareFront)
      })

      // Guarantors' ID files (only if directors are not guarantors)
      if (form.directorsAreGuarantors === false) {
        const glist = form.guarantors || []
        glist.forEach((g: any, i: number) => {
          miniHeading(`Guarantor ${i + 1} ID`)
          labelFile('Licence Front', g?.id?.licenseFront)
          labelFile('Licence Back', g?.id?.licenseBack)
          labelFile('Medicare Card', g?.id?.medicareFront)
        })
      }

      // Supporting documents
      if ((form.supportingDocs || []).length) {
        miniHeading('Other Documents')
        (form.supportingDocs || []).forEach((a: any, i: number) => {
          const friendly = guessLabel(a?.filename)
          drawText(`${i + 1}. ${friendly}${a?.filename ? ` - ${a.filename}` : ''}`, 10, rgb(0.25,0.25,0.25))
        })
      }
    } catch (e) {
      try { console.warn('Client PDF: skipping attachments section due to error', e) } catch {}
    }
  }

  // Client stability: skip embedding attachments on the client PDF to avoid
  // pdf-lib edge cases. They are still listed above and embedded on server.
  try { console.warn('Client PDF: skipping attachment embedding for stability') } catch {}

  step('save')
  return await doc.save()
}
export async function downloadSummaryPdf(form: any) {
  let bytes: Uint8Array
  try {
    bytes = await generateSummaryPdf(form)
  } catch (e) {
    try { console.warn('Falling back to simple PDF summary', e) } catch {}
    bytes = await generateFallbackPdf(form)
  }
  try {
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const safeName = (form.businessName || 'Application').replace(/[^A-Za-z0-9 _-]/g, '')
    a.href = url
    a.download = `WMM-Application-${safeName}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e) {
    try { console.error('PDF download failed', e) } catch {}
    alert('Could not generate PDF')
  }
}

// Extremely safe, dependency-free fallback PDF (no images/attachments/fetches)
async function generateFallbackPdf(form: any): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const page = doc.addPage([612, 792])
  let y = 760
  const left = 40
  const write = (text: string, size = 12) => { page.drawText(sanitizeText(text), { x: left, y, size, font }); y -= size + 6 }
  const h = (text: string) => { page.drawText(text, { x: left, y, size: 14, font }); y -= 16; page.drawRectangle({ x: left, y, width: 532, height: 0.5, color: rgb(0.7,0.7,0.7) }); y -= 10 }

  write('World Machine Money - Summary', 16)
  y -= 4
  h('Business')
  write(`Business Name: ${form?.businessName || '-'}`)
  write(`ABN: ${form?.abn || '-'}`)
  if (form?.entityType) write(`Entity: ${form.entityType}${form?.acn ? ` | ACN: ${form.acn}` : ''}`)

  h('Loan')
  if (form?.requestedAmount != null && form?.requestedAmount !== '') write(`Requested Amount: $${Number(form.requestedAmount).toLocaleString()}`)
  if (form?.loanTermMonths) write(`Loan Term (months): ${form.loanTermMonths}`)
  if (form?.loanPurpose) write(`Purpose: ${form.loanPurpose}`)

  h('Security')
  if (form?.securityAddress) write(`Property Address: ${form.securityAddress}`)

  h('Contact')
  if (form?.contactName) write(`Contact: ${form.contactName}`)
  if (form?.contactEmail) write(`Email: ${form.contactEmail}`)
  if (form?.contactPhone) write(`Phone: ${form.contactPhone}`)

  h('Terms & Conditions')
  const terms: string[] = [
    '1. Purpose of Application: This application is submitted to World Machine Money Pty Ltd (WMM) for the purpose of assessing suitability for a private lending facility. Submission does not guarantee approval or funding.',
    '2. Privacy and Use of Information: WMM collects, holds, and uses personal, business, and financial information provided for the purpose of: (a) assessing eligibility for a private lending product; (b) communicating with lenders, introducers, valuers, solicitors, or other relevant third parties; and (c) meeting obligations under the Privacy Act 1988 (Cth), Anti-Money Laundering and Counter-Terrorism Financing Act 2006 (Cth), and related legislation.',
    '3. Disclosure to Third Parties: The applicant authorises WMM to disclose information to private lenders and investors engaged by WMM; valuers, solicitors, accountants, and professional advisers; verification or identity service providers; and aggregator or funding partners supporting WMM operations. Information will only be shared for purposes directly related to the assessment and processing of the loan.',
    '4. No Credit Check: This private lending product does not involve a credit check. Assessment is based on the security offered and supporting documentation.',
    '5. Accuracy and Acknowledgement: The applicant confirms that all information supplied is true and complete. Any inaccurate or misleading information may result in the withdrawal of an offer or cancellation of an application.',
    '6. Confidentiality and Limitation of Liability: All information will be treated in strict confidence and managed according to the WMM Privacy Policy. WMM acts as an introducer and arranger only and shall not be liable for any loss, cost, or damage resulting from any decision made by the applicant or any lender.'
  ]
  for (const p of terms) { write(sanitizeText(p), 11) }
  y -= 6
  write(`Accepted Terms: ${form?.acceptTerms ? 'Yes' : 'No'}`)
  if (form?.consentName) write(`Applicant Name: ${form.consentName}`)
  if (form?.consentDate) write(`Consent Date: ${new Date(form.consentDate).toLocaleDateString('en-AU')}`)
  if (form?.consentSignature) write(`Signature: ${form.consentSignature}`)

  return await doc.save()
}

function collectAllAttachments(form: any): Array<{ filename: string; type: string; base64: string }> {
  const list: any[] = []
  const push = (a?: any) => { if (a && a.base64) list.push(a) }
  ;(form.supportingDocs || []).forEach(push)
  push(form.trustDeed)
  push(form.accountantsLetter)
  ;(form.directors || []).forEach((d: any) => { push(d.id?.licenseFront); push(d.id?.licenseBack); push(d.id?.medicareFront) })
  ;(form.guarantors || []).forEach((g: any) => { push(g.id?.licenseFront); push(g.id?.licenseBack); push(g.id?.medicareFront) })
  return list
}

async function appendAttachmentsIntoPdf(doc: PDFDocument, files: Array<{ filename: string; type: string; base64: string }>) {
  for (const f of files || []) {
    try {
      const name = f.filename || ''
      const t = (f.type || '').toLowerCase()
      const bytes = base64ToBytes(f.base64)
      if (t.includes('pdf') || /\.pdf$/i.test(name)) {
        const src = await PDFDocument.load(bytes)
        const pages = await doc.copyPages(src, src.getPageIndices())
        for (const p of pages) doc.addPage(p)
        continue
      }
      if (t.includes('png') || /\.png$/i.test(name)) {
        const img = await doc.embedPng(bytes)
        const page = doc.addPage([612, 792])
        const maxW = 532, maxH = 700
        let w = img.width, h = img.height
        const s = Math.min(maxW / w, maxH / h, 1)
        w *= s; h *= s
        page.drawImage(img, { x: 40, y: (792 - h) / 2, width: w, height: h })
        continue
      }
      if (t.includes('jpeg') || t.includes('jpg') || /\.(jpe?g)$/i.test(name)) {
        const img = await doc.embedJpg(bytes)
        const page = doc.addPage([612, 792])
        const maxW = 532, maxH = 700
        let w = img.width, h = img.height
        const s = Math.min(maxW / w, maxH / h, 1)
        w *= s; h *= s
        page.drawImage(img, { x: 40, y: (792 - h) / 2, width: w, height: h })
        continue
      }
      // Unknown type: skip silently
    } catch (e) {
      try { console.warn('Attachment skipped:', f?.filename, e) } catch {}
    }
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}




