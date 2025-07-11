import React, { useRef, useState } from "react";

interface Challenge {
  contestType: string;
  challengeTitle: string;
  description: string;
}

interface SpinWheelProps {
  challenges: Challenge[];
  onChallengeSelected: (challenge: Challenge) => void;
  poemIndex?: number;
  disabled?: boolean;
}

const colorPalette = [
  "#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF",
  "#B983FF", "#FFB5E8", "#00C2CB", "#FF9F1C"
];

const WHEEL_SIZE = 340; // px
const CENTER = WHEEL_SIZE / 2;
const RADIUS = CENTER - 8;

function getSegmentPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const rad = (deg: number) => (Math.PI / 180) * deg;
  const x1 = cx + r * Math.cos(rad(startAngle));
  const y1 = cy + r * Math.sin(rad(startAngle));
  const x2 = cx + r * Math.cos(rad(endAngle));
  const y2 = cy + r * Math.sin(rad(endAngle));
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    `M ${cx} ${cy}`,
    `L ${x1} ${y1}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
    "Z"
  ].join(" ");
}

export default function SpinWheel({
  challenges,
  onChallengeSelected,
  poemIndex = 1,
  disabled = false
}: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<SVGSVGElement>(null);

  const segmentAngle = 360 / challenges.length;

  // Spin logic
  const handleSpin = () => {
    if (isSpinning || disabled) return;
    setIsSpinning(true);
    setSelectedIndex(null);

    // Pick a random index
    const targetIndex = Math.floor(Math.random() * challenges.length);
    const minSpins = 5;
    const maxSpins = 8;
    const spins = minSpins + Math.random() * (maxSpins - minSpins);
    const finalAngle = 360 - (targetIndex * segmentAngle + segmentAngle / 2);
    const totalRotation = spins * 360 + finalAngle;

    setRotation(totalRotation);

    if (wheelRef.current) {
      wheelRef.current.style.transition = `transform 3.5s cubic-bezier(0.23, 1, 0.32, 1)`;
    }

    setTimeout(() => {
      setSelectedIndex(targetIndex);
      setIsSpinning(false);
      onChallengeSelected(challenges[targetIndex]);
    }, 3500);
  };

  // Calculate the current selected index based on rotation (for pointer sync)
  const getCurrentSelectedIndex = () => {
    const normalized = (360 - (rotation % 360) + segmentAngle / 2) % 360;
    return Math.floor(normalized / segmentAngle) % challenges.length;
  };

  return (
    <div className="flex flex-col items-center space-y-6 p-6 relative">
      {/* Golden Pointer */}
      <svg
        width={60}
        height={60}
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          transform: `translate(-50%, -18px)`,
          zIndex: 10,
          pointerEvents: "none"
        }}
      >
        <polygon
          points="30,0 50,38 10,38"
          fill="url(#gold-gradient)"
          stroke="#bfa100"
          strokeWidth="2"
          filter="drop-shadow(0 4px 8px rgba(0,0,0,0.18))"
        />
        <defs>
          <linearGradient id="gold-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe066" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
      </svg>

      {/* Wheel */}
      <div
        style={{
          width: WHEEL_SIZE,
          height: WHEEL_SIZE,
          borderRadius: "50%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 0 0 8px #222",
          background: "#fff",
          position: "relative",
          zIndex: 1
        }}
      >
        <svg
          ref={wheelRef}
          width={WHEEL_SIZE}
          height={WHEEL_SIZE}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? undefined : "none"
          }}
        >
          {/* Segments */}
          {challenges.map((challenge, i) => {
            const start = i * segmentAngle - segmentAngle / 2;
            const end = (i + 1) * segmentAngle - segmentAngle / 2;
            const color = colorPalette[i % colorPalette.length];
            const isSelected =
              selectedIndex !== null
                ? i === selectedIndex
                : i === getCurrentSelectedIndex();

            return (
              <g key={i}>
                <path
                  d={getSegmentPath(CENTER, CENTER, RADIUS, start, end)}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={2.5}
                  filter={isSelected ? "drop-shadow(0 0 12px #fbbf24)" : ""}
                  opacity={isSelected ? 1 : 0.98}
                />
                {/* Text */}
                <text
                  x={CENTER}
                  y={CENTER}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontWeight={700}
                  fontSize={challenge.challengeTitle.length > 16 ? 15 : 18}
                  style={{
                    pointerEvents: "none",
                    userSelect: "none",
                    filter: "drop-shadow(0 2px 6px #222)",
                  }}
                  transform={`
                    rotate(${start + segmentAngle / 2} ${CENTER} ${CENTER})
                    translate(0 -${RADIUS * 0.68})
                  `}
                >
                  <tspan
                    style={{
                      fontSize: challenge.challengeTitle.length > 18 ? 13 : 16,
                    }}
                    textAnchor="middle"
                  >
                    {challenge.challengeTitle.length > 22
                      ? challenge.challengeTitle.slice(0, 20) + "…"
                      : challenge.challengeTitle}
                  </tspan>
                </text>
              </g>
            );
          })}
          {/* Center hub */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={WHEEL_SIZE * 0.13}
            fill="#222"
            stroke="#fbbf24"
            strokeWidth={6}
            filter="drop-shadow(0 2px 8px #fbbf24)"
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={WHEEL_SIZE * 0.07}
            fill="url(#gold-gradient)"
            stroke="#fff"
            strokeWidth={2}
          />
        </svg>
      </div>

      {/* Spin Button */}
      {!selectedIndex && (
        <button
          onClick={handleSpin}
          disabled={isSpinning || disabled}
          style={{
            marginTop: 32,
            padding: "18px 48px",
            fontSize: 22,
            fontWeight: 700,
            borderRadius: 32,
            background:
              "linear-gradient(90deg, #a78bfa 0%, #fbbf24 100%)",
            color: "#fff",
            border: "none",
            boxShadow: "0 4px 16px rgba(139, 92, 246, 0.18)",
            cursor: isSpinning || disabled ? "not-allowed" : "pointer",
            opacity: isSpinning || disabled ? 0.6 : 1,
            transition: "all 0.2s"
          }}
        >
          {isSpinning ? "Spinning..." : "Spin the Wheel!"}
        </button>
      )}
    </div>
  );
}