import { useTranslation } from "react-i18next";

export type PageMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const PAGE_SIZE = 10;

export const emptyMeta = (page = 1, limit = PAGE_SIZE): PageMeta => ({
  total: 0,
  page,
  limit,
  totalPages: 1,
});

export function metaFromResponse(
  meta: PageMeta | undefined,
  itemCount: number,
  page: number,
  limit = PAGE_SIZE,
): PageMeta {
  return {
    total: meta?.total ?? itemCount,
    page: meta?.page ?? page,
    limit: meta?.limit ?? limit,
    totalPages: meta?.totalPages ?? Math.max(1, Math.ceil((meta?.total ?? itemCount) / limit)),
  };
}

type Props = {
  meta: PageMeta;
  loading?: boolean;
  onPageChange: (page: number) => void;
};

export function Pagination({ meta, loading, onPageChange }: Props) {
  const { t } = useTranslation();
  if (meta.totalPages <= 1 && meta.total <= meta.limit) {
    return meta.total > 0 ? (
      <div className="pagination">
        <span className="muted">{t("pageOf", { page: meta.page, total: meta.totalPages, count: meta.total })}</span>
      </div>
    ) : null;
  }

  return (
    <div className="pagination">
      <span className="muted">
        {t("pageOf", { page: meta.page, total: meta.totalPages, count: meta.total })}
      </span>
      <div className="row">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={meta.page <= 1 || loading}
          onClick={() => onPageChange(meta.page - 1)}
        >
          {t("previous")}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={meta.page >= meta.totalPages || loading}
          onClick={() => onPageChange(meta.page + 1)}
        >
          {t("next")}
        </button>
      </div>
    </div>
  );
}
