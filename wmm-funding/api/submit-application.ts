import type { VercelRequest, VercelResponse } from '@vercel/node'
import sgMail from '@sendgrid/mail'
import * as docusignNS from 'docusign-esign'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

type AttachmentInput = { filename: string; type: string; size: number; base64: string }
type Person = {
  title?: string
  firstName?: string
  lastName?: string
  dob?: string
  phone?: string
  address?: string
  email?: string
  id?: {
    licenseNumber?: string
    licenseState?: string
    licenseExpiry?: string
    licenseFront?: AttachmentInput
    licenseBack?: AttachmentInput
    medicareNumber?: string
    medicareExpiry?: string
    medicareFront?: AttachmentInput
  }
}
type Payload = {
  businessName: string
  abn: string
  entityType?: 'Sole Trader' | 'Company' | 'Trust'
  acn?: string
  trustDetails?: string
  gstRegistered?: boolean
  abnActive?: boolean

  contactName: string
  contactEmail: string
  contactPhone?: string

  requestedAmount?: number
  loanPurpose?: string
  exitStrategy?: 'Sale of Asset' | 'Refinancing to Bank' | 'Trading with increased trade' | 'Sale of Other Assets'
  exitStrategyDetails?: string
  turnaroundExpectation?: string
  isOwnerOfProperty?: 'Yes' | 'No'
  propertyOwnershipNames?: string
  securityAddress?: string
  estimatedPropertyValue?: number
  loanTermMonths?: 6 | 12 | 18
  existingDebtAndLender?: string
  existingDebtAmount?: number
  existingDebtLender?: string

  directors?: Person[]
  directorsAreGuarantors?: boolean
  guarantors?: (Person & { relationshipToDirector?: string })[]

  supportingDocs?: AttachmentInput[]
  accountantsLetter?: AttachmentInput
  trustDeed?: AttachmentInput
  acceptTerms?: boolean
  consentName?: string
  consentDate?: string
  consentSignature?: string
  notes?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method not allowed' })
  try {
    const SG_KEY = process.env.SENDGRID_API_KEY
    const TO = process.env.WMM_RECIPIENT || 'john@worldmachine.com.au'
    const FROM = process.env.SENDGRID_FROM || 'no-reply@worldmachine.com.au'
    if (!SG_KEY) return res.status(500).json({ ok: false, message: 'Server not configured (SENDGRID_API_KEY missing)' })
    sgMail.setApiKey(SG_KEY)

    const body = req.body as Payload
    if (!body || !body.businessName || !body.abn || !body.contactName || !body.contactEmail) {
      return res.status(400).json({ ok: false, message: 'Missing required fields' })
    }

    const directorsHtml = (body.directors || [])
      .map((d, i) => `
        <div>
          <h3 style="margin:12px 0 4px;font-size:16px;">Director ${i + 1}</h3>
          <p><strong>Name:</strong> ${escapeHtml([d.title, d.firstName, d.lastName].filter(Boolean).join(' ')) || '-'}</p>
          <p><strong>DOB:</strong> ${d.dob ? new Date(d.dob).toLocaleDateString('en-AU') : '-'}</p>
          <p><strong>Phone:</strong> ${escapeHtml(d.phone || '-')}</p>
          <p><strong>Email:</strong> ${escapeHtml(d.email || '-')}</p>
          <p><strong>Address:</strong> ${escapeHtml(d.address || '-')}</p>
          <p><strong>Licence #:</strong> ${escapeHtml(d.id?.licenseNumber || '-')} | <strong>State:</strong> ${escapeHtml(d.id?.licenseState || '-')} | <strong>Expiry:</strong> ${escapeHtml(d.id?.licenseExpiry || '-')}</p>
          <p><strong>Medicare #:</strong> ${escapeHtml(d.id?.medicareNumber || '-')} | <strong>Expiry:</strong> ${escapeHtml(d.id?.medicareExpiry || '-')}</p>
        </div>
      `)
      .join('')

    const guarantorsHtml = (body.guarantors || [])
      .map((g, i) => `
        <div>
          <h3 style="margin:12px 0 4px;font-size:16px;">Guarantor ${i + 1}</h3>
          <p><strong>Name:</strong> ${escapeHtml([g.title, g.firstName, g.lastName].filter(Boolean).join(' ')) || '-'}</p>
          <p><strong>DOB:</strong> ${g.dob ? new Date(g.dob).toLocaleDateString('en-AU') : '-'}</p>
          <p><strong>Relationship:</strong> ${escapeHtml((g as any).relationshipToDirector || '-')}</p>
          <p><strong>Phone:</strong> ${escapeHtml(g.phone || '-')}</p>
          <p><strong>Email:</strong> ${escapeHtml(g.email || '-')}</p>
          <p><strong>Address:</strong> ${escapeHtml(g.address || '-')}</p>
          <p><strong>Licence #:</strong> ${escapeHtml(g.id?.licenseNumber || '-')} | <strong>State:</strong> ${escapeHtml(g.id?.licenseState || '-')} | <strong>Expiry:</strong> ${escapeHtml(g.id?.licenseExpiry || '-')}</p>
          <p><strong>Medicare #:</strong> ${escapeHtml(g.id?.medicareNumber || '-')} | <strong>Expiry:</strong> ${escapeHtml(g.id?.medicareExpiry || '-')}</p>
        </div>
      `)
      .join('')

    const LOGO = process.env.WMM_LOGO_URL || 'https://apply.worldmachinemoney.online/wmm-logo.png'
    const html = `
      <div style="font-family: Arial, system-ui, sans-serif; max-width: 800px; margin: 0 auto;">
        <div style="background:#0b0b0b;color:#D3AF37;padding:12px 16px;border-radius:10px 10px 0 0;display:flex;align-items:center;gap:10px;">
          <img src="${LOGO}" alt="World Machine Money" width="20" height="20" style="display:block;border-radius:4px" />
          <strong>World Machine Money - Second Mortgage Funding Application</strong>
        </div>
        <div style="border:1px solid #eee;border-top:none;border-radius:0 0 10px 10px;padding:16px;">
          <h2 style="margin:0 0 8px;font-size:18px;color:#111;">Business</h2>
          <p><strong>ABN:</strong> ${escapeHtml(body.abn)} | <strong>Active:</strong> ${body.abnActive ? 'Yes' : 'No'} | <strong>GST:</strong> ${body.gstRegistered ? 'Yes' : 'No'}</p>
          <p><strong>Entity:</strong> ${escapeHtml(body.entityType || '-')} ${body.acn ? `| <strong>ACN:</strong> ${escapeHtml(body.acn)}` : ''}</p>
          ${body.trustDetails ? `<p><strong>Trust Details:</strong> ${escapeHtml(body.trustDetails)}</p>` : ''}
          <p><strong>Business Name:</strong> ${escapeHtml(body.businessName)}</p>

          <h2 style="margin:16px 0 8px;font-size:18px;color:#111;">Loan</h2>
          <p><strong>Amount:</strong> ${body.requestedAmount ? `$${Number(body.requestedAmount).toLocaleString()}` : '-'}</p>
          <p><strong>Purpose:</strong> ${escapeHtml(body.loanPurpose || '-')}</p>
          <p><strong>Exit Strategy:</strong> ${escapeHtml(body.exitStrategy || '-')}</p>
          ${body.exitStrategyDetails ? `<p><strong>Exit Details:</strong> ${escapeHtml(body.exitStrategyDetails)}</p>` : ''}
          ${body.turnaroundExpectation ? `<p><strong>Turnaround Expectation:</strong> ${escapeHtml(body.turnaroundExpectation)}</p>` : ''}
          <p><strong>Term:</strong> ${body.loanTermMonths || '-'} months</p>

          <h2 style="margin:16px 0 8px;font-size:18px;color:#111;">Security</h2>
          <p><strong>Applicant is Owner:</strong> ${escapeHtml(body.isOwnerOfProperty || '-')}</p>
          ${body.propertyOwnershipNames ? `<p><strong>Names on Title:</strong> ${escapeHtml(body.propertyOwnershipNames)}</p>` : ''}
          ${body.securityAddress ? `<p><strong>Property Address:</strong> ${escapeHtml(body.securityAddress)}</p>` : ''}
          ${body.estimatedPropertyValue ? `<p><strong>Estimated Value:</strong> $${Number(body.estimatedPropertyValue).toLocaleString()}</p>` : ''}
          ${body.existingDebtAmount != null ? `<p><strong>Existing Debt Amount:</strong> $${Number(body.existingDebtAmount).toLocaleString()}</p>` : ''}
          ${body.existingDebtLender ? `<p><strong>Existing Debt Lender:</strong> ${escapeHtml(body.existingDebtLender)}</p>` : ''}
          ${!body.existingDebtAmount && !body.existingDebtLender && body.existingDebtAndLender ? `<p><strong>Existing Debt/Lender:</strong> ${escapeHtml(body.existingDebtAndLender)}</p>` : ''}

          <h2 style="margin:16px 0 8px;font-size:18px;color:#111;">Contacts</h2>
          <p><strong>Contact:</strong> ${escapeHtml(body.contactName)} | ${escapeHtml(body.contactEmail)} ${body.contactPhone ? `| ${escapeHtml(body.contactPhone)}` : ''}</p>

          ${directorsHtml}
          ${body.directorsAreGuarantors === false ? `<h2 style=\"margin:16px 0 8px;font-size:18px;color:#111;\">Guarantors</h2>${guarantorsHtml}` : ''}

          <h2 style="margin:16px 0 8px;font-size:18px;color:#111;">Terms</h2>
          <p><strong>Accepted Terms & Conditions:</strong> ${body.acceptTerms ? 'Yes' : 'No'}</p>
          ${body.consentName ? `<p><strong>Applicant Name:</strong> ${escapeHtml(body.consentName)}</p>` : ''}
          ${body.consentDate ? `<p><strong>Consent Date:</strong> ${new Date(body.consentDate).toLocaleDateString('en-AU')}</p>` : ''}
          ${body.consentSignature ? `<p><strong>Signature (typed):</strong> ${escapeHtml(body.consentSignature)}</p>` : ''}

          <h2 style="margin:16px 0 8px;font-size:18px;color:#111;">Attachments</h2>
          <p><strong>Accountant's Letter:</strong> ${body.accountantsLetter ? 'Attached' : 'Not provided'}</p>
          ${body.entityType === 'Trust' ? `<p><strong>Trust Deed:</strong> ${(body as any).trustDeed ? 'Attached' : 'Not provided'}</p>` : ''}
          <p><strong>Supporting Docs:</strong> ${(body.supportingDocs || []).length} file(s)</p>

          ${body.notes ? `<h2 style=\"margin:16px 0 8px;font-size:18px;color:#111;\">Notes</h2><p>${escapeHtml(body.notes)}</p>` : ''}
        </div>
      </div>
    `

    const attachments: any[] = []
    let totalBytes = 0
    const maxTotalBytes = 20 * 1024 * 1024 // 20MB safety cap per email
    const skipped: string[] = []
    const pushAttachment = (a?: AttachmentInput) => {
      if (!a || !a.base64) return
      const nextTotal = totalBytes + (a.size || 0)
      if (nextTotal > maxTotalBytes) { skipped.push(a.filename); return }
      totalBytes = nextTotal
      attachments.push({ content: a.base64, filename: a.filename, type: a.type, disposition: 'attachment' })
    }

    // Build and attach a concise PDF summary (first attachment)
    try {
      const pdfBytes = await buildSummaryPdf(body)
      const pdfBase64 = Buffer.from(pdfBytes).toString('base64')
      const safeName = (body.businessName || 'Application').replace(/[^A-Za-z0-9 _-]/g, '')
      attachments.unshift({
        content: pdfBase64,
        filename: `WMM-Application-${safeName}.pdf`,
        type: 'application/pdf',
        disposition: 'attachment'
      })
    } catch {}

    // Attach supporting docs
    ;(body.supportingDocs || []).forEach(pushAttachment)
    // Accountant's Letter
    pushAttachment(body.accountantsLetter)
    // Trust Deed (if provided)
    if ((body as any).trustDeed) pushAttachment((body as any).trustDeed)
    // Attach IDs
    ;(body.directors || []).forEach((d) => { pushAttachment(d.id?.licenseFront); pushAttachment(d.id?.licenseBack); pushAttachment(d.id?.medicareFront) })
    ;(body.guarantors || []).forEach((g) => { pushAttachment(g.id?.licenseFront); pushAttachment(g.id?.licenseBack); pushAttachment(g.id?.medicareFront) })

    await sgMail.send({
      to: TO,
      from: FROM,
      subject: `WMM Second Mortgage Funding Application - ${body.businessName}`,
      html: skipped.length ? `${html}\n<p style="color:#b91c1c">Omitted ${skipped.length} attachment(s) due to size limit: ${escapeHtml(skipped.join(', '))}</p>` : html,
      attachments: attachments.slice(0, 20) // cap to avoid over-limit
    })

    // Best-effort DocuSign envelope (log errors but never fail submission)
    try { await sendToDocuSign(body) } catch (e:any) {
      console.warn('DocuSign send failed:', e?.response?.text || e?.message || e)
    }

    return res.status(200).json({ ok: true })
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e?.message || 'Email send failed' })
  }
}

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

async function sendToDocuSign(body: any) {
  const docusign: any = (docusignNS as any).ApiClient ? (docusignNS as any) : ((docusignNS as any).default || (docusignNS as any))
  const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY
  const USER_ID = process.env.DOCUSIGN_USER_ID
  const ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID
  const BASE_URL = (process.env.DOCUSIGN_BASE_URL || 'https://demo.docusign.net') + '/restapi'
  const OAUTH_BASE = process.env.DOCUSIGN_OAUTH_BASE_PATH || 'account-d.docusign.com' // prod: 'account.docusign.com'
  const PRIVATE_KEY_RAW = process.env.DOCUSIGN_PRIVATE_KEY || ''
  if (!INTEGRATION_KEY || !USER_ID || !PRIVATE_KEY_RAW) return

  const privateKey = PRIVATE_KEY_RAW.replace(/\\n/g, '\n')
  const apiClient = new docusign.ApiClient()
  // Use OAuth base path for JWT, then switch to account base URI for REST
  try { (apiClient as any).setOAuthBasePath?.(OAUTH_BASE) } catch {}
  apiClient.setBasePath(BASE_URL)

  const auth = await apiClient.requestJWTUserToken(
    INTEGRATION_KEY,
    USER_ID,
    ['signature', 'impersonation'],
    privateKey,
    3600
  ) as any
  const accessToken = auth.body.access_token
  const userInfo = await apiClient.getUserInfo(accessToken)
  const account = (userInfo?.accounts || [])[0]
  const accountId = ACCOUNT_ID || account?.accountId
  const baseUri = (account?.baseUri || '').replace('/oauth', '') + '/restapi'
  apiClient.setBasePath(baseUri)
  // Ensure Authorization header is set for subsequent API calls
  try { (apiClient as any).addDefaultHeader?.('Authorization', `Bearer ${accessToken}`) } catch {}
  docusign.Configuration.default.setDefaultApiClient(apiClient)

  const envelopesApi = new docusign.EnvelopesApi(apiClient)
  // Build our summary PDF again for DocuSign
  const pdfBytes = await buildSummaryPdf(body)
  const docBase64 = Buffer.from(pdfBytes).toString('base64')

  const document = new docusign.Document()
  document.documentBase64 = docBase64
  document.name = 'WMM-Second-Mortgage-Application.pdf'
  document.fileExtension = 'pdf'
  document.documentId = '1'

  // Build recipients (Directors as signers, Contact + WMM as CC)
  const signers: any[] = []
  let order = 1
  const addSigner = (email?: string, name?: string) => {
    if (!email) return
    const s = new docusign.Signer()
    s.email = email
    s.name = name || email
    s.recipientId = String(order)
    // Send to all signers at the same time
    s.routingOrder = '1'
    const sh = new docusign.SignHere()
    sh.documentId = '1'
    ;(sh as any).anchorString = '[[[SIGN_HERE_1]]]'
    ;(sh as any).anchorUnits = 'pixels'
    ;(sh as any).anchorXOffset = '0'
    ;(sh as any).anchorYOffset = '0'
    const ds = new docusign.DateSigned()
    ds.documentId = '1'
    ;(ds as any).anchorString = '[[[DATE_HERE_1]]]'
    ;(ds as any).anchorUnits = 'pixels'
    ;(ds as any).anchorXOffset = '0'
    ;(ds as any).anchorYOffset = '0'
    const t = new docusign.Tabs()
    t.signHereTabs = [sh]
    ;(t as any).dateSignedTabs = [ds]
    s.tabs = t
    signers.push(s)
    order++
  }

  // Director 1 (primary signer)
  const d1 = (body.directors || [])[0]
  addSigner(d1?.email, [d1?.title, d1?.firstName, d1?.lastName].filter(Boolean).join(' ') || d1?.email)
  // Director 2 (if present)
  if ((body.directors || []).length > 1) {
    const d2 = body.directors![1]
    addSigner(d2?.email, [d2?.title, d2?.firstName, d2?.lastName].filter(Boolean).join(' ') || d2?.email)
  }
  // Guarantors (when not same as directors)
  if (body.directorsAreGuarantors === false) {
    (body.guarantors || []).forEach((g: Person & { relationshipToDirector?: string }) =>
      addSigner(g?.email, [g?.title, g?.firstName, g?.lastName].filter(Boolean).join(' ') || g?.email)
    )
  }

  // CCs: Contact email + WMM recipient
  const ccContact = new docusign.CarbonCopy()
  if (body.contactEmail) {
    ccContact.email = body.contactEmail
    ccContact.name = body.contactName || body.contactEmail
    ccContact.recipientId = String(order++)
    // CC can route after signers
    ccContact.routingOrder = '2'
  }
  const ccWmm = new docusign.CarbonCopy()
  ccWmm.email = process.env.WMM_RECIPIENT || 'john@worldmachine.com.au'
  ccWmm.name = 'WMM'
  ccWmm.recipientId = String(order++)
  ccWmm.routingOrder = '2'

  const recipients = new docusign.Recipients()
  recipients.signers = signers
  recipients.carbonCopies = [ccWmm].concat(body.contactEmail ? [ccContact] : [])

  try { console.log('DocuSign signers:', signers.map(s => ({ email: (s as any).email, name: (s as any).name }))) } catch {}

  const envelope = new docusign.EnvelopeDefinition()
  envelope.emailSubject = 'Please sign: WMM Second Mortgage Funding Application'
  envelope.documents = [document]
  envelope.recipients = recipients
  envelope.status = 'sent'
  if (process.env.DOCUSIGN_BRAND_ID) envelope.brandId = process.env.DOCUSIGN_BRAND_ID

  if (!accountId) return
  await envelopesApi.createEnvelope(accountId, { envelopeDefinition: envelope })
}

async function buildSummaryPdf(body: any): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const pageSize: [number, number] = [612, 792]
  let page = doc.addPage(pageSize)
  // Slightly wider symmetric margins for better DocuSign rendering
  const left = 64
  const right = pageSize[0] - 56 // reduce RHS margin by 8px
  const contentWidth = right - left
  const headerHeight = 48
  let y = pageSize[1] - headerHeight - 16
  let logoImg: any | null = null
  const brandGold = rgb(0.827, 0.686, 0.216)
  const brandDark = rgb(0.043, 0.043, 0.043)

  // Sanitize text to WinAnsi-safe glyphs
  const sanitize = (input: any): string => {
    const s = String(input ?? '')
      .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2022]/g, '-')
      .replace(/[\u2026]/g, '...')
      .replace(/\u00A0/g, ' ')
    return s.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A1-\u00FF]/g, '')
  }

  const drawFooter = (p: any) => {
    const footerY = 28
    p.drawRectangle({ x: left, y: footerY + 10, width: contentWidth, height: 0.5, color: brandGold })
    p.drawText('World Machine Money • apply.worldmachinemoney.online', { x: left, y: footerY, size: 9, font, color: rgb(0.55,0.55,0.55) })
  }

  // Safe footer that avoids non‑WinAnsi glyphs
  const drawFooterSafe = (p: any) => {
    const footerY = 28
    p.drawRectangle({ x: left, y: footerY + 10, width: contentWidth, height: 0.5, color: brandGold })
    p.drawText('World Machine Money - apply.worldmachinemoney.online', { x: left, y: footerY, size: 9, font, color: rgb(0.55,0.55,0.55) })
  }

  const drawHeader = () => {
    page.drawRectangle({ x: 0, y: pageSize[1] - headerHeight, width: pageSize[0], height: headerHeight, color: brandDark })
    let titleX = left
    try {
      if (logoImg) {
        const h = 26; const w = (logoImg.width / logoImg.height) * h
        page.drawImage(logoImg, { x: left, y: pageSize[1] - headerHeight + 10, width: w, height: h })
        titleX = left + w + 10
      }
    } catch {}
    page.drawText('Second Mortgage Funding Application', { x: titleX, y: pageSize[1] - headerHeight + 16, size: 14, font, color: brandGold })
    page.drawText(new Date().toLocaleString('en-AU'), { x: left, y: pageSize[1] - headerHeight + 2, size: 9, font, color: rgb(0.7,0.7,0.7) })
    drawFooterSafe(page)
  }

  /* replaced by branded newPage */ const newPage = () => { page = doc.addPage(pageSize); drawHeader(); y = pageSize[1] - headerHeight - 16 }
  const ensure = (min = 60) => { if (y < min) newPage() }
  const drawLine = (yy: number) => page.drawRectangle({ x: left, y: yy, width: contentWidth, height: 0.5, color: rgb(0.827,0.686,0.216) })
  const wrap = (text: string, size: number, maxW: number): string[] => {
    const words = sanitize(text).split(/\s+/)
    const lines: string[] = []
    let cur = ''
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (font.widthOfTextAtSize(t, size) > maxW) { if (cur) lines.push(cur); cur = w } else { cur = t } }
    if (cur) lines.push(cur)
    return lines
  }
  const drawText = (text: string, size = 11, color = rgb(0,0,0)) => {
    const lines = wrap(sanitize(text), size, contentWidth)
    for (const l of lines) { ensure(); page.drawText(l, { x: left, y, size, font, color }); y -= size + 8 }
  }
  const drawTextBold = (text: string, size = 11, color = rgb(0,0,0)) => {
    const lines = wrap(sanitize(text), size, contentWidth)
    for (const l of lines) { ensure(); page.drawText(l, { x: left, y, size, font: fontBold, color }); y -= size + 8 }
  }
  const section = (title: string) => {
    ensure()
    page.drawText(sanitize(title), { x: left, y, size: 13, font, color: rgb(0.12,0.12,0.12) })
    y -= 16
    drawLine(y)
    // Increase gap to create more breathing room under headings
    y -= 16
  }
  const kvRow = (pairs: Array<[string, any]>) => {
    const size = 11
    const gap = 18
    const colW = (contentWidth - gap) / 2
    for (let i = 0; i < pairs.length; i += 2) {
      const leftWrap = wrap(`${pairs[i][0]}: ${pairs[i][1] ?? '-'}`, size, colW)
      const rightWrap = i + 1 < pairs.length ? wrap(`${pairs[i+1][0]}: ${pairs[i+1][1] ?? '-'}`, size, colW) : []
      const rowLines = Math.max(leftWrap.length, rightWrap.length, 1)
      const rowBlock = rowLines * (size + 8) + 2
      ensure(72 + rowBlock)
      // left col
      for (let li = 0; li < leftWrap.length; li++) {
        page.drawText(leftWrap[li], { x: left, y: y - li * (size + 8), size, font, color: rgb(0,0,0) })
      }
      // right col
      if (rightWrap.length) {
        const x = left + colW + gap
        for (let li = 0; li < rightWrap.length; li++) {
          page.drawText(rightWrap[li], { x, y: y - li * (size + 8), size, font, color: rgb(0,0,0) })
        }
      }
      y -= rowBlock
    }
    y -= 12
  }

  // Prefetch logo once for headers
  try {
    const logoUrl = process.env.WMM_LOGO_URL || 'https://apply.worldmachinemoney.online/wmm-logo.png'
    const resp = await fetch(logoUrl)
    if (resp.ok) {
      const buf = new Uint8Array(await resp.arrayBuffer())
      try { logoImg = await doc.embedPng(buf) } catch { logoImg = await doc.embedJpg(buf) }
    }
  } catch {}
  // Header
  drawHeader()

  // Business
  section('Business')
  kvRow([
    ['Business Name', body.businessName || '-'],
    ['ABN', body.abn || '-'],
    ['ABN Active', body.abnActive ? 'Yes' : 'No'],
    ['GST Registered', body.gstRegistered ? 'Yes' : 'No'],
    ['Entity Type', body.entityType || '-'],
    ['ACN', body.acn || '-'],
  ])
  if (body.trustDetails) drawText(`Trust Details: ${body.trustDetails}`)

  // Loan
  section('Loan')
  kvRow([
    ['Requested Amount', body.requestedAmount ? `$${Number(body.requestedAmount).toLocaleString()}` : '-'],
    ['Loan Term (months)', body.loanTermMonths ?? '-'],
    ['Purpose', body.loanPurpose || '-'],
    ['Exit Strategy', body.exitStrategy || '-'],
  ])
  if (body.exitStrategyDetails) drawText(`Exit Details: ${body.exitStrategyDetails}`)
  if (body.turnaroundExpectation) drawText(`Turnaround Expectation: ${body.turnaroundExpectation}`)

  // Security
  section('Security')
  kvRow([
    ['Owner of Property', body.isOwnerOfProperty || '-'],
    ['Names on Title', body.propertyOwnershipNames || '-'],
    ['Property Address', body.securityAddress || '-'],
    ['Estimated Value', body.estimatedPropertyValue != null ? `$${Number(body.estimatedPropertyValue).toLocaleString()}` : '-'],
    ['Existing Debt Amount', (body.existingDebtAmount != null) ? `$${Number(body.existingDebtAmount).toLocaleString()}` : '-'],
    ['Existing Debt Lender', body.existingDebtLender || (body.existingDebtAndLender || '-')],
  ])

  // Contact
  section('Contact')
  kvRow([
    ['Contact Name', body.contactName || '-'],
    ['Contact Email', body.contactEmail || '-'],
    ['Contact Phone', body.contactPhone || '-'],
  ])

  // Directors
  const directors = body.directors || []
  if (directors.length) {
    section('Directors')
    directors.forEach((d: any, i: number) => {
      const fullName = [d.title, d.firstName, d.lastName].filter(Boolean).join(' ')
      drawText(`Director ${i + 1}: ${fullName || '-'}`)
      if (d.address) drawText(`Address: ${d.address}`)
      if (d.email) drawText(`Email: ${d.email}`)
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
  if (body.directorsAreGuarantors === false) {
    const guarantors = body.guarantors || []
    if (guarantors.length) {
      section('Guarantors')
      guarantors.forEach((g: any, i: number) => {
        const gFull = [g.title, g.firstName, g.lastName].filter(Boolean).join(' ')
        drawText(`Guarantor ${i + 1}: ${gFull || '-'}`)
        if (g.address) drawText(`Address: ${g.address}`)
        if (g.email) drawText(`Email: ${g.email}`)
        kvRow([
          ['Relationship', g.relationshipToDirector || '-'],
          ['Phone', g.phone || '-'],
          ['Email', g.email || '-'],
        ])
      })
    }
  }

  // Terms
  section('Terms')
  kvRow([
    ['Accepted Terms', body.acceptTerms ? 'Yes' : 'No'],
    ['Applicant Name', body.consentName || '-'],
    ['Consent Date', body.consentDate ? new Date(body.consentDate).toLocaleDateString('en-AU') : '-'],
    ['Signature', body.consentSignature || '-'],
  ])
  // Inline terms text (bold as per on-screen wording)
  const termsParas: string[] = [
    '1. Purpose of Application: This application is submitted to World Machine Money Pty Ltd (WMM) for the purpose of assessing suitability for a private lending facility. Submission of this application does not guarantee approval or funding.',
    '2. Privacy and Use of Information: WMM collects, holds, and uses personal, business, and financial information provided for the purpose of: (a) assessing eligibility for a private lending product; (b) communicating with lenders, introducers, valuers, solicitors, or other relevant third parties; and (c) meeting obligations under the Privacy Act 1988 (Cth), Anti‑Money Laundering and Counter‑Terrorism Financing Act 2006 (Cth), and related legislation.',
    '3. Disclosure to Third Parties: The applicant authorises WMM to disclose information to: private lenders and investors engaged by WMM; valuers, solicitors, accountants, and professional advisers; verification or identity service providers; and aggregator or funding partners supporting WMM operations. Information will only be shared for purposes directly related to the assessment and processing of the loan.',
    '4. No Credit Check: This private lending product does not involve a credit check. Assessment is based on the security offered and supporting documentation.',
    '5. Accuracy and Acknowledgement: The applicant confirms that all information supplied is true and complete. Any inaccurate or misleading information may result in the withdrawal of an offer or cancellation of an application.',
    '6. Confidentiality and Limitation of Liability: All information will be treated in strict confidence and managed according to the WMM Privacy Policy. WMM acts as an introducer and arranger only and shall not be liable for any loss, cost, or damage resulting from any decision made by the applicant or any lender.'
  ]
  termsParas.forEach((p) => drawTextBold(p))
  // Signature + date anchors right under the terms
  ensure(80)
  drawText('By signing below, I/we acknowledge and agree to the Terms & Conditions above.')
  const anchor = '[[[SIGN_HERE_1]]]'
  const sigLineY = y - 10
  page.drawRectangle({ x: left, y: sigLineY, width: 220, height: 0.7, color: rgb(0.6,0.6,0.6) })
  page.drawText(anchor, { x: left + 140, y: sigLineY + 4, size: 8, font, color: rgb(1,1,1) })
  // Date line to the right with an invisible anchor for DocuSign DateSigned tab
  const dateAnchor = '[[[DATE_HERE_1]]]'
  page.drawText('Date', { x: left + 260, y: sigLineY + 6, size: 9, font, color: rgb(0.4,0.4,0.4) })
  page.drawRectangle({ x: left + 260, y: sigLineY, width: 140, height: 0.7, color: rgb(0.6,0.6,0.6) })
  page.drawText(dateAnchor, { x: left + 330, y: sigLineY + 4, size: 8, font, color: rgb(1,1,1) })
  y = sigLineY - 16

  // Terms are included inline; no external Terms PDF append on server.\n// Attachments
  section('Attachments')
  const allAttachments = collectAllAttachments(body)
  drawText(`Accountant's Letter: ${body.accountantsLetter ? 'Provided' : 'Not provided'}`)
  drawText(`Total Attachments: ${allAttachments.length} file(s)`, 11, rgb(0,0,0))

  // Embed uploaded documents into the PDF as pages (images and PDFs)
  try {
    await appendAttachmentsIntoPdfServer(doc, allAttachments)
  } catch {}

  return await doc.save()
}

function collectAllAttachments(body: any): Array<{ filename: string; type: string; base64: string; label?: string }> {
  const list: Array<{ filename: string; type: string; base64: string; label?: string }> = []
  const push = (a?: any, label?: string) => { if (a && a.base64) list.push({ filename: a.filename, type: a.type, base64: a.base64, label }) }
  const guess = (name?: string) => {
    const n = String(name || '').toLowerCase()
    if (/(rate|rates).*notice/.test(n) || /council.*rate/.test(n)) return 'Rates Notice'
    if (/bank.*statement/.test(n) || /statement.*bank/.test(n) || /stmt/.test(n)) return 'Bank Statement'
    if (/trust.*deed/.test(n)) return 'Trust Deed'
    if (/accountant|cpa|letter.*account/.test(n)) return "Accountant's Letter"
    return 'Supporting Document'
  }
  ;(body.supportingDocs || []).forEach((a: any, i: number) => push(a, `${guess(a?.filename)}${a?.filename ? ` - ${a.filename}` : ''}`))
  if ((body as any).trustDeed) push((body as any).trustDeed, 'Trust Deed')
  if (body.accountantsLetter) push(body.accountantsLetter, "Accountant's Letter")
  ;(body.directors || []).forEach((d: any, i: number) => {
    push(d.id?.licenseFront, `Director ${i + 1} Licence Front${d.id?.licenseFront?.filename ? ` - ${d.id.licenseFront.filename}` : ''}`)
    push(d.id?.licenseBack, `Director ${i + 1} Licence Back${d.id?.licenseBack?.filename ? ` - ${d.id.licenseBack.filename}` : ''}`)
    push(d.id?.medicareFront, `Director ${i + 1} Medicare Card${d.id?.medicareFront?.filename ? ` - ${d.id.medicareFront.filename}` : ''}`)
  })
  ;(body.guarantors || []).forEach((g: any, i: number) => {
    push(g.id?.licenseFront, `Guarantor ${i + 1} Licence Front${g.id?.licenseFront?.filename ? ` - ${g.id.licenseFront.filename}` : ''}`)
    push(g.id?.licenseBack, `Guarantor ${i + 1} Licence Back${g.id?.licenseBack?.filename ? ` - ${g.id.licenseBack.filename}` : ''}`)
    push(g.id?.medicareFront, `Guarantor ${i + 1} Medicare Card${g.id?.medicareFront?.filename ? ` - ${g.id.medicareFront.filename}` : ''}`)
  })
  return list
}

async function appendAttachmentsIntoPdfServer(doc: PDFDocument, files: Array<{ filename: string; type: string; base64: string; label?: string }>) {
  const margin = 40
  const MAX_FILES = 25
  for (let i = 0; i < Math.min(files.length, MAX_FILES); i++) {
    const f = files[i]
    try {
      const bytes = Buffer.from(f.base64, 'base64')
      if (/pdf/i.test(f.type) || /\.pdf$/i.test(f.filename || '')) {
        const src = await PDFDocument.load(bytes)
        const pages = await doc.copyPages(src, src.getPageIndices())
        const helv = await doc.embedFont(StandardFonts.Helvetica)
        pages.forEach((p) => {
          if (f.label) p.drawText(f.label, { x: margin, y: 792 - margin - 12, size: 10, font: helv, color: rgb(0.4,0.4,0.4) })
          doc.addPage(p)
        })
      } else if (/png/i.test(f.type)) {
        const page = doc.addPage([612, 792])
        const img = await doc.embedPng(bytes)
        const dims = img.scale(1)
        const maxW = 612 - margin * 2
        const maxH = 792 - margin * 2
        const scale = Math.min(maxW / dims.width, maxH / dims.height)
        const w = dims.width * scale
        const h = dims.height * scale
        page.drawText(f.label || f.filename || 'image', { x: margin, y: 792 - margin - 12, size: 10, font: await doc.embedFont(StandardFonts.Helvetica), color: rgb(0.4,0.4,0.4) })
        page.drawImage(img, { x: (612 - w) / 2, y: (792 - h) / 2 - 10, width: w, height: h })
      } else if (/jpe?g/i.test(f.type)) {
        const page = doc.addPage([612, 792])
        const img = await doc.embedJpg(bytes)
        const dims = img.scale(1)
        const maxW = 612 - margin * 2
        const maxH = 792 - margin * 2
        const scale = Math.min(maxW / dims.width, maxH / dims.height)
        const w = dims.width * scale
        const h = dims.height * scale
        page.drawText(f.label || f.filename || 'image', { x: margin, y: 792 - margin - 12, size: 10, font: await doc.embedFont(StandardFonts.Helvetica), color: rgb(0.4,0.4,0.4) })
        page.drawImage(img, { x: (612 - w) / 2, y: (792 - h) / 2 - 10, width: w, height: h })
      }
    } catch {}
  }
}







