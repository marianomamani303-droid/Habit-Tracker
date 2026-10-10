import DashboardIcon from "./DashboardIcon";

export default function EmptyState({ title, children }) {
  return (
    <div className="dashboard-empty">
      <span className="dashboard-empty-icon">
        <DashboardIcon name="leaf" width="32" height="32" />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
