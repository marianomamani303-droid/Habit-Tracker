export default function ResourceState({ loading, error, onRetry }) {
  if (loading)
    return (
      <div className="habit-loading" role="status">
        <span>Cargando…</span>
        <div className="habit-skeleton" aria-hidden="true" />
        <div className="habit-skeleton" aria-hidden="true" />
      </div>
    );
  if (!error) return null;
  return (
    <div className="dashboard-error" role="alert">
      <p>{error}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}
