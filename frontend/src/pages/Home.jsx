// frontend/src/pages/Home.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useOutletContext } from "react-router-dom";
import API from "../services/api";

export default function Home() {
  const { user } = useAuth();
  const [message, setMessage] = useState("Warte auf Antwort...");
  const [error, setError] = useState("");
  const { setTitle } = useOutletContext();

  useEffect(() => {
    setTitle("Cavegames");
  }, [setTitle]);

  useEffect(() => {
    API.get("/test")
      .then((res) => setMessage(res.data.message))
      .catch(() => setError("API nicht erreichbar"));
  }, []);

  return (
    <>
      <p className="user-label">
        Willkommen, <strong>{user?.displayName}</strong>!
      </p>
      <h2>Startseite</h2>
      <p>Status: {error ? error : message}</p>
    </>
  );
}
