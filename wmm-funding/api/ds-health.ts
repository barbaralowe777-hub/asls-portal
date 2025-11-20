import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as docusignNS from 'docusign-esign'

function getDS() {
  const anyDS: any = docusignNS as any
  return anyDS.ApiClient ? anyDS : (anyDS.default || anyDS)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY || ''
    const USER_ID = process.env.DOCUSIGN_USER_ID || ''
    const PRIVATE_KEY_RAW = process.env.DOCUSIGN_PRIVATE_KEY || ''
    const BASE_URL = (process.env.DOCUSIGN_BASE_URL || 'https://demo.docusign.net') + '/restapi'

    if (!INTEGRATION_KEY || !USER_ID || !PRIVATE_KEY_RAW) {
      return res.status(200).json({
        ok: false,
        reason: 'missing_env',
        details: {
          hasIntegrationKey: !!INTEGRATION_KEY,
          hasUserId: !!USER_ID,
          hasPrivateKey: !!PRIVATE_KEY_RAW,
          baseUrl: BASE_URL,
        },
      })
    }

    const docusign = getDS()
    const apiClient = new docusign.ApiClient()
    apiClient.setBasePath(BASE_URL)
    const privateKey = PRIVATE_KEY_RAW.replace(/\\n/g, '\n')
    try {
      const auth = (await apiClient.requestJWTUserToken(
        INTEGRATION_KEY,
        USER_ID,
        ['signature', 'impersonation'],
        privateKey,
        3600
      )) as any

      const accessToken = auth?.body?.access_token
      if (!accessToken) throw new Error('no_access_token')

      const userInfo = await apiClient.getUserInfo(accessToken).catch((e: any) => ({ error: e?.response?.text || e?.message }))
      return res.status(200).json({ ok: true, token: 'ok', userInfo })
    } catch (e: any) {
      // Surface DocuSign error text when possible (CONSENT_REQUIRED, invalid_grant, etc.)
      const msg = e?.response?.text || e?.message || String(e)
      return res.status(200).json({ ok: false, reason: 'auth_error', message: msg })
    }
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e?.message || 'unknown_error' })
  }
}
