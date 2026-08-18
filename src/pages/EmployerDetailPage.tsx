import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { EmployerDetail } from "../lib/types";
import { StatCard, formatINR } from "../components/charts";

type Tab = "overview" | "jobs" | "employees" | "tasks" | "attendance" | "expenditure" | "sites" | "salary";

function fmtDate(value?: string) {
  if (!value) return "—";
  return String(value).slice(0, 10);
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

  useEffect(() => {
    if (!userId) return;
    void api
      .get<ApiSuccess<EmployerDetail>>(`/admin/employers/${userId}`)
      .then(({ data: res }) => setData(res.data))
      .catch((err) => setError(getErrorMessage(err, t("error"))));
  }, [userId, t]);

  if (error) return <p className="error">{error}</p>;
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
            {profile?.description && (
              <p className="muted" style={{ marginTop: 12 }}>
                {profile.description}
              </p>
            )}
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
              {data.employees.length === 0 ? (
                <tr>
                  <td colSpan={6}>{t("noData")}</td>
                </tr>
              ) : (
                data.employees.map((emp) => (
                  <tr key={emp._id}>
                    <td>{emp.fullName}</td>
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
        </div>
      )}

      {tab === "tasks" && (
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
              {data.tasks.length === 0 ? (
                <tr>
                  <td colSpan={5}>{t("noData")}</td>
                </tr>
              ) : (
                data.tasks.map((task) => (
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
        </div>
      )}

      {tab === "attendance" && (
        <div className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>{t("date")}</th>
                <th>{t("name")}</th>
                <th>{t("status")}</th>
                <th>{t("loginAt")}</th>
                <th>{t("logoutAt")}</th>
                <th>{t("workedMinutes")}</th>
              </tr>
            </thead>
            <tbody>
              {data.attendance.length === 0 ? (
                <tr>
                  <td colSpan={6}>{t("noData")}</td>
                </tr>
              ) : (
                data.attendance.map((row) => (
                  <tr key={row._id}>
                    <td>{row.date}</td>
                    <td>{row.employeeId?.fullName || "—"}</td>
                    <td>
                      <span className={`badge ${row.status === "present" ? "ok" : "warn"}`}>{row.status}</span>
                    </td>
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

      {tab === "expenditure" && (
        <div className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>{t("date")}</th>
                <th>{t("type")}</th>
                <th>{t("category")}</th>
                <th>{t("amount")}</th>
                <th>{t("description")}</th>
              </tr>
            </thead>
            <tbody>
              {data.expenditures.length === 0 ? (
                <tr>
                  <td colSpan={5}>{t("noData")}</td>
                </tr>
              ) : (
                data.expenditures.map((tx) => (
                  <tr key={tx._id}>
                    <td>{fmtDate(tx.transactionDate)}</td>
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
          <table className="table">
            <thead>
              <tr>
                <th>{t("month")}</th>
                <th>{t("year")}</th>
                <th>{t("amount")}</th>
                <th>{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {data.salaries.length === 0 ? (
                <tr>
                  <td colSpan={4}>{t("noData")}</td>
                </tr>
              ) : (
                data.salaries.map((row) => (
                  <tr key={row._id}>
                    <td>{row.month}</td>
                    <td>{row.year}</td>
                    <td>{formatINR(Number(row.netAmount || 0))}</td>
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
    </div>
  );
}
