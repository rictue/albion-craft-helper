interface Props {
  label: string;
  hint?: string;
}

export default function SectionDivider({ label, hint }: Props) {
  return (
    <div className="section-heading">
      <h2>{label}</h2>
      {hint && <span className="hint hidden sm:inline">{hint}</span>}
    </div>
  );
}
