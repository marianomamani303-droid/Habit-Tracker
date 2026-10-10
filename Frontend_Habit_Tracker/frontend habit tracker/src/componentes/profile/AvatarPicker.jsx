import { useState } from "react";
import { experienceApi, avatarUrl } from "../../services/experienceApi";
import { useAuth } from "../../hooks/useAuth";

export default function AvatarPicker() {
  const { usuario, updateUsuario } = useAuth();
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    setMessage("");
    setError("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setError("Elegí una imagen JPEG, PNG o WebP de hasta 2 MB.");
      return;
    }
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let start = 0; start < bytes.length; start += 8192)
        binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
      await experienceApi.avatar({ tipo: file.type, imagen: btoa(binary) });
      updateUsuario({ ...usuario, tiene_avatar: true });
      setRevision(Date.now());
      setMessage("Tu foto ya está actualizada.");
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="habit-avatar-editor">
      <div className="habit-profile-picture">
        {usuario.tiene_avatar ? (
          <img
            src={`${avatarUrl()}?v=${revision}`}
            alt={`Foto de ${usuario.nombre}`}
          />
        ) : (
          <span>{usuario.nombre.slice(0, 1)}</span>
        )}
      </div>
      <div>
        <label className="habit-upload-label">
          {busy ? "Procesando foto…" : "Cambiar foto"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={upload}
            disabled={busy}
          />
        </label>
        <p className="habit-muted">JPEG, PNG o WebP · hasta 2 MB</p>
        {message && (
          <p role="status" className="habit-success">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="dashboard-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
