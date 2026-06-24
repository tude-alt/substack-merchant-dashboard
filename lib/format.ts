// Amounts are stored in kobo (1 NGN = 100 kobo) as bigint to avoid float math.

export function formatNaira(kobo: number): string {
  const naira = Math.round(kobo) / 100
  return `₦${naira.toLocaleString("en-NG", {
    minimumFractionDigits: naira % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

export function formatDate(value: Date | string | number | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  const day = String(d.getDate()).padStart(2, "0")
  return `${day} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function formatDateTime(value: Date | string | number | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })
  return `${formatDate(d)}, ${time}`
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}
