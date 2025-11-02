import { useEffect, useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import "../styles/pages/YearDetail.css";

export default function YearDetail() {
  const { user } = useAuth();
  const { year } = useParams();
  const navigate = useNavigate();
  const { setTitle } = useOutletContext();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTitle(`Jahr ${year}`);
    fetchYearData();
  }, [year]);

  const fetchYearData = async () => {
    try {
      const res = await API.get(`/years/${year}`);
      setData(res.data);
    } catch (err) {
      console.error("Fehler beim Laden der Jahresdaten:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== "admin") {
    return <p>Kein Zugriff</p>;
  }

  if (loading) return <p>Lade Daten...</p>;
  if (!data) return <p>Keine Daten gefunden.</p>;

  const { year: yearObj, evenings } = data;

  return (
    <div className="year-detail-page">
      <div className="year-detail-header">
        <h2>Jahr {yearObj.year}</h2>
        {yearObj.closed && (
          <p className="year-status closed">
            Abgeschlossen am:{" "}
            {new Date(yearObj.closedAt).toLocaleDateString("de-CH")}
          </p>
        )}
        {!yearObj.closed && <p className="year-status open">Noch offen</p>}

        <button className="button neutral" onClick={() => navigate(-1)}>
          Zurück
        </button>
      </div>

      <div className="evening-list">
        {evenings.length === 0 ? (
          <p>Keine Abende in diesem Jahr.</p>
        ) : (
          evenings.map((evening) => (
            <div key={evening._id} className="card evening-card">
              <div>
                <strong>
                  {new Date(evening.date).toLocaleDateString("de-CH")}
                </strong>
                <p>
                  Status:{" "}
                  <span className={`badge ${evening.status}`}>
                    {evening.status.toUpperCase()}
                  </span>
                </p>
              </div>
              <div>
                {evening.spielleiterId && (
                  <p>Spielleiter: {evening.spielleiterId}</p>
                )}
                <p>Teilnehmer: {evening.participantIds.length}</p>
                <p>Spiele: {evening.games.length}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
