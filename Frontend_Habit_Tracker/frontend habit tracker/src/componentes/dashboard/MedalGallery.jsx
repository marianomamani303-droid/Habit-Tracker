import DashboardIcon from "./DashboardIcon";

export default function MedalGallery({ logros = [], compact = false }) {
  const medals = compact
    ? logros.filter((m) => m.desbloqueado_en).slice(-3)
    : logros;
  if (!medals.length)
    return (
      <p className="habit-muted">
        Tu primera medalla empieza con un hábito completado. Cada paso deja una
        huella.
      </p>
    );
  return (
    <div className={`habit-medals ${compact ? "is-compact" : ""}`}>
      {medals.map((medal) => (
        <article
          key={medal.codigo}
          className={`habit-medal ${medal.desbloqueado_en ? "is-unlocked" : ""} ${medal.nuevo ? "is-new" : ""}`}
        >
          <span className="habit-medal-seal">
            <DashboardIcon name={medal.icono} width={32} height={32} />
          </span>
          <div>
            <h3>{medal.nombre}</h3>
            <p>{medal.descripcion}</p>
            {medal.desbloqueado_en ? (
              <time dateTime={medal.desbloqueado_en}>
                Obtenida el{" "}
                {new Intl.DateTimeFormat("es-AR").format(
                  new Date(medal.desbloqueado_en),
                )}
              </time>
            ) : (
              <>
                <progress
                  value={medal.progreso}
                  max={medal.objetivo}
                  aria-label={`Progreso de ${medal.nombre}`}
                />
                <small>
                  {medal.progreso} / {medal.objetivo} · Por descubrir
                </small>
              </>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
