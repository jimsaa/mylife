const MONTH_NAMES_SV = [
  'januari',
  'februari',
  'mars',
  'april',
  'maj',
  'juni',
  'juli',
  'augusti',
  'september',
  'oktober',
  'november',
  'december',
];

const WEEKDAY_SHORT_SV = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'] as const;

export function formatSek(value: string | number): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '0 kr';
  const [whole, fraction] = amount.toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return fraction === '00' ? `${grouped} kr` : `${grouped},${fraction} kr`;
}

export function formatHoursValue(value: string | number): string {
  if (value === '' || value === null || value === undefined) return '0 h';
  return `${value} h`;
}

export function formatKwhValue(value: string | number): string {
  if (value === '' || value === null || value === undefined) return '0 kWh';
  return `${value} kWh`;
}

export function formatMonthHeadingSv(year: number, month: number): string {
  return `${MONTH_NAMES_SV[month - 1]?.toUpperCase() ?? ''} ${year}`;
}

export function formatDateTitleSv(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const name = MONTH_NAMES_SV[(month ?? 1) - 1] ?? '';
  return `${day} ${name.slice(0, 1).toUpperCase()}${name.slice(1)} ${year}`;
}

export function weekdayShortSv(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1)).getUTCDay();
  return WEEKDAY_SHORT_SV[weekday];
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function previousYearMonth(year: number, month: number) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export function nextYearMonth(year: number, month: number) {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

export function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export type TaxiChartDay = {
  date: string;
  day: number;
  weekdayShortSv: string;
  grossIncome: string;
};

export function buildMonthChartDays(
  year: number,
  month: number,
  days: Array<{ date: string; grossIncome: string }>,
): TaxiChartDay[] {
  const byDate = new Map(days.map((day) => [day.date, day.grossIncome]));
  const last = lastDayOfMonth(year, month);
  const chartDays: TaxiChartDay[] = [];
  for (let day = 1; day <= last; day += 1) {
    const date = toIsoDate(year, month, day);
    chartDays.push({
      date,
      day,
      weekdayShortSv: weekdayShortSv(date),
      grossIncome: byDate.get(date) ?? '0',
    });
  }
  return chartDays;
}

export function barHeightPercent(grossIncome: string, maxIncome: number): number {
  if (maxIncome <= 0) return 0;
  const value = Number(grossIncome);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(4, Math.round((value / maxIncome) * 100));
}

export function maxGrossIncome(days: Array<{ grossIncome: string }>): number {
  return days.reduce((max, day) => {
    const value = Number(day.grossIncome);
    return value > max ? value : max;
  }, 0);
}
