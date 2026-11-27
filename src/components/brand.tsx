// Logo de ANA dibujado en SVG para que se vea nítido a cualquier tamaño.
export function AnaLogo({
  className,
  title = "ANA",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 620 215"
      {...(title
        ? { role: "img", "aria-label": title }
        : { "aria-hidden": true })}
      fill="none"
      stroke="currentColor"
      strokeWidth={40}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M25 190 110 25l80 165" />
      <path d="M245 25v165L380 25v165" />
      <path d="M435 190l85-165 75 165" />
    </svg>
  );
}

export function AnaMark({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`ana-mark ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <AnaLogo title="" />
    </span>
  );
}
