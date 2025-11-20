export type AbrLookupResponse = {
  abn?: string
  entityName?: string
  entityType?: string
  gst?: { registered: boolean; effectiveFrom?: string | null }
  status: 'ok' | 'not_found' | 'error'
  raw?: any
  message?: string
}

export type ApplicationPayload = {
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

  directors?: Person[]
  directorsAreGuarantors?: boolean
  guarantors?: (Person & { relationshipToDirector?: string })[]

  supportingDocs?: AttachmentInput[]
  accountantsLetter?: AttachmentInput
  acceptTerms?: boolean
  consentName?: string
  consentDate?: string
  consentSignature?: string
  notes?: string
}

export type AttachmentInput = {
  filename: string
  type: string
  size: number
  base64: string
}

export type Person = {
  firstName?: string
  lastName?: string
  phone?: string
  address?: string
  email?: string
  id?: {
    licenseNumber?: string
    licenseState?: 'NSW' | 'QLD' | 'VIC' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT'
    licenseExpiry?: string
    licenseFront?: AttachmentInput
    licenseBack?: AttachmentInput
    medicareNumber?: string
    medicareExpiry?: string
    medicareFront?: AttachmentInput
  }
}
