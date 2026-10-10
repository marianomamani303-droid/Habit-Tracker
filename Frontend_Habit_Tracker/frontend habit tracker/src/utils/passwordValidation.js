export function passwordError(password, confirmar) {
  if (
    password.length < 8 ||
    !password.trim() ||
    new TextEncoder().encode(password).length > 72
  )
    return "Usá al menos 8 caracteres y hasta 72 bytes UTF-8.";
  if (password !== confirmar) return "Las contraseñas deben coincidir.";
  return "";
}
