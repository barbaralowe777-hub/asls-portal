import { useMemo, useState } from 'react'
import useMedia from '../lib/useMedia'

export default function Eligibility() {
  const isMobile = useMedia('(max-width: 640px)')
  const [calc, setCalc] = useState({ propertyValue: '', currentMortgage: '', financeAmount: '' })

  const INTEREST_RATE = 0.1395
  const BROKER_FEE_RATE = 0.06
  const VALUATION_FEES = 3950
  const LEGAL_FEES = 3000

  const n = (v: string) => (v === '' ? 0 : Number(v) || 0)
  const equityBase = useMemo(() => (n(calc.propertyValue) - n(calc.currentMortgage)) * 0.7, [calc.propertyValue, calc.currentMortgage])
  const interest = useMemo(() => n(calc.financeAmount) * INTEREST_RATE, [calc.financeAmount])
  const brokerFees = useMemo(() => n(calc.financeAmount) * BROKER_FEE_RATE, [calc.financeAmount])
  const surplus = useMemo(() => equityBase - n(calc.financeAmount) - interest - brokerFees - VALUATION_FEES - LEGAL_FEES, [equityBase, calc.financeAmount, interest, brokerFees])
  const qualifies = useMemo(() => {
    if (n(calc.financeAmount) <= 0) return null as null | boolean
    return surplus >= n(calc.financeAmount) * 0.1
  }, [surplus, calc.financeAmount])

  const fmtCurrency = (nVal: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(isNaN(nVal) ? 0 : nVal)
  const setNumber = (key: keyof typeof calc) => (e: React.ChangeEvent<HTMLInputElement>) => setCalc((c) => ({ ...c, [key]: e.target.value }))
  const loadExample = () => setCalc({ propertyValue: '2700000', currentMortgage: '1500000', financeAmount: '250000' })

  return (
    <div>
      <h1>Eligibility Check</h1>
      <p className="wm-help">Quick estimate based on property value, existing mortgage, and funding amount.</p>

      <div className="wm-section-title">Property Equity Calculator</div>
      <div className="wm-card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          <label>
            <div>Property Secured Value</div>
            <input className="wm-input" type="number" min={0} step={1000} value={calc.propertyValue} onChange={setNumber('propertyValue')} />
          </label>
          <label>
            <div>Current Mortgage (Debt)</div>
            <input className="wm-input" type="number" min={0} step={1000} value={calc.currentMortgage} onChange={setNumber('currentMortgage')} />
          </label>
        </div>
        <label>
          <div>Finance Amount Needed</div>
          <input className="wm-input" type="number" min={0} step={1000} value={calc.financeAmount} onChange={setNumber('financeAmount')} />
        </label>

        <div className="wm-card" style={{ display: 'grid', gap: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: surplus >= 0 ? 'var(--wm-gold)' : '#ff6b6b' }}>{fmtCurrency(surplus)}</div>
            <div className="wm-help">Estimated Surplus</div>
          </div>
          {qualifies !== null && (
            <div style={{ textAlign: 'center', fontWeight: 700 }}>
              {qualifies ? (
                <span style={{ color: '#22c55e' }}>✓ This DOES qualify</span>
              ) : (
                <span style={{ color: '#ef4444' }}>✗ This DOES NOT Qualify</span>
              )}
            </div>
          )}
        </div>

        <div className="wm-help">Includes standard interest, broker, valuation and legal costs; indicative only.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="wm-button" onClick={loadExample}>Load Example</button>
          <button type="button" className="wm-button secondary" onClick={() => setCalc({ propertyValue: '', currentMortgage: '', financeAmount: '' })}>Clear</button>
        </div>
      </div>
    </div>
  )
}
