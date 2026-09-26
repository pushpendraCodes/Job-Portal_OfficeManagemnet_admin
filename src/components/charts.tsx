import type { ReactNode } from "react";
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
import { useTheme } from "./ThemeToggle";

export const CHART_COLORS_LIGHT = ["#c8322b", "#334155", "#16a34a", "#c2410c", "#64748b", "#1d1d1f", "#b91c1c", "#94a3b8"];
export const CHART_COLORS_DARK = ["#c8322b", "#94a3b8", "#4ade80", "#fb923c", "#cbd5e1", "#f5f5f7", "#f87171", "#64748b"];
export const CHART_COLORS = CHART_COLORS_LIGHT;

function useChartChrome() {
  const theme = useTheme();
  const dark = theme === "dark";
  return {
    colors: dark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT,
    grid: dark ? "#222222" : "#e5e7eb",
    tick: { fontSize: 11, fill: dark ? "#a1a1a6" : "#6e6e73" },
    tooltip: {
      backgroundColor: dark ? "#000000" : "#ffffff",
      border: `1px solid ${dark ? "#222222" : "#e5e5ea"}`,
      borderRadius: 12,
      color: dark ? "#f5f5f7" : "#1d1d1f",
    },
  };
}

export function formatINR(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return new Date(year, month - 1, 1).toLocaleString("en", { month: "short" });
}

export function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`panel chart-card ${className}`.trim()}>
      <div className="chart-card-head">
        <div>
          <h3 className="chart-card-title">{title}</h3>
          {subtitle ? <p className="muted chart-card-sub">{subtitle}</p> : null}
        </div>
      </div>
      <div className="chart-body">{children}</div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "ok" | "warn" | "accent";
}) {
  return (
    <div className={`panel stat-card tone-${tone}`}>
      <div className="label">{label}</div>
      <div className="value display">{value}</div>
      {hint ? <div className="muted stat-hint">{hint}</div> : null}
    </div>
  );
}

export function UsersPieChart({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  const chrome = useChartChrome();
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) {
    return <p className="muted">No data</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={filtered} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
          {filtered.map((_, index) => (
            <Cell key={filtered[index].name} fill={chrome.colors[index % chrome.colors.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={chrome.tooltip} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MoneyBarChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const chrome = useChartChrome();
  if (data.length === 0) return <p className="muted">No data</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chrome.grid} />
        <XAxis dataKey="label" tick={chrome.tick} />
        <YAxis tick={chrome.tick} tickFormatter={(v) => `₹${v}`} />
        <Tooltip contentStyle={chrome.tooltip} formatter={(value) => formatINR(Number(value))} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#c8322b" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function JobsBarChart({ data }: { data: Array<{ status: string; count: number }> }) {
  const chrome = useChartChrome();
  if (data.length === 0) return <p className="muted">No data</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chrome.grid} />
        <XAxis dataKey="status" tick={chrome.tick} />
        <YAxis allowDecimals={false} tick={chrome.tick} />
        <Tooltip contentStyle={chrome.tooltip} />
        <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#c8322b" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RegistrationAreaChart({
  data,
}: {
  data: Array<{ month: string; employers: number; seekers: number }>;
}) {
  const chrome = useChartChrome();
  const chartData = data.map((row) => ({ ...row, label: monthLabel(row.month) }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="empFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#c8322b" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#c8322b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="seekFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#c2410c" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#c2410c" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chrome.grid} />
        <XAxis dataKey="label" tick={chrome.tick} />
        <YAxis allowDecimals={false} tick={chrome.tick} />
        <Tooltip contentStyle={chrome.tooltip} />
        <Legend />
        <Area type="monotone" dataKey="employers" stroke="#c8322b" fill="url(#empFill)" strokeWidth={2} />
        <Area type="monotone" dataKey="seekers" stroke="#c2410c" fill="url(#seekFill)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ExpenditureTrendChart({
  data,
}: {
  data: Array<{ month: string; credit: number; debit: number }>;
}) {
  const chrome = useChartChrome();
  const chartData = data.map((row) => ({ ...row, label: monthLabel(row.month) }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chrome.grid} />
        <XAxis dataKey="label" tick={chrome.tick} />
        <YAxis tick={chrome.tick} tickFormatter={(v) => `₹${v}`} />
        <Tooltip contentStyle={chrome.tooltip} formatter={(value) => formatINR(Number(value))} />
        <Legend />
        <Area type="monotone" dataKey="credit" stroke="#16a34a" fill="#dcfce7" strokeWidth={2} />
        <Area type="monotone" dataKey="debit" stroke="#c8322b" fill="#fadedb" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({
  data,
}: {
  data: Array<{ category: string; total: number }>;
}) {
  const chrome = useChartChrome();
  if (data.length === 0) return <p className="muted">No expenditure data</p>;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 16, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chrome.grid} />
        <XAxis type="number" tick={chrome.tick} tickFormatter={(v) => `₹${v}`} />
        <YAxis type="category" dataKey="category" width={90} tick={chrome.tick} />
        <Tooltip contentStyle={chrome.tooltip} formatter={(value) => formatINR(Number(value))} />
        <Bar dataKey="total" radius={[0, 8, 8, 0]} fill="#c8322b" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TypePieChart({
  credit,
  debit,
}: {
  credit: number;
  debit: number;
}) {
  const data = [
    { name: "Credit", value: credit },
    { name: "Debit", value: debit },
  ].filter((d) => d.value > 0);

  const chrome = useChartChrome();
  if (data.length === 0) return <p className="muted">No expenditure data</p>;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
          <Cell fill="#16a34a" />
          <Cell fill="#c8322b" />
        </Pie>
        <Tooltip contentStyle={chrome.tooltip} formatter={(value) => formatINR(Number(value))} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
