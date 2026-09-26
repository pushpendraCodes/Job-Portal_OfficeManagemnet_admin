import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { EmployerDetail } from "../lib/types";
import {
  CategoryBarChart,
  ChartCard,
  MoneyBarChart,
  StatCard,
  TypePieChart,
  UsersPieChart,
  formatINR,
} from "../components/charts";
import { emptyMeta, metaFromResponse, PAGE_SIZE, Pagination, type PageMeta } from "../components/Pagination";

type Tab = "overview" | "jobs" | "employees" | "tasks" | "attendance" | "expenditure" | "sites" | "salary";

type EmpOption = { _id: string; fullName: string; mobile?: string };

type TaskRow = EmployerDetail["tasks"][number] & { createdAt?: string };
type AttRow = EmployerDetail["attendance"][number];
type ExpRow = EmployerDetail["expenditures"][number] & {
  employeeId?: { fullName?: string; mobile?: string } | string;
};
type SalRow = EmployerDetail["salaries"][number] & {
  presentDays?: number;
  halfDays?: number;
  absentDays?: number;
  baseSalary?: number;
  employeeId?:
    | string
    | {
        _id?: string;
        fullName?: string;
        mobile?: string;
        designation?: string;
      };
};
type EmpRow = EmployerDetail["employees"][number];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LIMIT = 200;

function nowMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(value: string) {
  const [y, m] = value.split("-").map(Number);
  return { year: y || new Date().getFullYear(), month: m || new Date().getMonth() + 1 };
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function inSelectedMonth(value: string | undefined, year: number, month: number) {
  if (!value) return false;
  return String(value).slice(0, 7) === monthKey(year, month);
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

function fmtHours(minutes?: number) {
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

function attTone(status?: string) {
  if (status === "present") return "present";
  if (status === "half_day") return "half";
  if (status === "on_leave") return "leave";
  if (status === "absent") return "absent";
  return "";
}

function empName(
  value?: string | { fullName?: string; mobile?: string } | null,
  fallback = "—",
) {
  if (!value) return fallback;
  if (typeof value === "string") return fallback;
  return value.fullName || value.mobile || fallback;
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="detail-item">
      <div className="label">{label}</div>
      <div>{value || "—"}</div>
    </div>
  );
}

export default function EmployerDetailPage() {
  const { t } = useTranslation();
  const { userId } = useParams();
  const [data, setData] = useState<EmployerDetail | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState("");
  const [loadingTab, setLoadingTab] = useState(false);

  const [empOptions, setEmpOptions] = useState<EmpOption[]>([]);
  const [monthValue, setMonthValue] = useState(nowMonthValue());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [empQ, setEmpQ] = useState("");
  const [empStatus, setEmpStatus] = useState("all");
  const [empPage, setEmpPage] = useState(1);
  const [empMeta, setEmpMeta] = useState<PageMeta>(emptyMeta());
  const [employees, setEmployees] = useState<EmpRow[]>([]);

  const [taskEmployeeId, setTaskEmployeeId] = useState("all");
  const [taskStatus, setTaskStatus] = useState("all");
  const [taskMeta, setTaskMeta] = useState<PageMeta>(emptyMeta());
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  const [attEmployeeId, setAttEmployeeId] = useState("all");
  const [attendance, setAttendance] = useState<AttRow[]>([]);

  const [expEmployeeId, setExpEmployeeId] = useState("all");
  const [expType, setExpType] = useState("all");
  const [expMeta, setExpMeta] = useState<PageMeta>(emptyMeta());
  const [expenditures, setExpenditures] = useState<ExpRow[]>([]);

  const [salEmployeeId, setSalEmployeeId] = useState("all");
  const [salMeta, setSalMeta] = useState<PageMeta>(emptyMeta());
  const [salaries, setSalaries] = useState<SalRow[]>([]);

  const { year, month } = useMemo(() => parseMonth(monthValue), [monthValue]);

  const monthParams = useCallback(
    (value = monthValue) => {
      const parsed = parseMonth(value);
      return { year: String(parsed.year), month: String(parsed.month) };
    },
    [monthValue],
  );

  useEffect(() => {
    if (!userId) return;
    void api
      .get<ApiSuccess<EmployerDetail>>(`/admin/employers/${userId}`)
      .then(({ data: res }) => {
        setData(res.data);
        setEmpOptions(
          (res.data.employees || []).map((e) => ({
            _id: e._id,
            fullName: e.fullName,
            mobile: e.mobile,
          })),
        );
      })
      .catch((err) => setError(getErrorMessage(err, t("error"))));
  }, [userId, t]);

  const loadEmployees = useCallback(
    async (page = empPage, overrides?: Partial<{ q: string; status: string }>) => {
      if (!userId) return;
      const q = overrides?.q ?? empQ;
      const status = overrides?.status ?? empStatus;
      setLoadingTab(true);
      setError("");
      try {
        const params: Record<string, string> = {
          page: String(page),
          limit: String(PAGE_SIZE),
        };
        if (q.trim()) params.q = q.trim();
        if (status !== "all") params.status = status;
        const { data: res } = await api.get<ApiSuccess<EmpRow[]>>(
          `/admin/employers/${userId}/employees`,
          { params },
        );
        setEmployees(res.data);
        setEmpMeta(metaFromResponse(res.meta, res.data.length, page));
        setEmpPage(page);
      } catch (err) {
        setError(getErrorMessage(err, t("error")));
      } finally {
        setLoadingTab(false);
      }
    },
    [empPage, empQ, empStatus, t, userId],
  );

  const loadTasks = useCallback(
    async (
      page = 1,
      overrides?: Partial<{ employeeId: string; status: string; month: string }>,
    ) => {
      if (!userId) return;
      const employeeId = overrides?.employeeId ?? taskEmployeeId;
      const status = overrides?.status ?? taskStatus;
      const monthVal = overrides?.month ?? monthValue;
      setLoadingTab(true);
      setError("");
      try {
        const params: Record<string, string> = {
          page: String(page),
          limit: String(MONTH_LIMIT),
          ...monthParams(monthVal),
        };
        if (employeeId !== "all") params.employeeId = employeeId;
        if (status !== "all") params.status = status;
        const { data: res } = await api.get<ApiSuccess<TaskRow[]>>(
          `/admin/employers/${userId}/tasks`,
          { params },
        );
        setTasks(res.data);
        setTaskMeta(metaFromResponse(res.meta, res.data.length, page));
      } catch (err) {
        setError(getErrorMessage(err, t("error")));
      } finally {
        setLoadingTab(false);
      }
    },
    [monthParams, monthValue, t, taskEmployeeId, taskStatus, userId],
  );

  const loadAttendance = useCallback(
    async (page = 1, overrides?: Partial<{ employeeId: string; month: string }>) => {
      if (!userId) return;
      const employeeId = overrides?.employeeId ?? attEmployeeId;
      const monthVal = overrides?.month ?? monthValue;
      setLoadingTab(true);
      setError("");
      try {
        const params: Record<string, string> = {
          page: String(page),
          limit: String(MONTH_LIMIT),
          ...monthParams(monthVal),
        };
        if (employeeId !== "all") params.employeeId = employeeId;
        const { data: res } = await api.get<ApiSuccess<AttRow[]>>(
          `/admin/employers/${userId}/attendance`,
          { params },
        );
        setAttendance(res.data);
      } catch (err) {
        setError(getErrorMessage(err, t("error")));
      } finally {
        setLoadingTab(false);
      }
    },
    [attEmployeeId, monthParams, monthValue, t, userId],
  );

  const loadExpenditures = useCallback(
    async (page = 1, overrides?: Partial<{ employeeId: string; month: string; type: string }>) => {
      if (!userId) return;
      const employeeId = overrides?.employeeId ?? expEmployeeId;
      const type = overrides?.type ?? expType;
      const monthVal = overrides?.month ?? monthValue;
      setLoadingTab(true);
      setError("");
      try {
        const params: Record<string, string> = {
          page: String(page),
          limit: String(MONTH_LIMIT),
          ...monthParams(monthVal),
        };
        if (employeeId !== "all") params.employeeId = employeeId;
        if (type !== "all") params.type = type;
        const { data: res } = await api.get<ApiSuccess<ExpRow[]>>(
          `/admin/employers/${userId}/expenditures`,
          { params },
        );
        setExpenditures(res.data);
        setExpMeta(metaFromResponse(res.meta, res.data.length, page));
      } catch (err) {
        setError(getErrorMessage(err, t("error")));
      } finally {
        setLoadingTab(false);
      }
    },
    [expEmployeeId, expType, monthParams, monthValue, t, userId],
  );

  const loadSalaries = useCallback(
    async (page = 1, overrides?: Partial<{ employeeId: string; month: string }>) => {
      if (!userId) return;
      const employeeId = overrides?.employeeId ?? salEmployeeId;
      const monthVal = overrides?.month ?? monthValue;
      setLoadingTab(true);
      setError("");
      try {
        const params: Record<string, string> = {
          page: String(page),
          limit: String(MONTH_LIMIT),
          ...monthParams(monthVal),
        };
        if (employeeId !== "all") params.employeeId = employeeId;
        const { data: res } = await api.get<ApiSuccess<SalRow[]>>(
          `/admin/employers/${userId}/salaries`,
          { params },
        );
        setSalaries(res.data);
        setSalMeta(metaFromResponse(res.meta, res.data.length, page));
      } catch (err) {
        setError(getErrorMessage(err, t("error")));
      } finally {
        setLoadingTab(false);
      }
    },
    [monthParams, monthValue, salEmployeeId, t, userId],
  );

  useEffect(() => {
    if (!data || !userId) return;
    if (tab === "employees") void loadEmployees(1);
    if (tab === "tasks") void loadTasks(1);
    if (tab === "attendance") void loadAttendance(1);
    if (tab === "expenditure") void loadExpenditures(1);
    if (tab === "salary") void loadSalaries(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, data, userId, monthValue]);

  const onMonthChange = (value: string) => {
    const next = value || nowMonthValue();
    setMonthValue(next);
    setSelectedDay(null);
  };

  const monthTasks = useMemo(
    () =>
      tasks.filter(
        (row) => inSelectedMonth(row.dueDate, year, month) || inSelectedMonth(row.createdAt, year, month),
      ),
    [month, tasks, year],
  );

  const monthAttendance = useMemo(
    () => attendance.filter((row) => inSelectedMonth(row.date, year, month)),
    [attendance, month, year],
  );

  const monthExpenditures = useMemo(
    () => expenditures.filter((row) => inSelectedMonth(row.transactionDate, year, month)),
    [expenditures, month, year],
  );

  const monthSalaries = useMemo(
    () => salaries.filter((row) => row.year === year && row.month === month),
    [month, salaries, year],
  );

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
  }, [month, year]);

  const attendanceByDate = useMemo(() => {
    const map = new Map<string, AttRow[]>();
    for (const row of monthAttendance) {
      const key = String(row.date).slice(0, 10);
      const list = map.get(key) || [];
      list.push(row);
      map.set(key, list);
    }
    return map;
  }, [monthAttendance]);

  const attStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let half = 0;
    let minutes = 0;
    for (const row of monthAttendance) {
      if (row.status === "present") present += 1;
      else if (row.status === "half_day") half += 1;
      else if (row.status === "absent") absent += 1;
      minutes += Number(row.workedMinutes || 0);
    }
    return { present, absent, half, workedHours: fmtHours(minutes) };
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
        label: empName(typeof row.employeeId === "object" ? row.employeeId : null, `${row.month}/${row.year}`),
        value: Number(row.netAmount || 0),
      })),
    [monthSalaries],
  );

  const monthFinance = useMemo(() => {
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

  const employeeSelect = useMemo(
    () => (
      <>
        <option value="all">{t("allEmployees")}</option>
        {empOptions.map((e) => (
          <option key={e._id} value={e._id}>
            {e.fullName}
          </option>
        ))}
      </>
    ),
    [empOptions, t],
  );

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">{t("loading")}</p>;

  const { user, profile, counts, finance } = data;
  const company = profile?.companyName || t("employers");
  const selectedRows = selectedDay ? attendanceByDate.get(selectedDay) || [] : [];
  const monthlyTab = tab === "tasks" || tab === "attendance" || tab === "expenditure" || tab === "salary";

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "overview", label: t("overview") },
    { id: "jobs", label: t("jobs"), count: counts.jobs },
    { id: "employees", label: t("employees"), count: counts.employees },
    { id: "tasks", label: t("tasks"), count: monthTasks.length },
    { id: "attendance", label: t("attendance"), count: monthAttendance.length },
    { id: "expenditure", label: t("expenditure"), count: monthExpenditures.length },
    { id: "sites", label: t("sites"), count: counts.sites },
    { id: "salary", label: t("salary"), count: monthSalaries.length },
  ];

  return (
    <div className="dash">
      <div className="dash-hero panel">
        <div>
          <p className="eyebrow">{t("employerDetail")}</p>
          <h2 className="display dash-title">{company}</h2>
          <p className="muted">
            {profile?.ownerName || "—"} · {user.mobile || "—"} · {profile?.city || "—"}
          </p>
          <div className="row" style={{ marginTop: 10 }}>
            <span className={`badge ${user.status === "active" ? "ok" : "warn"}`}>{user.status}</span>
            {profile?.industryType && <span className="badge">{profile.industryType}</span>}
            {profile?.isOfficeEnabled && <span className="badge ok">{t("officeEnabled")}</span>}
          </div>
        </div>
        <div className="row">
          <Link to={`/app/employers/${userId}/edit`} className="btn">
            {t("edit")}
          </Link>
          <Link to="/app/employers" className="btn btn-ghost">
            {t("back")}
          </Link>
        </div>
      </div>

      <div className="grid-4">
        <StatCard label={t("jobs")} value={counts.jobs} tone="accent" />
        <StatCard label={t("employees")} value={counts.employees} tone="ok" />
        <StatCard label={t("tasks")} value={counts.tasks} />
        <StatCard label={t("attendance")} value={counts.attendance} tone="warn" />
      </div>

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

      {monthlyTab ? (
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
          {loadingTab ? <span className="muted">{t("loading")}</span> : null}
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      {tab === "overview" && (
        <div className="grid-2">
          <div className="panel">
            <h3 className="chart-card-title">{t("companyDetails")}</h3>
            <div className="detail-grid" style={{ marginTop: 12 }}>
              <Detail label={t("companyName")} value={profile?.companyName} />
              <Detail label={t("ownerName")} value={profile?.ownerName} />
              <Detail label={t("mobile")} value={user.mobile} />
              <Detail label={t("contactMobile")} value={profile?.contactMobile} />
              <Detail label={t("contactEmail")} value={profile?.contactEmail} />
              <Detail label="GST" value={profile?.gstNumber} />
              <Detail label="PAN" value={profile?.panNumber} />
              <Detail label={t("industryType")} value={profile?.industryType} />
              <Detail label={t("employeeCount")} value={profile?.employeeCount} />
              <Detail label={t("website")} value={profile?.website} />
              <Detail label={t("city")} value={profile?.city} />
              <Detail label={t("state")} value={profile?.state} />
              <Detail label={t("pincode")} value={profile?.pincode} />
              <Detail label={t("address")} value={profile?.address || profile?.addressLine1} />
            </div>
          </div>
          <div className="panel">
            <h3 className="chart-card-title">{t("financeSnapshot")}</h3>
            <div className="grid-3" style={{ marginTop: 12 }}>
              <StatCard label={t("expCredit")} value={formatINR(finance.credit)} tone="ok" />
              <StatCard label={t("expDebit")} value={formatINR(finance.debit)} tone="warn" />
              <StatCard label={t("expBalance")} value={formatINR(finance.balance)} />
            </div>
            <div className="detail-grid" style={{ marginTop: 16 }}>
              <Detail label={t("sites")} value={counts.sites} />
              <Detail label={t("expenditure")} value={counts.expenditures} />
              <Detail label={t("createdAt")} value={fmtDate(user.createdAt)} />
            </div>
          </div>
        </div>
      )}

      {tab === "jobs" && (
        <div className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>{t("titleEn")}</th>
                <th>{t("city")}</th>
                <th>{t("status")}</th>
                <th>{t("createdAt")}</th>
              </tr>
            </thead>
            <tbody>
              {data.jobs.length === 0 ? (
                <tr>
                  <td colSpan={4}>{t("noData")}</td>
                </tr>
              ) : (
                data.jobs.map((job) => (
                  <tr key={job._id}>
                    <td>{job.titleEn}</td>
                    <td>{job.city}</td>
                    <td>
                      <span className={`badge ${job.status === "published" ? "ok" : "warn"}`}>{job.status}</span>
                    </td>
                    <td>{fmtDate(job.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "employees" && (
        <div className="panel">
          <div className="row filter-row">
            <input
              className="input"
              value={empQ}
              placeholder={t("search")}
              onChange={(e) => setEmpQ(e.target.value)}
            />
            <select className="select" value={empStatus} onChange={(e) => setEmpStatus(e.target.value)}>
              <option value="all">{t("allStatuses")}</option>
              <option value="active">{t("userStatus.active")}</option>
              <option value="inactive">{t("userStatus.inactive")}</option>
            </select>
            <button type="button" className="btn" disabled={loadingTab} onClick={() => void loadEmployees(1)}>
              {t("filter")}
            </button>
          </div>
          {loadingTab ? <p className="muted">{t("loading")}</p> : null}
          <table className="table">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("mobile")}</th>
                <th>{t("designation")}</th>
                <th>{t("department")}</th>
                <th>{t("status")}</th>
                <th>{t("joiningDate")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7}>{t("noData")}</td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp._id}>
                    <td>{emp.fullName}</td>
                    <td>{emp.mobile}</td>
                    <td>{emp.designation || "—"}</td>
                    <td>{emp.department || "—"}</td>
                    <td>
                      <span className={`badge ${emp.status === "active" ? "ok" : "warn"}`}>{emp.status}</span>
                    </td>
                    <td>{fmtDate(emp.joiningDate)}</td>
                    <td>
                      <Link to={`/app/employees/${emp._id}`} className="btn btn-ghost">
                        {t("view")}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination meta={empMeta} loading={loadingTab} onPageChange={(p) => void loadEmployees(p)} />
        </div>
      )}

      {tab === "tasks" && (
        <div className="dash">
          <div className="row filter-row">
            <select
              className="select"
              value={taskEmployeeId}
              onChange={(e) => {
                setTaskEmployeeId(e.target.value);
                void loadTasks(1, { employeeId: e.target.value });
              }}
            >
              {employeeSelect}
            </select>
            <select
              className="select"
              value={taskStatus}
              onChange={(e) => {
                setTaskStatus(e.target.value);
                void loadTasks(1, { status: e.target.value });
              }}
            >
              <option value="all">{t("allStatuses")}</option>
              <option value="todo">todo</option>
              <option value="in_progress">in_progress</option>
              <option value="done">done</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>
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
                  <th>{t("status")}</th>
                  <th>{t("priority")}</th>
                  <th>{t("assignees")}</th>
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
                      <td>
                        <span className="badge">{task.status}</span>
                      </td>
                      <td>{task.priority}</td>
                      <td>
                        {(task.assignedToEmployeeIds || [])
                          .map((a) => a.fullName)
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>
                      <td>{fmtDate(task.dueDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination meta={taskMeta} loading={loadingTab} onPageChange={(p) => void loadTasks(p)} />
          </div>
        </div>
      )}

      {tab === "attendance" && (
        <div className="dash">
          <div className="row filter-row">
            <select
              className="select"
              value={attEmployeeId}
              onChange={(e) => {
                setAttEmployeeId(e.target.value);
                void loadAttendance(1, { employeeId: e.target.value });
              }}
            >
              {employeeSelect}
            </select>
          </div>
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
                  const hours = rows.reduce((sum, row) => sum + Number(row.workedMinutes || 0), 0);
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
                      {hours ? <span className="att-day-hours">{fmtHours(hours)}</span> : null}
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
                      <p className="att-emp-name" style={{ margin: "0 0 8px", fontWeight: 650 }}>
                        {empName(row.employeeId)}
                      </p>
                      <div className="row" style={{ justifyContent: "space-between" }}>
                        <span className={`badge ${row.status === "present" ? "ok" : "warn"}`}>
                          {t(`attStatus.${row.status}`, { defaultValue: row.status })}
                        </span>
                        <strong>{fmtHours(row.workedMinutes)}</strong>
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

      {tab === "expenditure" && (
        <div className="dash">
          <div className="row filter-row">
            <select
              className="select"
              value={expEmployeeId}
              onChange={(e) => {
                setExpEmployeeId(e.target.value);
                void loadExpenditures(1, { employeeId: e.target.value });
              }}
            >
              {employeeSelect}
            </select>
            <select
              className="select"
              value={expType}
              onChange={(e) => {
                setExpType(e.target.value);
                void loadExpenditures(1, { type: e.target.value });
              }}
            >
              <option value="all">{t("allTypes")}</option>
              <option value="credit">{t("expCredit")}</option>
              <option value="debit">{t("expDebit")}</option>
            </select>
          </div>
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
                  <th>{t("type")}</th>
                  <th>{t("category")}</th>
                  <th>{t("amount")}</th>
                  <th>{t("name")}</th>
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
                      <td>
                        <span className={`badge ${tx.type === "credit" ? "ok" : "warn"}`}>{tx.type}</span>
                      </td>
                      <td>{tx.category}</td>
                      <td>{formatINR(Number(tx.amount || 0))}</td>
                      <td>{empName(typeof tx.employeeId === "object" ? tx.employeeId : null)}</td>
                      <td>{tx.description || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination meta={expMeta} loading={loadingTab} onPageChange={(p) => void loadExpenditures(p)} />
          </div>
        </div>
      )}

      {tab === "sites" && (
        <div className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("city")}</th>
                <th>{t("address")}</th>
                <th>{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {data.sites.length === 0 ? (
                <tr>
                  <td colSpan={4}>{t("noData")}</td>
                </tr>
              ) : (
                data.sites.map((site) => (
                  <tr key={site._id}>
                    <td>
                      {site.name} {site.isPrimary ? <span className="badge ok">primary</span> : null}
                    </td>
                    <td>{site.city || "—"}</td>
                    <td>{site.address || "—"}</td>
                    <td>
                      <span className={`badge ${site.isActive ? "ok" : "warn"}`}>
                        {site.isActive ? "active" : "inactive"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "salary" && (
        <div className="dash">
          <div className="row filter-row">
            <select
              className="select"
              value={salEmployeeId}
              onChange={(e) => {
                setSalEmployeeId(e.target.value);
                void loadSalaries(1, { employeeId: e.target.value });
              }}
            >
              {employeeSelect}
            </select>
          </div>
          <ChartCard title={t("salaryTrend")} subtitle={monthLabel}>
            <MoneyBarChart data={salaryChart} />
          </ChartCard>
          <div className="panel">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("name")}</th>
                  <th>{t("month")}</th>
                  <th>{t("year")}</th>
                  <th>{t("presentDays")}</th>
                  <th>{t("amount")}</th>
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
                      <td>{empName(typeof row.employeeId === "object" ? row.employeeId : null)}</td>
                      <td>{row.month}</td>
                      <td>{row.year}</td>
                      <td>{row.presentDays ?? "—"}</td>
                      <td>{formatINR(Number(row.netAmount || 0))}</td>
                      <td>
                        <span className="badge">{row.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination meta={salMeta} loading={loadingTab} onPageChange={(p) => void loadSalaries(p)} />
          </div>
        </div>
      )}
    </div>
  );
}
