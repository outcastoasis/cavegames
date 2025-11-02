import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate, useNavigate, useOutletContext } from "react-router-dom";
import API from "../services/api";
import "../styles/pages/AdminYears.css";
import { Link } from "react-router-dom";

export default function AdminYears() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setTitle } = useOutletContext();

  const [years, setYears] = useState([]);
  const [newYear, setNewYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle("Jahresverwaltung");
    fetchYears();
  }, []);

  const fetchYears = async () => {
    try {
      const res = await API.get("/years");
      setYears(res.data);
    } catch (err) {
      console.error("Fehler beim Laden der Jahre:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateYear = async () => {
    if (!newYear) return;
    try {
      const yearNum = parseInt(newYear);
      await API.post("/years", { year: yearNum });
      setNewYear("");
      fetchYears();
    } catch (err) {
      setError(err.response?.data?.error || "Fehler beim Erstellen.");
    }
  };

  const handleCloseYear = async (year) => {
    try {
      await API.post(`/years/${year}/close`);
      fetchYears();
    } catch (err) {
      alert(err.response?.data?.error || "Fehler beim Abschließen");
    }
  };

  const isClosable = (yearObj) => {
    // Platzhalter – kann später durch Backend-Status ersetzt werden
    return !yearObj.closed;
  };

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-years-page">
      <div className="year-header">
        <input
          type="number"
          placeholder="Neues Jahr z. B. 2025"
          className="input year-input"
          value={newYear}
          onChange={(e) => setNewYear(e.target.value)}
        />
        <button
          className="button primary year-add-button"
          onClick={handleCreateYear}
        >
          Jahr anlegen
        </button>
      </div>

      {error && <div className="alert">{error}</div>}

      {loading ? (
        <p>Lade Jahre...</p>
      ) : (
        <div className="year-list">
          {years.map((year) => (
            <div key={year._id} className="card year-card">
              <div className="year-info">
                <h3>{year.year}</h3>
                <p>
                  Status:{" "}
                  {year.closed ? (
                    <span className="badge closed">Abgeschlossen</span>
                  ) : (
                    <span className="badge open">Offen</span>
                  )}
                </p>
                {year.closedAt && (
                  <p className="small">
                    Abgeschlossen am:{" "}
                    {new Date(year.closedAt).toLocaleDateString("de-CH")}
                  </p>
                )}
              </div>

              <div className="year-actions">
                <button
                  className="button"
                  onClick={() => navigate(`/admin/years/${year.year}`)}
                >
                  Details
                </button>
                {!year.closed && (
                  <button
                    className="button danger"
                    onClick={() => handleCloseYear(year.year)}
                  >
                    Jahr abschließen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
