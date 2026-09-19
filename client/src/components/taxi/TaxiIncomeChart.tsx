import { Link } from 'react-router-dom';
import {
  barHeightPercent,
  formatSek,
  maxGrossIncome,
  type TaxiChartDay,
} from '../../lib/taxilogDisplay';

type TaxiIncomeChartProps = {
  year: number;
  month: number;
  days: TaxiChartDay[];
  selectedDate: string | null;
};

export function TaxiIncomeChart({ year, month, days, selectedDate }: TaxiIncomeChartProps) {
  const maxIncome = maxGrossIncome(days);

  return (
    <section className="overflow-x-auto">
      <div className="flex min-w-[720px] items-end gap-1 md:min-w-0 md:w-full">
        {days.map((day) => {
          const selected = day.date === selectedDate;
          const height = barHeightPercent(day.grossIncome, maxIncome);
          return (
            <Link
              key={day.date}
              to={`/admin/taxi?year=${year}&month=${month}&date=${day.date}`}
              title={`${day.day}: ${formatSek(day.grossIncome)}`}
              className="flex min-w-0 flex-1 flex-col items-center text-center"
            >
              <div className="flex h-52 w-full items-end justify-center border-b border-border md:h-64">
                <span
                  className={`w-full max-w-6 rounded-t-sm ${
                    height > 0 ? (selected ? 'bg-accent' : 'bg-slate-400') : 'bg-slate-200'
                  }`}
                  style={{ height: height > 0 ? `${height}%` : '2px' }}
                />
              </div>
              <span className={`mt-2 text-xs ${selected ? 'font-semibold text-accent' : 'text-text-muted'}`}>
                {day.day}
              </span>
              <span className={`text-[10px] ${selected ? 'text-text' : 'text-text-muted'}`}>
                {day.weekdayShortSv}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
