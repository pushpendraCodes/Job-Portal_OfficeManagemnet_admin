import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import {
  ChartCard,
  JobsBarChart,
  RegistrationAreaChart,
  StatCard,
  UsersPieChart,
} from "../components/charts";

interface DashboardStats {
  employers: number;
  seekers: number;
  officeEmployees: number;
  jobsPublished: number;
  jobsPending: number;
  pendingUsers: number;
  usersBreakdown: Array<{ name: string; value: number }>;
  jobsByStatus: Array<{ status: string; count: number }>;
  registrationTrend: Array<{ month: string; employers: number; seekers: number }>;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api
      .get<ApiSuccess<DashboardStats>>("/admin/dashboard")
      .then(({ data }) => setStats(data.data))
      .catch((err) => setError(getErrorMessage(err, t("error"))));
  }, [t]);

  const userPie = useMemo(() => {
    if (!stats?.usersBreakdown) return [];
    const labels: Record<string, string> = {
      employers: t("employers"),
      seekers: t("seekers"),
      officeEmployees: t("employees"),
    };
    return stats.usersBreakdown.map((row) => ({
      name: labels[row.name] || row.name,
      value: row.value,
    }));
  }, [stats, t]);

  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p className="muted">{t("loading")}</p>;

  return (
    <div className="dash">
      <div className="dash-hero panel">
        <div>
          <p className="eyebrow">{t("dashboard")}</p>
          <h2 className="display dash-title">{t("dashWelcome")}</h2>
          <p className="muted">{t("dashWelcomeSub")}</p>
        </div>
        <div className="dash-hero-stats">
          <div>
            <div className="label">{t("jobsPublished")}</div>
            <div className="display">{stats.jobsPublished}</div>
          </div>
          <div>
            <div className="label">{t("jobsPending")}</div>
            <div className="display">{stats.jobsPending}</div>
          </div>
        </div>
      </div>

      <div className="grid-4">
        <StatCard label={t("employers")} value={stats.employers} tone="accent" />
        <StatCard label={t("seekers")} value={stats.seekers} tone="ok" />
        <StatCard label={t("employees")} value={stats.officeEmployees} />
        <StatCard label={t("pendingUsers")} value={stats.pendingUsers} tone="warn" />
      </div>

      <div className="grid-2">
        <ChartCard title={t("chartRegistrations")} subtitle={t("chartRegistrationsSub")}>
          <RegistrationAreaChart data={stats.registrationTrend} />
        </ChartCard>
        <ChartCard title={t("chartUsers")} subtitle={t("chartUsersSub")}>
          <UsersPieChart data={userPie} />
        </ChartCard>
      </div>

      <ChartCard title={t("chartJobs")} subtitle={t("chartJobsSub")}>
        <JobsBarChart data={stats.jobsByStatus} />
      </ChartCard>
    </div>
  );
}
