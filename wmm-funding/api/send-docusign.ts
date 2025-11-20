import type { VercelRequest, VercelResponse } from '@vercel/node'

// Placeholder endpoint for DocuSign integration. Returns 501 until templates/credentials are provided.
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(501).json({ ok: false, message: 'DocuSign not configured. Provide Integration Key, User ID, Account ID, Base URL and a Template ID to enable.' })
}

