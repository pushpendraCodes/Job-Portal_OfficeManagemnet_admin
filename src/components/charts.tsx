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

export const CHART_COLORS = ["#0f766e", "#c2410c", "#0369a1", "#7c3aed", "#b45309", "#047857", "#be123c", "#475569"];

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
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) {
    return <p className="muted">No data</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={filtered} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
          {filtered.map((_, index) => (
            <Cell key={filtered[index].name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function JobsBarChart({ data }: { data: Array<{ status: string; count: number }> }) {
  if (data.length === 0) return <p className="muted">No data</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="status" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#0f766e" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RegistrationAreaChart({
  data,
}: {
  data: Array<{ month: string; employers: number; seekers: number }>;
}) {
  const chartData = data.map((row) => ({ ...row, label: monthLabel(row.month) }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="empFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="seekFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#c2410c" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#c2410c" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Area type="monotone" dataKey="employers" stroke="#0f766e" fill="url(#empFill)" strokeWidth={2} />
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
  const chartData = data.map((row) => ({ ...row, label: monthLabel(row.month) }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
        <Tooltip formatter={(value) => formatINR(Number(value))} />
        <Legend />
        <Area type="monotone" dataKey="credit" stroke="#047857" fill="#d1fae5" strokeWidth={2} />
        <Area type="monotone" dataKey="debit" stroke="#c2410c" fill="#ffedd5" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({
  data,
}: {
  data: Array<{ category: string; total: number }>;
}) {
  if (data.length === 0) return <p className="muted">No expenditure data</p>;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 16, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
        <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value) => formatINR(Number(value))} />
        <Bar dataKey="total" radius={[0, 8, 8, 0]} fill="#0369a1" />
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

  if (data.length === 0) return <p className="muted">No expenditure data</p>;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
          <Cell fill="#047857" />
          <Cell fill="#c2410c" />
        </Pie>
        <Tooltip formatter={(value) => formatINR(Number(value))} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
