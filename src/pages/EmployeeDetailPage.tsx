import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import {
  CategoryBarChart,
  ChartCard,
  MoneyBarChart,
  StatCard,
  TypePieChart,
  UsersPieChart,
  formatINR,
} from "../components/charts";

type Tab = "overview" | "tasks" | "attendance" | "salary" | "expenditure";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Employment {
  _id: string;
  employerId: string;
  fullName: string;
  mobile: string;
  designation?: string;
  department?: string;
  status: string;
  baseSalary?: number;
  salaryCycle?: string;
  joiningDate?: string;
  employeeCode?: string;
  employerProfileId?: { companyName?: string; city?: string; ownerName?: string };
}

interface SalaryRow {
  _id: string;
  year: number;
  month: number;
  netAmount: number;
  baseSalary?: number;
  status: string;
  presentDays?: number;
  halfDays?: number;
  absentDays?: number;
  leaveDays?: number;
  employerId: string;
  employerProfileId?: { companyName?: string };
}

interface EmployeeDetail {
  employee: Employment & {
    locationTrackingEnabled?: boolean;
    canManageExpenditure?: boolean;
    primarySiteId?: { name?: string; city?: string; address?: string };
  };
  employments: Employment[];
  selectedEmployerId: string | null;
  counts: {
    tasks: number;
    attendance: number;
    salaries: number;
    expenditures: number;
    companies: number;
  };
  finance: { credit: number; debit: number; balance: number };
  monthFinance?: { credit: number; debit: number; balance: number };
  filter?: { year: number; month: number };
  tasks: Array<{
    _id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string;
    createdAt?: string;
    employerId: string;
    employerProfileId?: { companyName?: string };
  }>;
  attendance: Array<{
    _id: string;
    date: string;
    status: string;
    loginAt?: string;
    logoutAt?: string;
    workedMinutes?: number;
    employerId: string;
    employerProfileId?: { companyName?: string };
    siteId?: { name?: string; city?: string };
  }>;
  salaries: SalaryRow[];
  salaryHistory?: SalaryRow[];
  expenditures: Array<{
    _id: string;
    type: string;
    amount: number;
    category: string;
    transactionDate: string;
    description?: string;
    employerId: string;
    employerProfileId?: { companyName?: string };
  }>;
}

function nowMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(value: string) {
  const [y, m] = value.split("-").map(Number);
  return { year: y || new Date().getFullYear(), month: m || new Date().getMonth() + 1 };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function fmtDate(value?: string) {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

function formatHours(minutes?: number) {
  if (minutes == null || Number.isNaN(Number(minutes))) return "—";
  const total = Math.max(0, Number(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function inSelectedMonth(value: string | undefined, year: number, month: number) {
  if (!value) return false;
  return String(value).slice(0, 7) === monthKey(year, month);
}

function attTone(status?: string) {
  if (status === "present") return "present";
  if (status === "half_day") return "half";
  if (status === "on_leave") return "leave";
  if (status === "absent") return "absent";
  return "";
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="detail-item">
      <div className="label">{label}</div>
      <div>{value ?? "—"}</div>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { t } = useTranslation();
  const { employeeId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<EmployeeDetail | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [monthValue, setMonthValue] = useState(nowMonthValue());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const employerFilter = searchParams.get("employerId") || "";
  const { year, month } = useMemo(() => parseMonth(monthValue), [monthValue]);

  const load = async (employerId?: string, monthVal?: string) => {
    if (!employeeId) return;
    const parsed = parseMonth(monthVal || monthValue);
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {
        year: String(parsed.year),
        month: String(parsed.month),
      };
      if (employerId) params.employerId = employerId;
      const { data: res } = await api.get<ApiSuccess<EmployeeDetail>>(
        `/admin/employees/${employeeId}`,
        { params },
      );
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(employerFilter || undefined, monthValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const onEmployerChange = (value: string) => {
    if (value) setSearchParams({ employerId: value });
    else setSearchParams({});
    void load(value || undefined, monthValue);
  };

  const onMonthChange = (value: string) => {
    const next = value || nowMonthValue();
    setMonthValue(next);
    setSelectedDay(null);
    void load(employerFilter || undefined, next);
  };

  const companyOptions = useMemo(() => {
    if (!data) return [];
    return data.employments.map((row) => ({
      id: String(row.employerId),
      label: row.employerProfileId?.companyName || String(row.employerId),
      status: row.status,
      employmentId: row._id,
    }));
  }, [data]);

  const todayKey = useMemo(() => {
    const d = new Date();
    return toDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }, []);

  const calendarCells = useMemo(() => {
    const first = new Date(year, month - 1, 1).getDay();
    const total = daysInMonth(year, month);
    const cells: Array<{ key: string; day: number | null }> = [];
    for (let i = 0; i < first; i += 1) cells.push({ key: `e-${i}`, day: null });
    for (let day = 1; day <= total; day += 1) {
      cells.push({ key: toDateKey(year, month, day), day });
    }
    return cells;
  }, [year, month]);

  const monthTasks = useMemo(
    () =>
      (data?.tasks || []).filter(
        (row) => inSelectedMonth(row.dueDate, year, month) || inSelectedMonth(row.createdAt, year, month),
      ),
    [data, month, year],
  );

  const monthAttendance = useMemo(
    () => (data?.attendance || []).filter((row) => inSelectedMonth(row.date, year, month)),
    [data, month, year],
  );

  const monthSalaries = useMemo(
    () => (data?.salaries || []).filter((row) => row.year === year && row.month === month),
    [data, month, year],
  );

  const monthExpenditures = useMemo(
    () => (data?.expenditures || []).filter((row) => inSelectedMonth(row.transactionDate, year, month)),
    [data, month, year],
  );

  const attendanceByDate = useMemo(() => {
    const map = new Map<string, EmployeeDetail["attendance"]>();
    for (const row of monthAttendance) {
      const key = String(row.date).slice(0, 10);
      const list = map.get(key) || [];
      list.push(row);
      map.set(key, list);
    }
    return map;
  }, [monthAttendance]);

  const attStats = useMemo(() => {
    const rows = monthAttendance;
    let present = 0;
    let absent = 0;
    let half = 0;
    let leave = 0;
    let minutes = 0;
    for (const row of rows) {
      if (row.status === "present") present += 1;
      else if (row.status === "half_day") half += 1;
      else if (row.status === "on_leave") leave += 1;
      else if (row.status === "absent") absent += 1;
      minutes += Number(row.workedMinutes || 0);
    }
    return { present, absent, half, leave, workedHours: formatHours(minutes) };
  }, [monthAttendance]);

  const taskChart = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of monthTasks) {
      map.set(task.status, (map.get(task.status) || 0) + 1);
    }
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [monthTasks]);

  const salaryChart = useMemo(
    () =>
      monthSalaries.map((row) => ({
        label: row.employerProfileId?.companyName || `${row.month}/${row.year}`,
        value: Number(row.netAmount || 0),
      })),
    [monthSalaries],
  );

  const monthFinanceCalc = useMemo(() => {
    let credit = 0;
    let debit = 0;
    for (const tx of monthExpenditures) {
      if (tx.type === "credit") credit += Number(tx.amount || 0);
      else debit += Number(tx.amount || 0);
    }
    return { credit, debit, balance: credit - debit };
  }, [monthExpenditures]);

  const expCategories = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of monthExpenditures) {
      map.set(tx.category, (map.get(tx.category) || 0) + Number(tx.amount || 0));
    }
    return Array.from(map, ([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
  }, [monthExpenditures]);

  const monthLabel = new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  if (error) return <p className="error">{error}</p>;
  if (loading && !data) return <p className="muted">{t("loading")}</p>;
  if (!data) return <p className="muted">{t("noData")}</p>;

  const { employee, counts, finance } = data;
  const monthFinance = monthFinanceCalc;
  const activeEmployment =
    data.employments.find((row) => String(row.employerId) === employerFilter) || employee;
  const selectedRows = selectedDay ? attendanceByDate.get(selectedDay) || [] : [];

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "overview", label: t("overview") },
    { id: "tasks", label: t("tasks"), count: monthTasks.length },
    { id: "attendance", label: t("attendance"), count: monthAttendance.length },
    { id: "salary", label: t("salary"), count: monthSalaries.length },
    { id: "expenditure", label: t("expenditure"), count: monthExpenditures.length },
  ];

  const monthBar = (
    <div className="month-filter">
      <div className="field" style={{ marginBottom: 0 }}>
        <label className="label">{t("monthFilter")}</label>
        <input
          className="input"
          type="month"
          value={monthValue}
          onChange={(e) => onMonthChange(e.target.value)}
        />
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onMonthChange(nowMonthValue())}>
        {t("thisMonth")}
      </button>
      {loading ? <span className="muted">{t("loading")}</span> : null}
    </div>
  );

  return (
    <div className="dash">
      <div className="dash-hero panel">
        <div>
          <p className="eyebrow">{t("employeeDetail")}</p>
          <h2 className="display dash-title">{employee.fullName}</h2>
          <p className="muted">
            {employee.mobile}
            {activeEmployment.designation ? ` · ${activeEmployment.designation}` : ""}
            {activeEmployment.employerProfileId?.companyName
              ? ` · ${activeEmployment.employerProfileId.companyName}`
              : ""}
          </p>
          <div className="row" style={{ marginTop: 10 }}>
            <span className={`badge ${employee.status === "active" ? "ok" : "warn"}`}>
              {employee.status}
            </span>
            <span className="badge">
              {counts.companies} {t("companies")}
            </span>
          </div>
        </div>
        <Link to="/app/employees" className="btn btn-ghost">
          {t("back")}
        </Link>
      </div>

      <div className="panel">
        <div className="row">
          <label className="label" style={{ marginBottom: 0 }}>
            {t("filterByCompany")}
          </label>
          <select
            className="select"
            style={{ maxWidth: 320 }}
            value={employerFilter}
            onChange={(e) => onEmployerChange(e.target.value)}
          >
            <option value="">{t("allCompanies")}</option>
            {companyOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} ({opt.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-4">
        <StatCard label={t("tasks")} value={counts.tasks} tone="accent" />
        <StatCard label={t("attendance")} value={counts.attendance} tone="ok" />
        <StatCard label={t("salary")} value={counts.salaries} />
        <StatCard label={t("expenditure")} value={counts.expenditures} tone="warn" />
      </div>

      {monthBar}

      <div className="tabs">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tab${tab === item.id ? " active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {typeof item.count === "number" ? ` (${item.count})` : ""}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid-2">
          <div className="panel">
            <h3 className="chart-card-title">{t("employeeDetails")}</h3>
            <div className="detail-grid" style={{ marginTop: 12 }}>
              <Detail label={t("name")} value={employee.fullName} />
              <Detail label={t("mobile")} value={employee.mobile} />
              <Detail label={t("employeeCode")} value={employee.employeeCode} />
              <Detail label={t("designation")} value={activeEmployment.designation} />
              <Detail label={t("department")} value={activeEmployment.department} />
              <Detail label={t("joiningDate")} value={fmtDate(activeEmployment.joiningDate)} />
              <Detail
                label={t("baseSalary")}
                value={
                  activeEmployment.baseSalary != null
                    ? formatINR(Number(activeEmployment.baseSalary))
                    : undefined
                }
              />
              <Detail label={t("salaryCycle")} value={activeEmployment.salaryCycle} />
              <Detail
                label={t("site")}
                value={
                  employee.primarySiteId
                    ? [employee.primarySiteId.name, employee.primarySiteId.city]
                        .filter(Boolean)
                        .join(" · ")
                    : undefined
                }
              />
            </div>
          </div>

          <div className="panel">
            <h3 className="chart-card-title">{t("companies")}</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
              {data.employments.map((row) => (
                <li
                  key={row._id}
                  style={{
                    padding: "10px 0",
                    borderBottom: "1px solid var(--line)",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {row.employerProfileId?.companyName || "—"}
                    </div>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {[row.designation, row.employerProfileId?.city].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="row">
                    <span className={`badge ${row.status === "active" ? "ok" : "warn"}`}>
                      {row.status}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => onEmployerChange(String(row.employerId))}
                    >
                      {t("filter")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <h3 className="chart-card-title" style={{ marginTop: 20 }}>
              {t("financeSnapshot")}
            </h3>
            <div className="grid-3" style={{ marginTop: 12 }}>
              <StatCard label={t("expCredit")} value={formatINR(finance.credit)} tone="ok" />
              <StatCard label={t("expDebit")} value={formatINR(finance.debit)} tone="warn" />
              <StatCard label={t("expBalance")} value={formatINR(finance.balance)} />
            </div>
          </div>
        </div>
      )}

      {tab === "tasks" && (
        <div className="dash">
          <div className="grid-2">
            <ChartCard title={t("tasksThisMonth")} subtitle={monthLabel}>
              <UsersPieChart data={taskChart} />
            </ChartCard>
            <div className="grid-2">
              <StatCard label={t("tasks")} value={monthTasks.length} tone="accent" />
              <StatCard
                label="done"
                value={monthTasks.filter((row) => row.status === "done").length}
                tone="ok"
              />
            </div>
          </div>
          <div className="panel">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("taskTitle")}</th>
                  <th>{t("companyName")}</th>
                  <th>{t("status")}</th>
                  <th>{t("priority")}</th>
                  <th>{t("dueDate")}</th>
                </tr>
              </thead>
              <tbody>
                {monthTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5}>{t("noData")}</td>
                  </tr>
                ) : (
                  monthTasks.map((task) => (
                    <tr key={task._id}>
                      <td>{task.title}</td>
                      <td>{task.employerProfileId?.companyName || "—"}</td>
                      <td>
                        <span className="badge">{task.status}</span>
                      </td>
                      <td>{task.priority}</td>
                      <td>{fmtDate(task.dueDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "attendance" && (
        <div className="dash">
          <div className="grid-4">
            <StatCard label={t("attPresent")} value={attStats.present} tone="ok" />
            <StatCard label={t("attAbsent")} value={attStats.absent} tone="warn" />
            <StatCard label={t("halfDay")} value={attStats.half} />
            <StatCard label={t("workedHours")} value={attStats.workedHours} />
          </div>
          <div className="att-layout">
            <div className="panel">
              <div className="att-calendar-head">
                <h3 className="chart-card-title">{monthLabel}</h3>
                <div className="att-legend">
                  <span className="att-legend-item present">{t("attPresent")}</span>
                  <span className="att-legend-item half">{t("halfDay")}</span>
                  <span className="att-legend-item absent">{t("attAbsent")}</span>
                  <span className="att-legend-item leave">{t("onLeave")}</span>
                </div>
              </div>
              <div className="att-weekdays">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="att-weekday">
                    {d}
                  </div>
                ))}
              </div>
              <div className="att-grid">
                {calendarCells.map((cell) => {
                  if (!cell.day) return <div key={cell.key} className="att-day empty" />;
                  const rows = attendanceByDate.get(cell.key) || [];
                  const status = attTone(rows[0]?.status);
                  const hours = rows[0]?.workedMinutes;
                  const future = cell.key > todayKey;
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      className={`att-day ${status}${selectedDay === cell.key ? " selected" : ""}${
                        cell.key === todayKey ? " today" : ""
                      }${future ? " future" : ""}`}
                      onClick={() => setSelectedDay(cell.key)}
                    >
                      <span className="att-day-num">{cell.day}</span>
                      {hours ? <span className="att-day-hours">{formatHours(hours)}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="panel">
              <h3 className="chart-card-title">{selectedDay ? t("dayDetails") : t("pickADay")}</h3>
              <p className="muted chart-card-sub">{selectedDay || t("attendanceCalendarHint")}</p>
              {!selectedDay ? (
                <p className="muted" style={{ marginTop: 16 }}>
                  {t("attendanceClickDay")}
                </p>
              ) : selectedRows.length === 0 ? (
                <p className="muted" style={{ marginTop: 16 }}>
                  {t("noAttendanceOnDay")}
                </p>
              ) : (
                <div className="att-day-list">
                  {selectedRows.map((row) => (
                    <article key={row._id} className="att-day-card">
                      <div className="att-day-meta row" style={{ justifyContent: "space-between" }}>
                        <span className={`badge ${row.status === "present" ? "ok" : "warn"}`}>
                          {t(`attStatus.${row.status}`, { defaultValue: row.status })}
                        </span>
                        <strong>{formatHours(row.workedMinutes)}</strong>
                      </div>
                      <div className="muted" style={{ marginTop: 8, fontSize: "0.82rem" }}>
                        {row.employerProfileId?.companyName || "—"}
                        {row.siteId?.name ? ` · ${row.siteId.name}` : ""}
                      </div>
                      <div className="att-time-row">
                        <div>
                          <div className="label">{t("loginAt")}</div>
                          <div>{formatTime(row.loginAt)}</div>
                        </div>
                        <div>
                          <div className="label">{t("logoutAt")}</div>
                          <div>{formatTime(row.logoutAt)}</div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "salary" && (
        <div className="dash">
          <ChartCard title={t("salaryTrend")} subtitle={monthLabel}>
            <MoneyBarChart data={salaryChart} />
          </ChartCard>
          <div className="panel">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("month")}</th>
                  <th>{t("year")}</th>
                  <th>{t("companyName")}</th>
                  <th>{t("amount")}</th>
                  <th>{t("presentDays")}</th>
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {monthSalaries.length === 0 ? (
                  <tr>
                    <td colSpan={6}>{t("noData")}</td>
                  </tr>
                ) : (
                  monthSalaries.map((row) => (
                    <tr key={row._id}>
                      <td>{row.month}</td>
                      <td>{row.year}</td>
                      <td>{row.employerProfileId?.companyName || "—"}</td>
                      <td>{formatINR(Number(row.netAmount || 0))}</td>
                      <td>{row.presentDays ?? "—"}</td>
                      <td>
                        <span className="badge">{row.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "expenditure" && (
        <div className="dash">
          <div className="grid-3">
            <StatCard label={t("expCredit")} value={formatINR(monthFinance.credit)} tone="ok" />
            <StatCard label={t("expDebit")} value={formatINR(monthFinance.debit)} tone="warn" />
            <StatCard label={t("expBalance")} value={formatINR(monthFinance.balance)} />
          </div>
          <div className="grid-2">
            <ChartCard title={t("expMonthChart")} subtitle={monthLabel}>
              <TypePieChart credit={monthFinance.credit} debit={monthFinance.debit} />
            </ChartCard>
            <ChartCard title={t("expByCategory")} subtitle={monthLabel}>
              <CategoryBarChart data={expCategories} />
            </ChartCard>
          </div>
          <div className="panel">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("date")}</th>
                  <th>{t("companyName")}</th>
                  <th>{t("type")}</th>
                  <th>{t("category")}</th>
                  <th>{t("amount")}</th>
                  <th>{t("description")}</th>
                </tr>
              </thead>
              <tbody>
                {monthExpenditures.length === 0 ? (
                  <tr>
                    <td colSpan={6}>{t("noData")}</td>
                  </tr>
                ) : (
                  monthExpenditures.map((tx) => (
                    <tr key={tx._id}>
                      <td>{fmtDate(tx.transactionDate)}</td>
                      <td>{tx.employerProfileId?.companyName || "—"}</td>
                      <td>
                        <span className={`badge ${tx.type === "credit" ? "ok" : "warn"}`}>{tx.type}</span>
                      </td>
                      <td>{tx.category}</td>
                      <td>{formatINR(Number(tx.amount || 0))}</td>
                      <td>{tx.description || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
