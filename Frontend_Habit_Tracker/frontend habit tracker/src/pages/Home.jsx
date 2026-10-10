import { Link } from "react-router-dom";
import OrbitVisual from "../componentes/visual/OrbitVisual";
import DashboardIcon from "../componentes/dashboard/DashboardIcon";
import BrandMark from "../componentes/visual/BrandMark";
import { useAuth } from "../hooks/useAuth";
import "../css/home.css";

const features = [
  {
    icon: "habits",
    number: "01",
    title: "Diseñá tu ritmo.",
    text: "Hábitos diarios, semanales o a tu medida. Objetivos claros y pequeños pasos para avanzar.",
  },
  {
    icon: "stats",
    number: "02",
    title: "Hacé visible el cambio.",
    text: "Un calendario de tu constancia. Estadísticas que conectan cada día con tu recorrido.",
  },
  {
    icon: "medal",
    number: "03",
    title: "Celebrá lo que lográs.",
    text: "Cada objetivo alcanzado cuenta. Rachas y medallas para reconocer tus avances reales.",
  },
];

export default function Home() {
  const { status } = useAuth();
  const authenticated = status === "authenticated";
  return (
    <main className="inicio">
      <section className="contenedor inicio-hero" aria-labelledby="home-title">
        <div className="inicio-hero-copy reveal-surface">
          <span className="inicio-badge">
            <span /> TU SIGUIENTE VERSIÓN EMPIEZA HOY
          </span>
          <p className="inicio-brand-label">
            MENOS PILOTO AUTOMÁTICO. MÁS INTENCIÓN.
          </p>
          <h1 id="home-title">
            Pequeños hábitos.
            <br />
            <span>Un nuevo universo.</span>
          </h1>
          <p className="inicio-descripcion">
            Dale una órbita a lo que importa. Creá tu rutina, descubrí tu
            progreso y convertí cada pequeño paso en constancia.
          </p>
          <div className="inicio-acciones">
            <Link
              className="boton"
              to={authenticated ? "/dashboard" : "/Registro"}
            >
              {authenticated ? "Ir a mi Dashboard" : "Crear mi cuenta"}{" "}
              <span aria-hidden="true">↗</span>
            </Link>
            <a className="inicio-explore" href="#como-funciona">
              Explorar Habitly <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="inicio-caption">
            <span className="inicio-caption-line" /> TU RITMO. TU RECORRIDO. TU
            ESPACIO.
          </div>
        </div>
        <div className="inicio-artwork">
          <div className="inicio-artwork-heading">
            <span>HABITLY / ORBIT</span>
            <span>✦</span>
          </div>
          <OrbitVisual />
          <div className="inicio-artwork-footer">
            <span>
              Un paso conecta
              <br />
              <strong>con el siguiente.</strong>
            </span>
            <span className="inicio-artwork-coordinate" aria-hidden="true">
              ↗<br />
              EN MOVIMIENTO
            </span>
          </div>
        </div>
      </section>
      <div className="inicio-strip" aria-label="Tu recorrido">
        <span>FOCO</span>
        <span aria-hidden="true">✦</span>
        <span>RITMO</span>
        <span aria-hidden="true">✦</span>
        <span>CONSTANCIA</span>
        <span aria-hidden="true">✦</span>
        <span>A TU MANERA</span>
      </div>
      <section
        className="contenedor inicio-features"
        aria-labelledby="features-title"
      >
        <div className="inicio-section-heading">
          <p className="dashboard-eyebrow">DISEÑADO PARA TU DÍA A DÍA</p>
          <h2 id="features-title">
            Un espacio para
            <br />
            <span>tu próximo paso.</span>
          </h2>
          <p>
            La motivación te pone en movimiento.
            <br />
            Una rutina te ayuda a seguir.
          </p>
        </div>
        <div className="inicio-feature-grid">
          {features.map((feature) => (
            <article
              className="inicio-feature reveal-surface"
              key={feature.number}
            >
              <div className="inicio-feature-top">
                <DashboardIcon name={feature.icon} width={28} height={28} />
                <span>{feature.number} /</span>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
              <span className="inicio-feature-arrow" aria-hidden="true">
                ↗
              </span>
            </article>
          ))}
        </div>
      </section>
      <section
        className="contenedor inicio-method"
        id="como-funciona"
        aria-labelledby="method-title"
      >
        <div>
          <p className="dashboard-eyebrow">DE LA INTENCIÓN A LA ACCIÓN</p>
          <h2 id="method-title">
            Tu rutina,
            <br />
            <span>en tres movimientos.</span>
          </h2>
          <p>
            No necesitás cambiarlo todo.
            <br />
            Empezá con algo que quieras cuidar.
          </p>
        </div>
        <ol className="inicio-steps">
          <li>
            <span>01</span>
            <div>
              <h3>Elegí tu intención</h3>
              <p>
                Creá un hábito y definí un objetivo que tenga sentido para vos.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Encontrá tu frecuencia</h3>
              <p>
                Elegí cuándo hacerlo. Organizá sus pasos y tus recordatorios.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Seguí tu trayectoria</h3>
              <p>
                Registrá cada avance y reconocé la constancia que estás
                construyendo.
              </p>
            </div>
          </li>
        </ol>
      </section>
      <section className="contenedor inicio-close">
        <div className="inicio-close-panel">
          <span aria-hidden="true">✦</span>
          <p className="dashboard-eyebrow">EL PRIMER PASO ES TUYO</p>
          <h2>Entrá en tu órbita.</h2>
          <p>Un día. Un hábito. Una nueva posibilidad.</p>
          <Link
            className="boton"
            to={authenticated ? "/dashboard" : "/Registro"}
          >
            {authenticated ? "Volver a mi espacio" : "Empezar con Habitly"}{" "}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
      <footer className="contenedor inicio-footer">
        <Link className="logo" to="/">
          <BrandMark />
          <strong>Habitly</strong>
        </Link>
        <span>A tu ritmo, día a día.</span>
        <a href="#home-title">Volver arriba ↑</a>
      </footer>
    </main>
  );
}
