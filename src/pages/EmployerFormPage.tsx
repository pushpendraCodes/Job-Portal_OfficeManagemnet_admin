import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type ApiSuccess } from "../lib/api";
import type { EmployerDetail, EmployerProfile } from "../lib/types";

type FormState = {
  mobile: string;
  status: string;
  preferredLocale: "en" | "hi";
  companyName: string;
  companyNameHi: string;
  ownerName: string;
  gstNumber: string;
  panNumber: string;
  companyType: string;
  employeeCount: string;
  establishedYear: string;
  contactPersonName: string;
  contactDesignation: string;
  contactEmail: string;
  contactMobile: string;
  altMobile: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  industryType: string;
  website: string;
  description: string;
  isOfficeEnabled: boolean;
};

const emptyForm = (): FormState => ({
  mobile: "",
  status: "active",
  preferredLocale: "en",
  companyName: "",
  companyNameHi: "",
  ownerName: "",
  gstNumber: "",
  panNumber: "",
  companyType: "",
  employeeCount: "",
  establishedYear: "",
  contactPersonName: "",
  contactDesignation: "",
  contactEmail: "",
  contactMobile: "",
  altMobile: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  district: "",
  state: "",
  pincode: "",
  industryType: "hosiery",
  website: "",
  description: "",
  isOfficeEnabled: true,
});

function profileToForm(user: { mobile?: string; status?: string; preferredLocale?: string }, profile: EmployerProfile | null): FormState {
  return {
    ...emptyForm(),
    mobile: user.mobile || "",
    status: user.status || "active",
    preferredLocale: (user.preferredLocale as "en" | "hi") || "en",
    companyName: profile?.companyName || "",
    companyNameHi: profile?.companyNameHi || "",
    ownerName: profile?.ownerName || "",
    gstNumber: profile?.gstNumber || "",
    panNumber: profile?.panNumber || "",
    companyType: profile?.companyType || "",
    employeeCount: profile?.employeeCount || "",
    establishedYear: profile?.establishedYear ? String(profile.establishedYear) : "",
    contactPersonName: profile?.contactPersonName || "",
    contactDesignation: profile?.contactDesignation || "",
    contactEmail: profile?.contactEmail || "",
    contactMobile: profile?.contactMobile || "",
    altMobile: profile?.altMobile || "",
    addressLine1: profile?.addressLine1 || profile?.address || "",
    addressLine2: profile?.addressLine2 || "",
    city: profile?.city || "",
    district: profile?.district || "",
    state: profile?.state || "",
    pincode: profile?.pincode || "",
    industryType: profile?.industryType || "hosiery",
    website: profile?.website || "",
    description: profile?.description || "",
    isOfficeEnabled: profile?.isOfficeEnabled ?? true,
  };
}

