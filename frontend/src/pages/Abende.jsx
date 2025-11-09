import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useOutletContext } from "react-router-dom";
import API from "../services/api";
import {
  CalendarDays,
  Users,
  Gamepad2,
  Calendar,
  CheckCircle2,
  XCircle,
  MapPinHouse,
} from "lucide-react";
import "../styles/pages/Abende.css";
import EveningCreateModal from "../components/forms/EveningCreateModal";
import PollCreateModal from "../components/forms/PollCreateModal";

export default function Abende() {
  const { user } = useAuth();
  const { setTitle } = useOutletContext();
  const navigate = useNavigate();

  const [evenings, setEvenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPollEveningId, setSelectedPollEveningId] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle("Abende");
    fetchEvenings();
  }, []);

  const fetchEvenings = async () => {
    try {
      const res = await API.get("/evenings");

      // GESPERRTE Abende rausfiltern → nur aktive anzeigen
      const activeEvenings = res.data.filter((e) => e.status !== "gesperrt");

      const sorted = activeEvenings.sort((a, b) => {
        const aHasDate = !!a.date;
        const bHasDate = !!b.date;

        if (!aHasDate && bHasDate) return -1;
        if (aHasDate && !bHasDate) return 1;
        if (!aHasDate && !bHasDate) return 0;

        return new Date(b.date) - new Date(a.date);
      });

      setEvenings(sorted);
    } catch (err) {
      console.error("Fehler beim Laden der Abende:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (eveningId) => {
    if (busy) return;
    setBusy(true);
    try {
      await API.post(`/evenings/${eveningId}/participants`);
      await fetchEvenings();
    } catch (err) {
      alert(
        "Fehler beim Beitreten: " + (err.response?.data?.error || err.message)
      );
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async (eveningId) => {
    if (busy) return;
    setBusy(true);
    try {
      await API.delete(`/evenings/${eveningId}/participants/${user._id}`);
      await fetchEvenings();
    } catch (err) {
      alert(
        "Fehler beim Verlassen: " + (err.response?.data?.error || err.message)
      );
    } finally {
      setBusy(false);
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
          {evenings.map((abend) => {
            const isFixiert = abend.status === "fixiert";
            const isOffen = abend.status === "offen";
            const hasPoll = !!abend.pollId;
            const isSpielleiter = user?._id === abend.spielleiterRef?._id;
            const isTeilnehmer = abend.participantRefs?.some(
              (p) => p._id === user._id
            );

            return (
              <div key={abend._id}>
                <div
                  className={`card abend-card status-${abend.status}`}
                  onClick={(e) => {
                    if (e.target.closest(".abend-actions")) return;
                    navigate(`/abende/${abend._id}`);
                  }}
                >
                  <div className="abend-card-header">
                    <div className="abend-date">
                      <CalendarDays size={16} />
                      {abend.date
                        ? new Date(abend.date).toLocaleDateString("de-CH", {
                            weekday: "short",
                            day: "2-digit",
                            month: "short",
                          })
                        : "Datum offen"}
                    </div>
                    <span className={`badge-abende status-${abend.status}`}>
                      {abend.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="abend-meta">
                    <div className="meta-item">
                      <MapPinHouse size={16} />
                      {abend.spielleiterRef?.displayName || "—"}
                    </div>
                    <div className="meta-item">
                      <Users size={16} />
                      {abend.participantRefs?.length ?? 0} Teilnehmer
                    </div>
                    <div className="meta-item">
                      <Gamepad2 size={16} />
                      {abend.games?.length ?? 0} Spiele
                    </div>
                    <div className="meta-item">
                      <Calendar size={16} />
                      Jahr {abend.spieljahr}
                    </div>
                  </div>

                  <div className="abend-actions">
                    {isFixiert &&
                      (isTeilnehmer ? (
                        <button
                          className="button danger small"
                          onClick={() => handleLeave(abend._id)}
                          disabled={busy}
                        >
                          <XCircle size={14} /> Ich bin weg
                        </button>
                      ) : (
                        <button
                          className="button primary small"
                          onClick={() => handleJoin(abend._id)}
                          disabled={busy}
                        >
                          <CheckCircle2 size={14} /> Ich nehme teil
                        </button>
                      ))}

                    {/* NEU: Button für Umfrage nur für Spielleiter, offen & ohne Poll */}
                    {isSpielleiter && isOffen && !hasPoll && (
                      <button
                        className="button secondary small"
                        onClick={() => setSelectedPollEveningId(abend._id)}
                      >
                        <Calendar size={14} /> Umfrage erstellen
                      </button>
                    )}
                  </div>
                </div>

                {/* NEU: Modal erscheint direkt unterhalb des Abends */}
                {selectedPollEveningId === abend._id && (
                  <PollCreateModal
                    eveningId={abend._id}
                    onClose={() => setSelectedPollEveningId(null)}
                    onSuccess={() => {
                      setSelectedPollEveningId(null);
                      navigate("/umfragen"); // 👈 HIER: direkt zur Umfragen-Seite springen
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal für neuen Abend */}
      {showModal && (
        <EveningCreateModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchEvenings}
        />
      )}
    </div>
  );
}
