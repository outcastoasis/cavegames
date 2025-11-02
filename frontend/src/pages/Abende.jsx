import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useOutletContext } from "react-router-dom";
import API from "../services/api";
import "../styles/pages/Abende.css";
import EveningCreateModal from "../components/forms/EveningCreateModal";

export default function Abende() {
  const { user } = useAuth();
  const { setTitle } = useOutletContext();
  const navigate = useNavigate();

  const [evenings, setEvenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setTitle("Abende");
    fetchEvenings();
  }, []);

  const fetchEvenings = async () => {
    try {
      const res = await API.get("/evenings");
      const sorted = res.data.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      setEvenings(sorted);
    } catch (err) {
      console.error("Fehler beim Laden der Abende:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvening = async () => {
    try {
      const res = await API.post("/evenings", {
        spieljahr: new Date().getFullYear(),
        organizerId: user._id,
        spielleiterId: user._id,
        participantIds: [user._id],
        status: "offen",
        // kein Datum → bleibt leer
      });

      navigate(`/abende/${res.data._id}`);
    } catch (err) {
      alert(err.response?.data?.error || "Fehler beim Erstellen des Abends");
    }
  };

  return (
    <div className="abende-page">
      {user?.role === "admin" && (
        <div className="abende-header">
          <button className="button primary" onClick={() => setShowModal(true)}>
            + Neuer Abend
          </button>
        </div>
      )}

      {loading ? (
        <p>Lade Abende...</p>
      ) : evenings.length === 0 ? (
        <p>Keine Abende gefunden.</p>
      ) : (
        <div className="abend-list">
          {evenings.map((abend) => (
            <div
              key={abend._id}
              className="card abend-card"
              onClick={() => navigate(`/abende/${abend._id}`)}
            >
              <div className="abend-main">
                <strong className={!abend.date ? "date-placeholder" : ""}>
                  {abend.date
                    ? new Date(abend.date).toLocaleDateString("de-CH")
                    : "Umfrage läuft..."}
                </strong>
                <span className={`badge-abende status-${abend.status}`}>
                  {abend.status.toUpperCase()}
                </span>
              </div>
              <div className="abend-info">
                <p>Jahr: {abend.spieljahr}</p>
                <p>Teilnehmer: {abend.participantIds.length}</p>
                <p>Spiele: {abend.games.length}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <EveningCreateModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchEvenings}
        />
      )}
    </div>
  );
}
