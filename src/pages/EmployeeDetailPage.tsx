import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import { StatCard, formatINR } from "../components/charts";

type Tab = "overview" | "tasks" | "attendance" | "salary" | "expenditure";

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
  tasks: Array<{
    _id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string;
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
  salaries: Array<{
    _id: string;
    year: number;
    month: number;
    netAmount: number;
    baseSalary?: number;
    status: string;
    presentDays?: number;
    absentDays?: number;
    employerId: string;
    employerProfileId?: { companyName?: string };
  }>;
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

function fmtDate(value?: string) {
  if (!value) return "—";
  return String(value).slice(0, 10);
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

  const employerFilter = searchParams.get("employerId") || "";

  const load = async (employerId?: string) => {
    if (!employeeId) return;
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {};
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
    void load(employerFilter || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const onEmployerChange = (value: string) => {
    if (value) setSearchParams({ employerId: value });
    else setSearchParams({});
    void load(value || undefined);
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

  if (error) return <p className="error">{error}</p>;
  if (loading && !data) return <p className="muted">{t("loading")}</p>;
  if (!data) return <p className="muted">{t("noData")}</p>;

  const { employee, counts, finance } = data;
  const activeEmployment =
    data.employments.find((row) => String(row.employerId) === employerFilter) || employee;

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "overview", label: t("overview") },
    { id: "tasks", label: t("tasks"), count: data.tasks.length },
    { id: "attendance", label: t("attendance"), count: data.attendance.length },
    { id: "salary", label: t("salary"), count: data.salaries.length },
    { id: "expenditure", label: t("expenditure"), count: data.expenditures.length },
  ];

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
          {loading ? <span className="muted">{t("loading")}</span> : null}
        </div>
      </div>

      <div className="grid-4">
        <StatCard label={t("tasks")} value={counts.tasks} tone="accent" />
        <StatCard label={t("attendance")} value={counts.attendance} tone="ok" />
        <StatCard label={t("salary")} value={counts.salaries} />
        <StatCard label={t("expenditure")} value={counts.expenditures} tone="warn" />
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
              {data.tasks.length === 0 ? (
                <tr>
                  <td colSpan={5}>{t("noData")}</td>
                </tr>
              ) : (
                data.tasks.map((task) => (
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
      )}

      {tab === "attendance" && (
        <div className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>{t("date")}</th>
                <th>{t("companyName")}</th>
                <th>{t("status")}</th>
                <th>{t("site")}</th>
                <th>{t("loginAt")}</th>
                <th>{t("logoutAt")}</th>
                <th>{t("workedMinutes")}</th>
              </tr>
            </thead>
            <tbody>
              {data.attendance.length === 0 ? (
                <tr>
                  <td colSpan={7}>{t("noData")}</td>
                </tr>
              ) : (
                data.attendance.map((row) => (
                  <tr key={row._id}>
                    <td>{row.date}</td>
                    <td>{row.employerProfileId?.companyName || "—"}</td>
                    <td>
                      <span className={`badge ${row.status === "present" ? "ok" : "warn"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>{row.siteId?.name || "—"}</td>
                    <td>{row.loginAt ? new Date(row.loginAt).toLocaleString() : "—"}</td>
                    <td>{row.logoutAt ? new Date(row.logoutAt).toLocaleString() : "—"}</td>
                    <td>{row.workedMinutes ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "salary" && (
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
              {data.salaries.length === 0 ? (
                <tr>
                  <td colSpan={6}>{t("noData")}</td>
                </tr>
              ) : (
                data.salaries.map((row) => (
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
      )}

      {tab === "expenditure" && (
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
              {data.expenditures.length === 0 ? (
                <tr>
                  <td colSpan={6}>{t("noData")}</td>
                </tr>
              ) : (
                data.expenditures.map((tx) => (
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
      )}
    </div>
  );
}
