import "./button.style.css";

export function Button({
  texto,
  icone,
  classe,
  classeTexto,
  onClick,
  form,
  type,
  disabled,
}) {
  return (
    <button
      className={classe}
      type={type}
      onClick={onClick}
      form={form}
      disabled={disabled}
    >
      {icone}
      <span className={classeTexto}>{texto}</span>
    </button>
  );
}
