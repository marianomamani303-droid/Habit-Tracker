import BrandMark from "./BrandMark";

export default function OrbitVisual({ compact = false }) {
  return (
    <div
      className={`orbit-visual ${compact ? "is-compact" : ""}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 480 480" className="orbit-lines" fill="none">
        <circle
          cx="240"
          cy="240"
          r="185"
          stroke="#a8badc"
          strokeOpacity=".13"
          strokeDasharray="3 9"
        />
        <circle
          cx="240"
          cy="240"
          r="130"
          stroke="#7df4c6"
          strokeOpacity=".22"
        />
        <ellipse
          cx="240"
          cy="240"
          rx="206"
          ry="92"
          transform="rotate(-36 240 240)"
          stroke="#7df4c6"
          strokeOpacity=".6"
        />
        <ellipse
          cx="240"
          cy="240"
          rx="206"
          ry="92"
          transform="rotate(36 240 240)"
          stroke="#c2acff"
          strokeOpacity=".42"
        />
        <path
          d="M240 30v26m0 368v26M30 240h26m368 0h26"
          stroke="#a3b1c6"
          strokeOpacity=".45"
        />
        <circle cx="96" cy="143" r="6" fill="#7df4c6" />
        <circle cx="387" cy="150" r="5" fill="#c2acff" />
        <circle cx="331" cy="354" r="6" fill="#92b9ff" />
      </svg>
      <div className="orbit-core">
        <BrandMark />
        <span>HABITLY</span>
        <small>A TU RITMO</small>
      </div>
      {!compact && (
        <>
          <span className="orbit-label orbit-label-focus">01 / FOCO</span>
          <span className="orbit-label orbit-label-rhythm">02 / RITMO</span>
          <span className="orbit-label orbit-label-growth">
            03 / CONSTANCIA
          </span>
        </>
      )}
    </div>
  );
}
