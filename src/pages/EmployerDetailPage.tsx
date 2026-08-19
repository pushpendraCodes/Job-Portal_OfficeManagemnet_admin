import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { EmployerDetail } from "../lib/types";
import { StatCard, formatINR } from "../components/charts";
import { emptyMeta, metaFromResponse, PAGE_SIZE, Pagination, type PageMeta } from "../components/Pagination";

type Tab = "overview" | "jobs" | "employees" | "tasks" | "attendance" | "expenditure" | "sites" | "salary";

type EmpOption = { _id: string; fullName: string; mobile?: string };

type TaskRow = EmployerDetail["tasks"][number];
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

function nowMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

  const [empQ, setEmpQ] = useState("");
  const [empStatus, setEmpStatus] = useState("all");
  const [empPage, setEmpPage] = useState(1);
  const [empMeta, setEmpMeta] = useState<PageMeta>(emptyMeta());
  const [employees, setEmployees] = useState<EmpRow[]>([]);

  const [taskEmployeeId, setTaskEmployeeId] = useState("all");
  const [taskStatus, setTaskStatus] = useState("all");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPage, setTaskPage] = useState(1);
  const [taskMeta, setTaskMeta] = useState<PageMeta>(emptyMeta());
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  const [attEmployeeId, setAttEmployeeId] = useState("all");
  const [attMonth, setAttMonth] = useState(nowMonthValue());
  const [attDate, setAttDate] = useState("");
  const [attPage, setAttPage] = useState(1);
  const [attMeta, setAttMeta] = useState<PageMeta>(emptyMeta());
  const [attendance, setAttendance] = useState<AttRow[]>([]);

  const [expEmployeeId, setExpEmployeeId] = useState("all");
  const [expMonth, setExpMonth] = useState(nowMonthValue());
  const [expType, setExpType] = useState("all");
  const [expPage, setExpPage] = useState(1);
  const [expMeta, setExpMeta] = useState<PageMeta>(emptyMeta());
  const [expenditures, setExpenditures] = useState<ExpRow[]>([]);

  const [salEmployeeId, setSalEmployeeId] = useState("all");
  const [salMonth, setSalMonth] = useState(nowMonthValue());
  const [salPage, setSalPage] = useState(1);
  const [salMeta, setSalMeta] = useState<PageMeta>(emptyMeta());
  const [salaries, setSalaries] = useState<SalRow[]>([]);

  const monthParts = useCallback((value: string) => {
    const [y, m] = value.split("-");
    return { year: y || "", month: m || "" };
  }, []);

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
    async (
      page = empPage,
      overrides?: Partial<{ q: string; status: string }>,
    ) => {
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
      page = taskPage,
      overrides?: Partial<{ employeeId: string; status: string; dueDate: string }>,
    ) => {
      if (!userId) return;
      const employeeId = overrides?.employeeId ?? taskEmployeeId;
      const status = overrides?.status ?? taskStatus;
      const dueDate = overrides?.dueDate ?? taskDueDate;
      setLoadingTab(true);
      setError("");
      try {
        const params: Record<string, string> = {
          page: String(page),
          limit: String(PAGE_SIZE),
        };
        if (employeeId !== "all") params.employeeId = employeeId;
        if (status !== "all") params.status = status;
        if (dueDate) params.dueDate = dueDate;
        const { data: res } = await api.get<ApiSuccess<TaskRow[]>>(
          `/admin/employers/${userId}/tasks`,
          { params },
        );
        setTasks(res.data);
        setTaskMeta(metaFromResponse(res.meta, res.data.length, page));
        setTaskPage(page);
      } catch (err) {
        setError(getErrorMessage(err, t("error")));
      } finally {
        setLoadingTab(false);
      }
    },
    [t, taskDueDate, taskEmployeeId, taskPage, taskStatus, userId],
  );

  const loadAttendance = useCallback(
    async (
      page = attPage,
      overrides?: Partial<{ employeeId: string; month: string; date: string }>,
    ) => {
      if (!userId) return;
      const employeeId = overrides?.employeeId ?? attEmployeeId;
      const month = overrides?.month ?? attMonth;
      const date = overrides?.date ?? attDate;
      setLoadingTab(true);
      setError("");
      try {
        const params: Record<string, string> = {
          page: String(page),
          limit: String(PAGE_SIZE),
        };
        if (employeeId !== "all") params.employeeId = employeeId;
        if (date) {
          params.date = date;
        } else if (month) {
          const { year, month: m } = monthParts(month);
          if (year && m) {
            params.year = year;
            params.month = String(Number(m));
          }
        }
        const { data: res } = await api.get<ApiSuccess<AttRow[]>>(
          `/admin/employers/${userId}/attendance`,
          { params },
        );
        setAttendance(res.data);
        setAttMeta(metaFromResponse(res.meta, res.data.length, page));
        setAttPage(page);
      } catch (err) {
        setError(getErrorMessage(err, t("error")));
      } finally {
        setLoadingTab(false);
      }
    },
    [attDate, attEmployeeId, attMonth, attPage, monthParts, t, userId],
  );

  const loadExpenditures = useCallback(
    async (
      page = expPage,
      overrides?: Partial<{ employeeId: string; month: string; type: string }>,
    ) => {
      if (!userId) return;
      const employeeId = overrides?.employeeId ?? expEmployeeId;
      const month = overrides?.month ?? expMonth;
      const type = overrides?.type ?? expType;
      setLoadingTab(true);
      setError("");
      try {
        const params: Record<string, string> = {
          page: String(page),
          limit: String(PAGE_SIZE),
        };
        if (employeeId !== "all") params.employeeId = employeeId;
        if (type !== "all") params.type = type;
        if (month) {
          const { year, month: m } = monthParts(month);
          if (year && m) {
            params.year = year;
            params.month = String(Number(m));
          }
        }
        const { data: res } = await api.get<ApiSuccess<ExpRow[]>>(
          `/admin/employers/${userId}/expenditures`,
          { params },
        );
        setExpenditures(res.data);
        setExpMeta(metaFromResponse(res.meta, res.data.length, page));
        setExpPage(page);
      } catch (err) {
        setError(getErrorMessage(err, t("error")));
      } finally {
        setLoadingTab(false);
      }
    },
    [expEmployeeId, expMonth, expPage, expType, monthParts, t, userId],
  );

  const loadSalaries = useCallback(
    async (
      page = salPage,
      overrides?: Partial<{ employeeId: string; month: string }>,
    ) => {
      if (!userId) return;
      const employeeId = overrides?.employeeId ?? salEmployeeId;
      const month = overrides?.month ?? salMonth;
      setLoadingTab(true);
      setError("");
      try {
        const params: Record<string, string> = {
          page: String(page),
          limit: String(PAGE_SIZE),
        };
        if (employeeId !== "all") params.employeeId = employeeId;
        if (month) {
          const { year, month: m } = monthParts(month);
          if (year && m) {
            params.year = year;
            params.month = String(Number(m));
          }
        }
        const { data: res } = await api.get<ApiSuccess<SalRow[]>>(
          `/admin/employers/${userId}/salaries`,
          { params },
        );
        setSalaries(res.data);
        setSalMeta(metaFromResponse(res.meta, res.data.length, page));
        setSalPage(page);
      } catch (err) {
        setError(getErrorMessage(err, t("error")));
      } finally {
        setLoadingTab(false);
      }
    },
    [monthParts, salEmployeeId, salMonth, salPage, t, userId],
  );

  useEffect(() => {
    if (!data || !userId) return;
    if (tab === "employees") void loadEmployees(1);
    if (tab === "tasks") void loadTasks(1);
    if (tab === "attendance") void loadAttendance(1);
    if (tab === "expenditure") void loadExpenditures(1);
    if (tab === "salary") void loadSalaries(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, data, userId]);

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

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "overview", label: t("overview") },
    { id: "jobs", label: t("jobs"), count: counts.jobs },
    { id: "employees", label: t("employees"), count: counts.employees },
    { id: "tasks", label: t("tasks"), count: counts.tasks },
    { id: "attendance", label: t("attendance"), count: counts.attendance },
    { id: "expenditure", label: t("expenditure"), count: counts.expenditures },
    { id: "sites", label: t("sites"), count: counts.sites },
    { id: "salary", label: t("salary") },
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
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={6}>{t("noData")}</td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp._id}>
                    <td>
                      <Link to={`/app/employees/${emp._id}`}>{emp.fullName}</Link>
                    </td>
                    <td>{emp.mobile}</td>
                    <td>{emp.designation || "—"}</td>
                    <td>{emp.department || "—"}</td>
                    <td>
                      <span className={`badge ${emp.status === "active" ? "ok" : "warn"}`}>{emp.status}</span>
                    </td>
                    <td>{fmtDate(emp.joiningDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination meta={empMeta} loading={loadingTab} onPageChange={(p) => void loadEmployees(p)} />
        </div>
      )}

      {tab === "tasks" && (
        <div className="panel">
          <div className="row filter-row">
            <select className="select" value={taskEmployeeId} onChange={(e) => setTaskEmployeeId(e.target.value)}>
              {employeeSelect}
            </select>
            <select className="select" value={taskStatus} onChange={(e) => setTaskStatus(e.target.value)}>
              <option value="all">{t("allStatuses")}</option>
              <option value="todo">todo</option>
              <option value="in_progress">in_progress</option>
              <option value="done">done</option>
              <option value="cancelled">cancelled</option>
            </select>
            <input className="input" type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
            <button type="button" className="btn" disabled={loadingTab} onClick={() => void loadTasks(1)}>
              {t("filter")}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setTaskEmployeeId("all");
                setTaskStatus("all");
                setTaskDueDate("");
                void loadTasks(1, { employeeId: "all", status: "all", dueDate: "" });
              }}
            >
              {t("clearFilters")}
            </button>
          </div>
          {loadingTab ? <p className="muted">{t("loading")}</p> : null}
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
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={5}>{t("noData")}</td>
                </tr>
              ) : (
                tasks.map((task) => (
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
      )}

      {tab === "attendance" && (
        <div className="panel">
          <div className="row filter-row">
            <select className="select" value={attEmployeeId} onChange={(e) => setAttEmployeeId(e.target.value)}>
              {employeeSelect}
            </select>
            <input className="input" type="month" value={attMonth} onChange={(e) => setAttMonth(e.target.value)} />
            <input className="input" type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} />
            <button type="button" className="btn" disabled={loadingTab} onClick={() => void loadAttendance(1)}>
              {t("filter")}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                const month = nowMonthValue();
                setAttEmployeeId("all");
                setAttMonth(month);
                setAttDate("");
                void loadAttendance(1, { employeeId: "all", month, date: "" });
              }}
            >
              {t("thisMonth")}
            </button>
          </div>
          {loadingTab ? <p className="muted">{t("loading")}</p> : null}
          <table className="table">
            <thead>
              <tr>
                <th>{t("date")}</th>
                <th>{t("name")}</th>
                <th>{t("status")}</th>
                <th>{t("loginAt")}</th>
                <th>{t("logoutAt")}</th>
                <th>{t("workedHours")}</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={6}>{t("noData")}</td>
                </tr>
              ) : (
                attendance.map((row) => (
                  <tr key={row._id}>
                    <td>{row.date}</td>
                    <td>{empName(row.employeeId)}</td>
                    <td>
                      <span className={`badge ${row.status === "present" ? "ok" : "warn"}`}>{row.status}</span>
                    </td>
                    <td>{row.loginAt ? new Date(row.loginAt).toLocaleString() : "—"}</td>
                    <td>{row.logoutAt ? new Date(row.logoutAt).toLocaleString() : "—"}</td>
                    <td>{fmtHours(row.workedMinutes)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination meta={attMeta} loading={loadingTab} onPageChange={(p) => void loadAttendance(p)} />
        </div>
      )}

      {tab === "expenditure" && (
        <div className="panel">
          <div className="row filter-row">
            <select className="select" value={expEmployeeId} onChange={(e) => setExpEmployeeId(e.target.value)}>
              {employeeSelect}
            </select>
            <input className="input" type="month" value={expMonth} onChange={(e) => setExpMonth(e.target.value)} />
            <select className="select" value={expType} onChange={(e) => setExpType(e.target.value)}>
              <option value="all">{t("allTypes")}</option>
              <option value="credit">{t("expCredit")}</option>
              <option value="debit">{t("expDebit")}</option>
            </select>
            <button type="button" className="btn" disabled={loadingTab} onClick={() => void loadExpenditures(1)}>
              {t("filter")}
            </button>
          </div>
          {loadingTab ? <p className="muted">{t("loading")}</p> : null}
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
              {expenditures.length === 0 ? (
                <tr>
                  <td colSpan={6}>{t("noData")}</td>
                </tr>
              ) : (
                expenditures.map((tx) => (
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
        <div className="panel">
          <div className="row filter-row">
            <select className="select" value={salEmployeeId} onChange={(e) => setSalEmployeeId(e.target.value)}>
              {employeeSelect}
            </select>
            <input className="input" type="month" value={salMonth} onChange={(e) => setSalMonth(e.target.value)} />
            <button type="button" className="btn" disabled={loadingTab} onClick={() => void loadSalaries(1)}>
              {t("filter")}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                const month = nowMonthValue();
                setSalEmployeeId("all");
                setSalMonth(month);
                void loadSalaries(1, { employeeId: "all", month });
              }}
            >
              {t("thisMonth")}
            </button>
          </div>
          {loadingTab ? <p className="muted">{t("loading")}</p> : null}
          <table className="table">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("month")}</th>
                <th>{t("year")}</th>
                <th>{t("present")}</th>
                <th>{t("amount")}</th>
                <th>{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {salaries.length === 0 ? (
                <tr>
                  <td colSpan={6}>{t("noData")}</td>
                </tr>
              ) : (
                salaries.map((row) => (
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
      )}
    </div>
  );
}
