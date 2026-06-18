import "../../styles/components/Loading.css";

export function SkeletonBlock({ className = "" }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}

export function EveningCardSkeleton() {
  return (
    <article className="card skeleton-card">
      <div className="skeleton-row skeleton-row--spread">
        <SkeletonBlock className="skeleton-line skeleton-line--medium" />
        <SkeletonBlock className="skeleton-pill" />
      </div>
      <div className="skeleton-grid">
        <SkeletonBlock className="skeleton-line" />
        <SkeletonBlock className="skeleton-line" />
        <SkeletonBlock className="skeleton-line" />
        <SkeletonBlock className="skeleton-line" />
      </div>
    </article>
  );
}

export function EveningListSkeleton({ count = 3 }) {
  return (
    <div className="skeleton-stack" aria-label="Abende werden geladen">
      <SkeletonBlock className="skeleton-heading" />
      {Array.from({ length: count }).map((_, index) => (
        <EveningCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function AbendDetailSkeleton() {
  return (
    <div className="abenddetail-container skeleton-detail" aria-label="Abenddetails werden geladen">
      <SkeletonBlock className="skeleton-back" />
      <div className="card skeleton-detail__card">
        <div className="skeleton-info-grid">
          <SkeletonBlock className="skeleton-info-card" />
          <SkeletonBlock className="skeleton-info-card" />
          <SkeletonBlock className="skeleton-info-card" />
          <SkeletonBlock className="skeleton-info-card" />
        </div>
        <SkeletonBlock className="skeleton-heading" />
        <EveningCardSkeleton />
        <SkeletonBlock className="skeleton-heading skeleton-heading--short" />
        <div className="skeleton-participants">
          <SkeletonBlock className="skeleton-chip" />
          <SkeletonBlock className="skeleton-chip" />
          <SkeletonBlock className="skeleton-chip" />
        </div>
      </div>
    </div>
  );
}
