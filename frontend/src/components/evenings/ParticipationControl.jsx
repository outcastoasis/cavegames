import { CheckCircle2, XCircle } from "lucide-react";
import SegmentedControl from "../ui/SegmentedControl";

export default function ParticipationControl({
  busy = false,
  className = "",
  isParticipating,
  onJoin,
  onLeave,
}) {
  return (
    <SegmentedControl
      ariaLabel="Teilnahme auswählen"
      className={className}
      value={isParticipating ? "yes" : "no"}
      onChange={(nextValue) =>
        nextValue === "yes" ? onJoin() : onLeave()
      }
      disabled={busy}
      options={[
        {
          value: "yes",
          label: "Dabei",
          tone: "success",
          icon: <CheckCircle2 size={18} />,
        },
        {
          value: "no",
          label: "Nicht dabei",
          icon: <XCircle size={18} />,
        },
      ]}
    />
  );
}
