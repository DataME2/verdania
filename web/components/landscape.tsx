// Verdania's valley: farms, river, factories, wind turbines and the city. From the approved Home design.
export function Landscape({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 720 610" className="absolute inset-x-0 bottom-0 w-full" role="img" aria-label={label}>
      <g fill="#9db7c9" opacity=".55">
        <rect x="520" y="170" width="28" height="150" />
        <rect x="554" y="130" width="34" height="190" />
        <rect x="594" y="185" width="26" height="135" />
        <rect x="626" y="150" width="32" height="170" />
        <rect x="664" y="200" width="24" height="120" />
      </g>
      <path d="M0 310 Q130 165 280 300 T720 250 V610 H0Z" fill="#7fac63" />
      <path d="M0 390 Q170 230 370 390 T720 335 V610 H0Z" fill="#5f9147" />
      <path d="M0 468 Q180 360 350 455 T720 420 V610 H0Z" fill="#426f32" />
      <path d="M50 500 Q230 395 420 485 T720 465 V610 H0Z" fill="#d1b95e" />
      <path d="M0 530 Q180 440 350 515 T720 490" fill="none" stroke="#5f9aa1" strokeWidth="22" opacity=".7" />
      <g fill="#f7f3dc" stroke="#2d5016" strokeWidth="3">
        <path d="M394 308h38v93h-38zM438 280h48v121h-48zM492 329h42v72h-42z" />
        <path d="M404 322h11m33-25h20" strokeWidth="6" />
      </g>
      <g stroke="#f7f3dc" strokeWidth="5" fill="none" className="animate-sway" style={{ transformOrigin: "190px 280px" }}>
        <path d="M190 280v122" />
        <path d="M190 280l-42-20M190 280l34-31M190 280l8 47" />
      </g>
      <g stroke="#f7f3dc" strokeWidth="5" fill="none" className="animate-sway" style={{ transformOrigin: "275px 317px" }}>
        <path d="M275 317v106" />
        <path d="M275 317l-38-24M275 317l38-20M275 317l2 44" />
      </g>
      <g fill="#2d5016">
        <circle cx="82" cy="445" r="18" />
        <rect x="78" y="445" width="8" height="38" />
        <circle cx="120" cy="425" r="23" />
        <rect x="116" y="430" width="8" height="48" />
        <circle cx="675" cy="410" r="25" />
        <rect x="670" y="418" width="10" height="55" />
      </g>
      <g fill="none" stroke="#4a7c3a" strokeWidth="5" opacity=".9">
        <path d="M80 532l120 78M124 506l156 104M260 488l165 122M395 492l140 118" />
      </g>
    </svg>
  );
}
