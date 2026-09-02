// src/pages/Abende.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/authState";
import { useNavigate, useOutletContext } from "react-router-dom";
import API from "../services/api";
import { CalendarPlus, Plus } from "lucide-react";
import "../styles/pages/Abende.css";
import EveningCard from "../components/evenings/EveningCard";
import ParticipationControl from "../components/evenings/ParticipationControl";
import EveningCreateModal from "../components/forms/EveningCreateModal";
import PollCreateModal from "../components/forms/PollCreateModal";
import Button from "../components/ui/Button";
import { EveningListSkeleton } from "../components/ui/Skeleton";
import {
  getSwissCalendarDayDiff,
  getSwissDateKey,
} from "../utils/swissDateTime";

export default function Abende() {
  const { user } = useAuth();
  const { setTitle } = useOutletContext();
  const navigate = useNavigate();

  const [evenings, setEvenings] = useState({
    todayEvening: null,
    nextEvening: null,
    future: [],
    past: [],
    openWithoutPoll: [],
    withOpenPoll: [],
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPollEveningId, setSelectedPollEveningId] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle("Abende");
    fetchEvenings();
  }, [setTitle]);

  const fetchEvenings = async () => {
    try {
      const res = await API.get("/evenings");
      const active = res.data.filter((e) => e.status !== "gesperrt");

      const todayStr = getSwissDateKey(new Date());
      const now = new Date();

      const past = [];
      const future = [];
      let todayEvening = null;
      let nextEvening = null;
      const openWithoutPoll = [];
      const withOpenPoll = [];

      active.forEach((e) => {
        if (!e.date) return;
        const eDate = new Date(e.date);
        const eStr = getSwissDateKey(e.date);

        if (eStr === todayStr) {
          todayEvening = e;
        } else if (eDate > now) {
          future.push(e);
        } else {
          past.push(e);
        }
      });

      active.forEach((e) => {
        if (e.status === "offen" && !e.date && !e.pollId) {
          openWithoutPoll.push(e);
        }

        if (e.status === "offen" && !e.date && e.pollId) {
          withOpenPoll.push(e);
        }
      });

      future.sort((a, b) => new Date(a.date) - new Date(b.date));
      past.sort((a, b) => new Date(b.date) - new Date(a.date));

      if (!todayEvening && future.length > 0) {
        nextEvening = future.shift();
      }

      setEvenings({
        todayEvening,
        nextEvening,
        future,
        past,
        openWithoutPoll,
        withOpenPoll,
      });
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
        "Fehler beim Beitreten: " + (err.response?.data?.error || err.message),
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
        "Fehler beim Verlassen: " + (err.response?.data?.error || err.message),
      );
    } finally {
      setBusy(false);
    }
  };

  const calculateDaysLeft = (dateStr) => {
    return getSwissCalendarDayDiff(dateStr);
  };

  const renderEveningCard = (abend) => {
    const isFixiert = abend.status === "fixiert";
    const isOffen = abend.status === "offen";
    const isToday =
      abend.date &&
      getSwissDateKey(abend.date) === getSwissDateKey(new Date());
    const isSpielleiter =
      String(user?._id) === String(abend.spielleiterRef?._id);
    const isTeilnehmer = abend.participantRefs?.some(
      (participant) => String(participant._id) === String(user._id),
    );
    const hasPoll = Boolean(abend.pollId);
    const hasOpenPoll = abend.status === "offen" && !abend.date && abend.pollId;
    const hasRecordedGames = (abend.games?.length || 0) > 0;
    const canChooseParticipation = isFixiert && !isToday && !hasRecordedGames;
    const canCreatePoll = isSpielleiter && isOffen && !hasPoll;
    const footer = canChooseParticipation || canCreatePoll ? (
      <div className="abende-card-actions">
        {canChooseParticipation && (
          <ParticipationControl
            busy={busy}
            isParticipating={isTeilnehmer}
            onJoin={() => handleJoin(abend._id)}
            onLeave={() => handleLeave(abend._id)}
          />
        )}
        {canCreatePoll && (
          <Button
            className="abende-create-poll-button"
            fullWidth
            leadingIcon={<CalendarPlus size={18} />}
            onClick={() => setSelectedPollEveningId(abend._id)}
            size="sm"
            variant="secondary"
          >
            Umfrage erstellen
          </Button>
        )}
      </div>
    ) : null;

    return (
      <div key={abend._id} className="abende-card-item">
        <EveningCard
          currentUserId={user._id}
          detailLevel="extended"
          emphasis={
            isToday || String(evenings.nextEvening?._id) === String(abend._id)
          }
          evening={abend}
          footer={footer}
          onOpen={() =>
            navigate(hasOpenPoll ? "/umfragen" : `/abende/${abend._id}`)
          }
        />

        {selectedPollEveningId === abend._id && (
          <PollCreateModal
            eveningId={abend._id}
            onClose={() => setSelectedPollEveningId(null)}
            onSuccess={() => {
              setSelectedPollEveningId(null);
              navigate("/umfragen");
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="page-shell abende-page">
      {user?.role === "admin" && (
        <div className="abende-header">
          <Button
            leadingIcon={<Plus size={18} />}
            onClick={() => setShowModal(true)}
          >
            Neuer Abend
          </Button>
        </div>
      )}

      {loading ? (
        <EveningListSkeleton />
      ) : (
        <div className="abend-list">
          {evenings.openWithoutPoll.length === 0 &&
          evenings.withOpenPoll.length === 0 &&
          !evenings.todayEvening &&
          !evenings.nextEvening &&
          evenings.future.length === 0 &&
          evenings.past.length === 0 ? (
            <p className="abende-empty">
              Keine Abende im aktuellen Jahr vorhanden.
            </p>
          ) : (
            <>
              {evenings.openWithoutPoll.length > 0 && (
                <section className="abende-section">
                  <div className="abende-section-heading">
                    <h2>Abende ohne Umfrage</h2>
                  </div>
                  {evenings.openWithoutPoll.map(renderEveningCard)}
                </section>
              )}

              {evenings.withOpenPoll.length > 0 && (
                <section className="abende-section">
                  <div className="abende-section-heading">
                    <h2>Abende mit offener Umfrage</h2>
                  </div>
                  {evenings.withOpenPoll.map(renderEveningCard)}
                </section>
              )}

              {evenings.todayEvening && (
                <section className="abende-section abende-section--primary">
                  <div className="abende-section-heading">
                    <h2>Heute Abend</h2>
                  </div>
                  {renderEveningCard(evenings.todayEvening)}
                </section>
              )}

              {evenings.nextEvening && (
                <section className="abende-section abende-section--primary">
                  <div className="abende-section-heading">
                    <h2>Nächster Spieleabend</h2>
                    <span>
                      in {calculateDaysLeft(evenings.nextEvening.date)} Tagen
                    </span>
                  </div>
                  {renderEveningCard(evenings.nextEvening)}
                </section>
              )}

              {evenings.future.length > 0 && (
                <section className="abende-section">
                  <div className="abende-section-heading">
                    <h2>Bevorstehend</h2>
                  </div>
                  {evenings.future.map(renderEveningCard)}
                </section>
              )}

              {evenings.past.length > 0 && (
                <section className="abende-section">
                  <div className="abende-section-heading">
                    <h2>Vergangene Abende</h2>
                  </div>
                  {evenings.past.map(renderEveningCard)}
                </section>
              )}
            </>
          )}
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
