import "../../styles/components/AvatarStack.css";

export default function AvatarStack({
  className = "",
  max = 5,
  showNames = false,
  users = [],
}) {
  if (!users.length) return null;

  const visibleUsers = users.slice(0, max);
  const remainingCount = users.length - visibleUsers.length;
  const names = users.map((user) => user.displayName).join(", ");

  return (
    <span
      aria-label={`Abgestimmt: ${names}`}
      className={`ui-avatar-summary${
        showNames ? " ui-avatar-summary--with-names" : ""
      } ${className}`.trim()}
    >
      <span className="ui-avatar-stack" aria-hidden="true">
        {visibleUsers.map((user) => {
          const initial = user.displayName.trim().charAt(0).toUpperCase();

          return (
            <span
              className="ui-avatar-stack__item"
              key={user._id || user.displayName}
              title={user.displayName}
            >
              {initial}
              {user.profileImageUrl && (
                <img
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  src={user.profileImageUrl}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}
            </span>
          );
        })}
        {remainingCount > 0 && (
          <span className="ui-avatar-stack__item ui-avatar-stack__item--more">
            +{remainingCount}
          </span>
        )}
      </span>
      {showNames && (
        <span className="ui-avatar-summary__names" aria-hidden="true">
          {names}
        </span>
      )}
    </span>
  );
}
