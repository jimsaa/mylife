import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ProjectHoursChartProps {
  data: { project_name: string; color: string; hours: number }[];
}

export function ProjectHoursChart({ data }: ProjectHoursChartProps) {
  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" unit=" h" />
        <YAxis type="category" dataKey="project_name" width={120} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => [`${Number(v).toFixed(1)} h`, 'Tid']} />
        <Bar dataKey="hours" radius={4}>
          {data.map((entry) => (
            <Cell key={entry.project_name} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface TrendChartProps {
  data: { date: string; value: number }[];
  label: string;
  color?: string;
  unit?: string;
}

export function TrendChart({ data, label, color = '#0d9488', unit = '' }: TrendChartProps) {
  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}${unit}`, label]} />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface PieAllocationProps {
  data: { project_name: string; color: string; hours: number }[];
}

export function PieAllocationChart({ data }: PieAllocationProps) {
  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="hours"
          nameKey="project_name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={({ name, value }) => `${name}: ${Number(value).toFixed(1)}h`}
        >
          {data.map((entry) => (
            <Cell key={entry.project_name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [`${Number(v).toFixed(1)} h`, 'Tid']} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}
