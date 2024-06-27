export function toSSCase(s: string) {
 return s.replace(' ','_').toUpperCase()
}

const BOLT11_SATS = 100000000
const BOLT11_M = 0.001
const BOLT11_U = 0.000001
const BOLT11_N = 0.000000001
const BOLT11_P = 0.000000000001

export function bolt11amount(invoice: string) {
  if (!invoice.startsWith('lnbc')) return undefined
  const i = invoice.lastIndexOf('1'); if (i < 0) return undefined
  const a = invoice.substring(4, i); if (a.length == 0) return undefined
  if (a.endsWith('m')) return '' + (+a.substring(0, a.length - 1)) * (BOLT11_M * BOLT11_SATS)
  if (a.endsWith('u')) return '' + (+a.substring(0, a.length - 1)) * (BOLT11_U * BOLT11_SATS)
  if (a.endsWith('n')) return '' + (+a.substring(0, a.length - 1)) * (BOLT11_N * BOLT11_SATS)
  if (a.endsWith('p')) return '' + (+a.substring(0, a.length - 1)) * (BOLT11_P * BOLT11_SATS)
  return a
}