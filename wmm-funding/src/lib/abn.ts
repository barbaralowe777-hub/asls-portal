// Basic ABN validation and formatting utilities

export function normalizeAbn(input: string): string {
  return (input || '').replace(/\D/g, '').slice(0, 11)
}

export function isValidAbn(abnRaw: string): boolean {
  const abn = normalizeAbn(abnRaw)
  if (abn.length !== 11) return false
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
  const digits = abn.split('').map((d) => parseInt(d, 10))
  digits[0] = digits[0] - 1
  const total = digits.reduce((sum, d, i) => sum + d * weights[i], 0)
  return total % 89 === 0
}

