const BLOCKS = [
  [100, 145, 85, 80],
  [100, 255, 85, 90],
  [100, 375, 85, 65],
  [100, 460, 85, 65],
  [215, 145, 90, 80],
  [215, 375, 90, 65],
  [215, 465, 90, 65],
  [335, 145, 90, 80],
  [335, 375, 90, 65],
  [335, 465, 90, 65],
  [460, 255, 70, 90],
  [460, 375, 70, 65],
  [460, 465, 70, 65],
  [565, 145, 80, 80],
  [565, 255, 80, 90],
  [565, 375, 80, 65],
  [565, 465, 80, 65],
  [675, 145, 70, 80],
  [675, 255, 70, 90],
  [780, 145, 75, 80],
  [780, 255, 75, 90],
  [780, 375, 75, 65],
  [780, 465, 75, 65],
  [885, 145, 70, 80],
  [885, 255, 70, 90],
  [885, 375, 70, 65],
  [885, 465, 70, 65]
];

export interface RoutePlace {
  cx: number;
  cy: number;
  label: string;
  color?: string;
}

interface Props {
  className?: string;
  routePlaces?: RoutePlace[];
  onClick?: () => void;
  onPinClick?: (index: number) => void;
}

export function MapCanvas({
  className = "w-full h-full",
  routePlaces = [],
  onClick,
  onPinClick
}: Props) {
  return (
    <svg
      viewBox="0 0 1000 700"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      onClick={onClick}
    >
      {/* Land */}
      <rect width="1000" height="700" fill="#f2efe9" />

      {/* Parks */}
      <rect x="245" y="160" width="185" height="155" rx="8" fill="#c8e6c9" />
      <rect x="470" y="90" width="175" height="155" rx="8" fill="#c8e6c9" />
      <rect x="685" y="385" width="145" height="115" rx="8" fill="#c8e6c9" />

      {/* 갑천 */}
      <path
        d="M 152 0 C 144 110,170 195,160 305 C 150 390,128 445,150 535 C 162 582,156 642,146 700"
        stroke="#aedcf8"
        strokeWidth="26"
        fill="none"
        strokeLinecap="round"
      />
      {/* 유등천 */}
      <path
        d="M 0 458 C 52 442,104 462,150 452"
        stroke="#aedcf8"
        strokeWidth="18"
        fill="none"
        strokeLinecap="round"
      />

      {/* Major roads E-W */}
      <line x1="0" y1="130" x2="1000" y2="130" stroke="#fff" strokeWidth="14" />
      <line x1="0" y1="360" x2="1000" y2="360" stroke="#fff" strokeWidth="16" />
      <line x1="0" y1="540" x2="1000" y2="540" stroke="#fff" strokeWidth="12" />
      {/* Major roads N-S */}
      <line x1="200" y1="0" x2="200" y2="700" stroke="#fff" strokeWidth="12" />
      <line x1="440" y1="0" x2="440" y2="700" stroke="#fff" strokeWidth="16" />
      <line x1="660" y1="0" x2="660" y2="700" stroke="#fff" strokeWidth="12" />
      <line x1="870" y1="0" x2="870" y2="700" stroke="#fff" strokeWidth="10" />
      {/* Secondary roads E-W */}
      <line x1="0" y1="240" x2="1000" y2="240" stroke="#fff" strokeWidth="7" />
      <line x1="0" y1="450" x2="1000" y2="450" stroke="#fff" strokeWidth="7" />
      <line x1="0" y1="630" x2="1000" y2="630" stroke="#fff" strokeWidth="6" />
      {/* Secondary roads N-S */}
      <line x1="90" y1="0" x2="90" y2="700" stroke="#fff" strokeWidth="6" />
      <line x1="320" y1="0" x2="320" y2="700" stroke="#fff" strokeWidth="7" />
      <line x1="550" y1="0" x2="550" y2="700" stroke="#fff" strokeWidth="7" />
      <line x1="760" y1="0" x2="760" y2="700" stroke="#fff" strokeWidth="7" />
      <line x1="960" y1="0" x2="960" y2="700" stroke="#fff" strokeWidth="5" />
      {/* Diagonal */}
      <line x1="200" y1="360" x2="440" y2="130" stroke="#fff" strokeWidth="9" />
      <line x1="660" y1="360" x2="870" y2="130" stroke="#fff" strokeWidth="8" />
      <line x1="200" y1="360" x2="90" y2="540" stroke="#fff" strokeWidth="7" />

      {/* Building blocks */}
      {BLOCKS.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx={2} fill="#e2ddd6" pointerEvents="none" />
      ))}

      {/* Park / river labels */}
      <text
        x="337"
        y="244"
        fontSize="12"
        fill="#388e3c"
        fontFamily="sans-serif"
        textAnchor="middle"
        fontWeight="600"
        pointerEvents="none"
      >
        한밭수목원
      </text>
      <text
        x="557"
        y="170"
        fontSize="12"
        fill="#388e3c"
        fontFamily="sans-serif"
        textAnchor="middle"
        fontWeight="600"
        pointerEvents="none"
      >
        엑스포과학공원
      </text>
      <text
        x="757"
        y="447"
        fontSize="11"
        fill="#388e3c"
        fontFamily="sans-serif"
        textAnchor="middle"
        pointerEvents="none"
      >
        대청호
      </text>
      <text
        x="148"
        y="295"
        fontSize="11"
        fill="#5ba8d4"
        fontFamily="sans-serif"
        textAnchor="middle"
        transform="rotate(-80 148 295)"
        pointerEvents="none"
      >
        갑천
      </text>
      <text
        x="620"
        y="122"
        fontSize="11"
        fill="#bbb"
        fontFamily="sans-serif"
        textAnchor="middle"
        pointerEvents="none"
      >
        충남대로
      </text>
      <text
        x="620"
        y="350"
        fontSize="11"
        fill="#bbb"
        fontFamily="sans-serif"
        textAnchor="middle"
        pointerEvents="none"
      >
        대덕대로
      </text>

      {/* Route: dashed connecting lines */}
      {routePlaces.length > 1 &&
        routePlaces.map((place, i) => {
          if (i === routePlaces.length - 1) return null;
          const next = routePlaces[i + 1];
          return (
            <line
              key={`route-line-${i}`}
              x1={place.cx}
              y1={place.cy - 14}
              x2={next.cx}
              y2={next.cy - 14}
              stroke="#16a34a"
              strokeWidth="4"
              strokeDasharray="10 6"
              strokeLinecap="round"
              opacity="0.85"
            />
          );
        })}

      {/* Route: numbered pins */}
      {routePlaces.map((place, i) => {
        const color = place.color ?? "#16a34a";
        const { cx, cy } = place;
        return (
          <g
            key={`route-pin-${i}`}
            onClick={(e) => {
              e.stopPropagation();
              onPinClick?.(i);
            }}
            style={{ cursor: onPinClick ? "pointer" : "default" }}
          >
            <ellipse cx={cx} cy={cy + 4} rx={10} ry={5} fill="rgba(0,0,0,0.22)" />
            <circle cx={cx} cy={cy - 14} r={15} fill={color} />
            <polygon
              points={`${cx - 8},${cy - 4} ${cx + 8},${cy - 4} ${cx},${cy + 8}`}
              fill={color}
            />
            {/* White ring */}
            <circle cx={cx} cy={cy - 14} r={10} fill="white" opacity="0.25" />
            {/* Number */}
            <text
              x={cx}
              y={cy - 10}
              textAnchor="middle"
              fontSize="12"
              fontWeight="bold"
              fill="white"
              fontFamily="sans-serif"
              pointerEvents="none"
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
