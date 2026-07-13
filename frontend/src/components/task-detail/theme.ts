/** Shared palette matching the main task UI (ritual-preview). */
export const COLORS = {
  bg: '#F4F6F9',
  card: '#FFFFFF',
  hi: '#16181D',
  mid: '#5F6672',
  low: '#9AA1AC',
  border: '#D8DCE3',
  borderStrong: '#B8BFC9',
  coral: '#E11D48',
  mint: '#059669',
  accent: '#2563EB',
  accentLight: '#EFF6FF',
};

export const cardStyle: React.CSSProperties = {
  background: COLORS.card,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 16,
  padding: '14px 16px',
};

/** Local calendar date as YYYY-MM-DD (never UTC-shifted). */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
