import { Link } from "react-router-dom";
import HabitCard from "../habits/HabitCard";
import ResourceState from "../habits/ResourceState";

export default function HabitsToday({ habitos, status, error, retry, fecha }) {
  if (status === "loading" || status === "error") {
    return (
      <ResourceState
        loading={status === "loading"}
        error={error}
        onRetry={retry}
      />
    );
  }
  return (
    <div className="habit-list">
      {habitos.length ? (
        habitos.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            date={fecha}
            onChange={retry}
          />
        ))
      ) : (
        <p>No hay hábitos programados para hoy.</p>
      )}
      <Link className="dashboard-text-link" to="/dashboard/habitos/nuevo">
        Crear un hábito →
      </Link>
    </div>
  );
}
