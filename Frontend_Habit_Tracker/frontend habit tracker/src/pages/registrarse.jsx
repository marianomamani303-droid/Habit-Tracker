import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../services/authApi";
import "../css/registrase.css";

function Registrarse() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    confirmar: "",
  });
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  function cambiar(event) {
    const { name, value, form } = event.target;
    setDatos((actual) => ({ ...actual, [name]: value }));
    form.elements.confirmar.setCustomValidity("");
    setMensaje("");
  }

  async function enviar(event) {
    event.preventDefault();
    if (enviando) return;

    const formulario = event.currentTarget;
    formulario.elements.confirmar.setCustomValidity(
      datos.password === datos.confirmar
        ? ""
        : "Las contraseñas deben coincidir.",
    );
    if (!formulario.reportValidity()) return;

    setEnviando(true);
    setMensaje("");
    try {
      await authApi.register(datos);
      navigate("/IniciarSesion", {
        replace: true,
        state: {
          email: datos.email.trim(),
          mensaje: "Cuenta creada correctamente. Inicia sesión para continuar.",
        },
      });
    } catch (error) {
      setMensaje(error.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="contenedor auth-layout">
      <aside className="auth-presentacion">
        <span className="auth-distintivo">
          Pequeños pasos. Grandes cambios.
        </span>
        <h2>
          Tu mejor versión empieza con <span>un hábito.</span>
        </h2>
        <p>
          Una rutina más clara para dedicarle energía a lo que importa. Empieza
          a construir constancia, un día a la vez.
        </p>
        <div className="auth-rutina">
          <strong>Cada paso cuenta</strong>
          <p>✓ Leer un poco cada día</p>
          <p>✓ Mover el cuerpo</p>
          <p>✓ Dedicarte un momento</p>
        </div>
        <p className="auth-nota">
          No necesitas hacerlo perfecto. Solo empezar.
        </p>
      </aside>
      <form
        className="tarjeta form-registrarse auth-form"
        onSubmit={enviar}
        aria-labelledby="titulo-registro"
        aria-busy={enviando}
      >
        <div className="header-form">
          <p className="auth-eyebrow">TU PRIMER PASO</p>
          <h1 className="titulo" id="titulo-registro">
            Crea tu <span>cuenta</span>
          </h1>
          <p className="texto texto-suave">
            Dale espacio a los hábitos que te hacen bien.
          </p>
        </div>
        <div className="form-campo">
          <div className="campo">
            <label htmlFor="nombre">Nombre</label>
            <input
              className="entrada"
              id="nombre"
              name="nombre"
              autoComplete="given-name"
              placeholder="Tu nombre"
              value={datos.nombre}
              onChange={cambiar}
              required
            />
          </div>
          <div className="campo">
            <label htmlFor="apellido">Apellido</label>
            <input
              className="entrada"
              id="apellido"
              name="apellido"
              autoComplete="family-name"
              placeholder="Tu apellido"
              value={datos.apellido}
              onChange={cambiar}
              required
            />
          </div>
          <div className="campo auth-completo">
            <label htmlFor="email">Email</label>
            <input
              className="entrada"
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={datos.email}
              onChange={cambiar}
              required
            />
          </div>
          <div className="campo auth-completo">
            <label htmlFor="password">Contraseña</label>
            <input
              className="entrada"
              type="password"
              id="password"
              name="password"
              autoComplete="new-password"
              placeholder="Crea una contraseña"
              minLength={8}
              aria-describedby="ayuda-password"
              value={datos.password}
              onChange={cambiar}
              required
            />
            <small className="texto-suave" id="ayuda-password">
              Usa al menos 8 caracteres.
            </small>
          </div>
          <div className="campo auth-completo">
            <label htmlFor="confirmar">Confirmar contraseña</label>
            <input
              className="entrada"
              type="password"
              id="confirmar"
              name="confirmar"
              autoComplete="new-password"
              placeholder="Repite tu contraseña"
              value={datos.confirmar}
              onChange={cambiar}
              required
            />
          </div>
        </div>
        <button className="boton auth-submit" type="submit" disabled={enviando}>
          {enviando ? "Creando cuenta…" : "Crear cuenta"}
          <span aria-hidden="true">→</span>
        </button>
        <p className="auth-mensaje auth-error" role="alert">
          {mensaje}
        </p>
        <p className="auth-alternativa">
          ¿Ya tienes una cuenta?{" "}
          <button
            type="button"
            className="auth-enlace"
            onClick={() => navigate("/IniciarSesion")}
          >
            Inicia sesión
          </button>
        </p>
      </form>
    </main>
  );
}
export default Registrarse;
