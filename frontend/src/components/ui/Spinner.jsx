import "../../styles/components/Loading.css";

export default function Spinner({ size = "medium", label = "Laedt..." }) {
  return (
    <span
      className={`spinner spinner--${size}`}
      role="status"
      aria-label={label}
    />
  );
}
