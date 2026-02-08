import { useState, useEffect, useCallback } from 'react';

export function ConnectionArrow({ sourceRef, targetRef, isVisible }) {
  const [pathData, setPathData] = useState(null);

  const calculatePath = useCallback(() => {
    if (!sourceRef.current || !targetRef.current) return;

    const sourceRect = sourceRef.current.getBoundingClientRect();
    const targetRect = targetRef.current.getBoundingClientRect();

    // Source: right-center of Orphaned Account card
    const sx = sourceRect.right;
    const sy = sourceRect.top + sourceRect.height / 2;

    // Target: right-center of Automated User Offboarding card
    const tx = targetRect.right;
    const ty = targetRect.top + targetRect.height / 2;

    // 90-degree path: right from source → down → left into target
    const overshoot = 40; // how far right the path extends
    const cornerX = Math.max(sx, tx) + overshoot;

    // Path: exit right → turn 90° down → turn 90° left into target
    const path = `M ${sx} ${sy} L ${cornerX} ${sy} L ${cornerX} ${ty} L ${tx} ${ty}`;

    // Label position: on the vertical segment
    const labelX = cornerX + 14;
    const labelY = (sy + ty) / 2;

    setPathData({ path, sx, sy, tx, ty, cornerX, labelX, labelY });
  }, [sourceRef, targetRef]);

  useEffect(() => {
    if (isVisible) {
      calculatePath();
      window.addEventListener('scroll', calculatePath, true);
      window.addEventListener('resize', calculatePath);
      return () => {
        window.removeEventListener('scroll', calculatePath, true);
        window.removeEventListener('resize', calculatePath);
      };
    } else {
      setPathData(null);
    }
  }, [isVisible, calculatePath]);

  if (!isVisible || !pathData) return null;

  return (
    <svg
      className="fixed inset-0 pointer-events-none"
      style={{ width: '100vw', height: '100vh', zIndex: 30 }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="12"
          markerHeight="8"
          refX="10"
          refY="4"
          orient="auto"
        >
          <polygon points="0 0, 12 4, 0 8" fill="#6B5CE7" />
        </marker>
        <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00B8A9" />
          <stop offset="100%" stopColor="#6B5CE7" />
        </linearGradient>
      </defs>
      <path
        d={pathData.path}
        fill="none"
        stroke="url(#arrowGradient)"
        strokeWidth="3"
        strokeDasharray="8 4"
        markerEnd="url(#arrowhead)"
        className="animate-dash"
      />
      {/* Pulse at source point */}
      <circle cx={pathData.sx} cy={pathData.sy} r="5" fill="#00B8A9" opacity="0.7">
        <animate attributeName="r" values="4;8;4" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.5s" repeatCount="indefinite" />
      </circle>
      {/* Label centered on the horizontal segment (source exit) */}
      <g>
        <rect
          x={(pathData.sx + pathData.cornerX) / 2 - 68}
          y={pathData.sy - 14}
          width="136"
          height="28"
          rx="14"
          fill="#6B5CE7"
        />
        <text
          x={(pathData.sx + pathData.cornerX) / 2}
          y={pathData.sy}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="11"
          fontWeight="600"
          fontFamily="Space Grotesk, sans-serif"
        >
          Triggers remediation
        </text>
      </g>
    </svg>
  );
}
