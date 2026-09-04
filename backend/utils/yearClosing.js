function getEveningLabel(evening) {
  const date = evening.date
    ? new Date(evening.date).toLocaleDateString("de-CH")
    : "Datum offen";
  return `${date} (${evening.status})`;
}

function validateYearClosing(evenings) {
  const blockers = [];
  const warnings = [];

  if (evenings.length === 0) {
    blockers.push({
      id: "year-empty",
      label: "Jahr ohne Abende",
      date: null,
      status: "leer",
      participantCount: 0,
      gamesCount: 0,
      issues: ["Keine Abende im Jahr vorhanden"],
      warnings: [],
    });
  }

  const eveningChecks = evenings.map((evening) => {
    const issues = [];
    const warningIssues = [];
    const participantIds = (evening.participantIds || []).map((id) =>
      id.toString(),
    );

    if (evening.status !== "abgeschlossen") {
      issues.push("Abend ist noch nicht abgeschlossen");
    }

    if (!evening.date || Number.isNaN(new Date(evening.date).getTime())) {
      issues.push("Kein gültiger Termin vorhanden");
    }

    if (participantIds.length === 0) {
      issues.push("Keine Teilnehmer erfasst");
    }

    if (!evening.games?.length) {
      issues.push("Keine Spiele erfasst");
    }

    (evening.games || []).forEach((game, gameIndex) => {
      const gameName = game.gameId?.name || `Spiel ${gameIndex + 1}`;
      const scores = game.scores || [];
      const scoreUserIds = new Set(
        scores
          .filter((score) => score.userId)
          .map((score) => score.userId.toString()),
      );

      participantIds.forEach((participantId) => {
        if (!scoreUserIds.has(participantId)) {
          issues.push(`${gameName}: Score für Teilnehmer fehlt`);
        }
      });

      const invalidScore = scores.some(
        (score) =>
          score.points === null ||
          score.points === undefined ||
          !Number.isFinite(Number(score.points)) ||
          Number(score.points) < 0,
      );
      if (invalidScore) {
        issues.push(`${gameName}: Ungültige Punkte erfasst`);
      }

      const allZero =
        scores.length > 0 && scores.every((score) => Number(score.points) === 0);
      if (allZero) {
        warningIssues.push(`${gameName}: Alle Punkte sind 0`);
      }
    });

    const check = {
      id: evening._id,
      label: getEveningLabel(evening),
      date: evening.date,
      status: evening.status,
      participantCount: participantIds.length,
      gamesCount: evening.games?.length || 0,
      issues: [...new Set(issues)],
      warnings: [...new Set(warningIssues)],
    };

    if (check.issues.length) blockers.push(check);
    if (check.warnings.length) warnings.push(check);
    return check;
  });

  return {
    canClose: blockers.length === 0,
    summary: {
      eveningsTotal: evenings.length,
      blockersTotal: blockers.length,
      warningsTotal: warnings.length,
    },
    blockers,
    warnings,
    evenings: eveningChecks,
  };
}

module.exports = { getEveningLabel, validateYearClosing };
