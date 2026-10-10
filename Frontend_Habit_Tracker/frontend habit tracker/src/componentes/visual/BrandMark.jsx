export default function BrandMark({ className = "" }) {
  return (
    <svg
      className={`brand-mark ${className}`}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="46"
        height="46"
        rx="15"
        fill="#182b2d"
        stroke="#7df4c640"
      />
      <path
        d="M15 14v20m18-20v20M15 24h18"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M8 29c4-13 23-22 31-13M9 34c9 9 28-2 30-14"
        stroke="currentColor"
        strokeOpacity=".55"
        strokeWidth="1.3"
      />
      <circle cx="38" cy="18" r="2.5" fill="currentColor" />
    </svg>
  );
}
