import { useEffect, useState } from "react";
import { testAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const [message, setMessage] = useState("Warte auf Antwort...");
  const [error, setError] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    testAPI()
      .then((data) => setMessage(data.message))
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
