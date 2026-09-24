import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/app/ThemeContext";
import { categoricalPalette, SEQUENTIAL_BLUE, STATUS_COLORS } from "./palette";
import type { TrendPoint, DemographicBreakdown } from "./api";

function useChartInk() {
  const { theme } = useTheme();
  return {
    theme,
    ink: theme === "dark" ? "#c3c2b7" : "#52514e",
    grid: theme === "dark" ? "#2c2c2a" : "#e1e0d9",
    surface: theme === "dark" ? "#1a1a19" : "#fcfcfb",
  };
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border/70 bg-card px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-medium text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function RegistrationTrendChart({ data, height = 260 }: { data: TrendPoint[]; height?: number }) {
  const { ink, grid } = useChartInk();
  const chartData = data.map((d) => ({ ...d, label: formatDateLabel(d.date) }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SEQUENTIAL_BLUE} stopOpacity={0.35} />
            <stop offset="100%" stopColor={SEQUENTIAL_BLUE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: ink, fontSize: 11 }} axisLine={{ stroke: grid }} tickLine={false} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} tick={{ fill: ink, fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="count"
          name="Registrations"
          stroke={SEQUENTIAL_BLUE}
          strokeWidth={2}
          fill="url(#trendFill)"
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({ byStatus, height = 260 }: { byStatus: Record<string, number>; height?: number }) {
  const { theme, ink } = useChartInk();
  const entries = Object.entries(byStatus).filter(([, count]) => count > 0);

  if (entries.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet</div>;
  }

  const data = entries.map(([status, count]) => ({
    name: status.replace("_", " "),
    value: count,
    color: STATUS_COLORS[status]?.[theme] ?? categoricalPalette(theme)[0],
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2} strokeWidth={0}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => <span style={{ color: ink, fontSize: 12, textTransform: "capitalize" }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DemographicBarChart({ breakdown, height = 240 }: { breakdown: DemographicBreakdown; height?: number }) {
  const { theme, ink, grid } = useChartInk();
  const palette = categoricalPalette(theme);
  const data = breakdown.data.map((d, i) => ({ ...d, fill: palette[i % palette.length] }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fill: ink, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="value"
          tick={{ fill: ink, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={100}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" name={breakdown.label} radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((entry) => (
            <Cell key={entry.value} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