export default function EmployerFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useParams();
  const isEdit = Boolean(userId);

  const [form, setForm] = useState<FormState>(emptyForm());
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    void api
      .get<ApiSuccess<EmployerDetail>>(`/admin/employers/${userId}`)
      .then(({ data }) => {
        setForm(profileToForm(data.data.user, data.data.profile));
      })
      .catch((err) => setError(getErrorMessage(err, t("error"))))
      .finally(() => setLoading(false));
  }, [userId, t]);

  const set = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        mobile: form.mobile.replace(/\D/g, "").slice(0, 10),
        status: form.status,
        preferredLocale: form.preferredLocale,
        companyName: form.companyName.trim(),
        companyNameHi: form.companyNameHi.trim() || undefined,
        ownerName: form.ownerName.trim(),
        gstNumber: form.gstNumber.trim() || undefined,
        panNumber: form.panNumber.trim() || undefined,
        companyType: form.companyType.trim() || undefined,
        employeeCount: form.employeeCount.trim() || undefined,
        establishedYear: form.establishedYear ? Number(form.establishedYear) : undefined,
        contactPersonName: form.contactPersonName.trim() || undefined,
        contactDesignation: form.contactDesignation.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactMobile: form.contactMobile.replace(/\D/g, "").slice(0, 10) || undefined,
        altMobile: form.altMobile.replace(/\D/g, "").slice(0, 10) || undefined,
        addressLine1: form.addressLine1.trim() || undefined,
        addressLine2: form.addressLine2.trim() || undefined,
        address: [form.addressLine1, form.addressLine2].filter(Boolean).join(", ") || undefined,
        city: form.city.trim() || undefined,
        district: form.district.trim() || undefined,
        state: form.state.trim() || undefined,
        pincode: form.pincode.trim() || undefined,
        industryType: form.industryType.trim() || "hosiery",
        website: form.website.trim() || undefined,
        description: form.description.trim() || undefined,
        isOfficeEnabled: form.isOfficeEnabled,
        country: "India",
      };

      if (isEdit && userId) {
        await api.patch(`/admin/employers/${userId}`, payload);
        navigate(`/app/employers/${userId}`);
      } else {
        const { data } = await api.post<ApiSuccess<{ user: { _id?: string; id?: string } }>>(
          "/admin/employers",
          payload,
        );
        const id = data.data.user.id || data.data.user._id;
        navigate(id ? `/app/employers/${id}` : "/app/employers");
      }
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
      setSaving(false);
    }
  };

  if (loading) return <p className="muted">{t("loading")}</p>;

  return (
    <div className="dash">
      <div className="dash-hero panel">
        <div>
          <p className="eyebrow">{t("employers")}</p>
          <h2 className="display dash-title">{isEdit ? t("editEmployer") : t("addEmployer")}</h2>
          <p className="muted">{isEdit ? t("editEmployerSub") : t("addEmployerSub")}</p>
        </div>
        <Link to={isEdit && userId ? `/app/employers/${userId}` : "/app/employers"} className="btn btn-ghost">
          {t("back")}
        </Link>
      </div>

      {error && <p className="error">{error}</p>}

      <form className="panel" onSubmit={(e) => void submit(e)}>
        <div className="form-grid">
          <div className="field">
            <label className="label">{t("mobile")} *</label>
            <input className="input" value={form.mobile} maxLength={10} required onChange={(e) => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))} />
          </div>
          <div className="field">
            <label className="label">{t("status")}</label>
            <select className="select" value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="pending">pending</option>
              {isEdit && <option value="suspended">suspended</option>}
            </select>
          </div>
          <div className="field">
            <label className="label">{t("companyName")} *</label>
            <input className="input" value={form.companyName} required onChange={(e) => set("companyName", e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{t("ownerName")} *</label>
            <input className="input" value={form.ownerName} required onChange={(e) => set("ownerName", e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{t("city")}</label>
            <input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{t("state")}</label>
            <input className="input" value={form.state} onChange={(e) => set("state", e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{t("contactMobile")}</label>
            <input className="input" value={form.contactMobile} maxLength={10} onChange={(e) => set("contactMobile", e.target.value.replace(/\D/g, "").slice(0, 10))} />
          </div>
          <div className="field">
            <label className="label">{t("contactEmail")}</label>
            <input className="input" type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
          </div>
          <div className="field">
            <label className="label">GST</label>
            <input className="input" value={form.gstNumber} onChange={(e) => set("gstNumber", e.target.value)} />
          </div>
          <div className="field">
            <label className="label">PAN</label>
            <input className="input" value={form.panNumber} onChange={(e) => set("panNumber", e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{t("industryType")}</label>
            <input className="input" value={form.industryType} onChange={(e) => set("industryType", e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{t("employeeCount")}</label>
            <input className="input" value={form.employeeCount} onChange={(e) => set("employeeCount", e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{t("pincode")}</label>
            <input className="input" value={form.pincode} maxLength={6} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} />
          </div>
          <div className="field">
            <label className="label">{t("website")}</label>
            <input className="input" value={form.website} onChange={(e) => set("website", e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label className="label">{t("address")}</label>
          <input className="input" value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} />
        </div>
        <div className="field">
          <label className="label">{t("description")}</label>
          <textarea className="textarea" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>

        <label className="row" style={{ marginBottom: 16 }}>
          <input type="checkbox" checked={form.isOfficeEnabled} onChange={(e) => set("isOfficeEnabled", e.target.checked)} />
          <span>{t("officeEnabled")}</span>
        </label>

        <div className="row">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? t("loading") : t("save")}
          </button>
          <Link to="/app/employers" className="btn btn-ghost">
            {t("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
