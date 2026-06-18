import logo from "../../assets/images/icon-512.png";
import Spinner from "./Spinner";
import "../../styles/components/Loading.css";

export default function PageLoader({
  title = "Cavegames wird geladen",
  message = "Einen Moment bitte...",
  compact = false,
}) {
  return (
    <div className={compact ? "page-loader page-loader--compact" : "page-loader"}>
      <div className="page-loader__logo-wrap">
        <img src={logo} alt="" className="page-loader__logo" />
      </div>
      <Spinner label={title} />
      <div className="page-loader__text">
        <strong>{title}</strong>
        <span>{message}</span>
      </div>
    </div>
  );
}
