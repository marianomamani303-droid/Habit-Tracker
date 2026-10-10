import { useOutletContext } from "react-router-dom";
import MedalGallery from "../componentes/dashboard/MedalGallery";
import ResourceState from "../componentes/habits/ResourceState";

export default function Logros() {
  const { habits } = useOutletContext();
  return (
    <section className="dashboard-card">
      <p className="dashboard-eyebrow">TU COLECCIÓN DE CONSTANCIA</p>
      <h2>Cada paso merece celebrarse</h2>
      <p className="habit-section-intro">
        Las medallas nacen de tu actividad real. Las rachas respetan los días
        programados; las metas flexibles se cuentan por semanas.
      </p>
      <ResourceState
        loading={habits.status === "loading"}
        error={habits.error}
        onRetry={habits.retry}
      />
      {habits.status === "ready" && <MedalGallery logros={habits.logros} />}
    </section>
  );
}
