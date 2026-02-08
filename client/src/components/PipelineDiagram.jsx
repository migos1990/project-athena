export function PipelineDiagram({ activeNodes = [], selectedNode, onNodeClick }) {
  const isActive = (nodeId) => activeNodes.includes(nodeId);
  const isSelected = (nodeId) => selectedNode === nodeId;

  // Layout constants
  const VB_W = 1200;
  const VB_H = 500;
  const MAIN_W = 130;
  const MAIN_H = 46;
  const BRANCH_W = 125;
  const BRANCH_H = 42;
  const MAIN_Y = 250;
  const TOP_Y = 80;
  const BOTTOM_Y = 420;

  // Main pipeline flow (left to right)
  const mainNodes = [
    { id: 'needAccess', label: 'Need Access', cx: 100 },
    { id: 'presentLogin', label: 'Present Login Options', cx: 280 },
    { id: 'verifyIdentity', label: 'Verify Identity', cx: 460 },
    { id: 'mfa', label: 'MFA', cx: 640 },
    { id: 'enrichUser', label: 'Enrich User', cx: 820 },
    { id: 'grantAccess', label: 'Grant Access', cx: 1000 },
  ];

  // Security Evaluations (top branches)
  const topBranches = [
    { id: 'identityVerification', label: 'Identity Verification', cx: 380, connectsTo: 'verifyIdentity' },
    { id: 'breachedPassword', label: 'Breached Password Detection', cx: 540, connectsTo: 'verifyIdentity' },
    { id: 'customSecurity', label: 'Custom Security Remediations', cx: 720, connectsTo: 'mfa' },
    { id: 'caep', label: 'CAEP', cx: 920, connectsTo: 'grantAccess' },
  ];

  // Unified Security Outcomes (bottom branches)
  const bottomBranches = [
    { id: 'devicePosture', label: 'Device Posture Checks', cx: 560, connectsTo: 'mfa' },
    { id: 'deviceAssurance', label: 'Device Assurance Policies', cx: 720, connectsTo: 'mfa' },
    { id: 'tokenHooks', label: 'Token Inline Hooks', cx: 880, connectsTo: 'enrichUser' },
  ];

  // Styles
  const INACTIVE = { fill: '#F3F4F6', stroke: '#D1D5DB', text: '#9CA3AF' };
  const ACTIVE = { fill: '#3f59e4', stroke: '#2d46c7', text: '#FFFFFF' };
  const SELECTED = { fill: '#1e3a8a', stroke: '#1e40af', text: '#FFFFFF' };
  const getStyle = (id) => {
    if (isSelected(id)) return SELECTED;
    if (isActive(id)) return ACTIVE;
    return INACTIVE;
  };
  const getMainNode = (id) => mainNodes.find(n => n.id === id);

  const handleClick = (nodeId) => {
    onNodeClick?.(nodeId === selectedNode ? null : nodeId);
  };

  const renderNode = (node, cy, w, h, fontSize) => {
    const s = getStyle(node.id);
    const selected = isSelected(node.id);
    return (
      <g key={node.id} onClick={() => handleClick(node.id)} style={{ cursor: 'pointer' }}>
        {/* Selection ring */}
        {selected && (
          <rect
            x={node.cx - w / 2 - 4} y={cy - h / 2 - 4}
            width={w + 8} height={h + 8} rx={13}
            fill="none" stroke="#3f59e4" strokeWidth="2" strokeDasharray="4 2"
            opacity="0.6"
          />
        )}
        <rect
          x={node.cx - w / 2} y={cy - h / 2}
          width={w} height={h} rx={10}
          fill={s.fill} stroke={s.stroke} strokeWidth="1.5"
          filter="url(#nodeShadow)"
        />
        <foreignObject x={node.cx - w / 2 + 4} y={cy - h / 2} width={w - 8} height={h}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: '100%',
            fontSize, fontWeight: 600, textAlign: 'center',
            color: s.text, fontFamily: "'Space Grotesk', sans-serif",
            lineHeight: '1.2', cursor: 'pointer',
          }}>
            {node.label}
          </div>
        </foreignObject>
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="pipelineArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#D1D5DB" />
        </marker>
        <marker id="pipelineArrowActive" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#3f59e4" />
        </marker>
        <filter id="nodeShadow" x="-5%" y="-5%" width="110%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* Layer background bands */}
      <rect x="20" y={TOP_Y - 32} width={VB_W - 40} height={BRANCH_H + 22} rx="8" fill="#FFF7ED" opacity="0.6" />
      <rect x="20" y={MAIN_Y - 34} width={VB_W - 40} height={MAIN_H + 22} rx="8" fill="#EFF6FF" opacity="0.5" />
      <rect x="20" y={BOTTOM_Y - 32} width={VB_W - 40} height={BRANCH_H + 22} rx="8" fill="#F0FDF4" opacity="0.6" />

      {/* Layer labels */}
      <text x="30" y={TOP_Y - 38} fontSize="9" fill="#B45309" fontWeight="600" letterSpacing="0.8" fontFamily="'Space Grotesk', sans-serif">
        SECURITY EVALUATIONS
      </text>
      <text x="30" y={MAIN_Y - 40} fontSize="9" fill="#1E40AF" fontWeight="600" letterSpacing="0.8" fontFamily="'Space Grotesk', sans-serif">
        INTEGRATIONS & WORKFLOWS
      </text>
      <text x="30" y={BOTTOM_Y - 38} fontSize="9" fill="#166534" fontWeight="600" letterSpacing="0.8" fontFamily="'Space Grotesk', sans-serif">
        UNIFIED SECURITY OUTCOMES
      </text>

      {/* Dashed connectors — top branches to main nodes */}
      {topBranches.map(branch => {
        const main = getMainNode(branch.connectsTo);
        const bothActive = isActive(branch.id) && isActive(branch.connectsTo);
        return (
          <line key={`tc-${branch.id}`}
            x1={branch.cx} y1={TOP_Y + BRANCH_H / 2}
            x2={main.cx} y2={MAIN_Y - MAIN_H / 2}
            stroke={bothActive ? '#3f59e4' : '#E5E7EB'}
            strokeWidth="1.5" strokeDasharray="4 3"
          />
        );
      })}

      {/* Dashed connectors — bottom branches to main nodes */}
      {bottomBranches.map(branch => {
        const main = getMainNode(branch.connectsTo);
        const bothActive = isActive(branch.id) && isActive(branch.connectsTo);
        return (
          <line key={`bc-${branch.id}`}
            x1={branch.cx} y1={BOTTOM_Y - BRANCH_H / 2}
            x2={main.cx} y2={MAIN_Y + MAIN_H / 2}
            stroke={bothActive ? '#3f59e4' : '#E5E7EB'}
            strokeWidth="1.5" strokeDasharray="4 3"
          />
        );
      })}

      {/* Main flow arrows between nodes */}
      {mainNodes.slice(0, -1).map((node, i) => {
        const next = mainNodes[i + 1];
        const bothActive = isActive(node.id) && isActive(next.id);
        return (
          <line key={`arrow-${i}`}
            x1={node.cx + MAIN_W / 2 + 2} y1={MAIN_Y}
            x2={next.cx - MAIN_W / 2 - 2} y2={MAIN_Y}
            stroke={bothActive ? '#3f59e4' : '#D1D5DB'}
            strokeWidth="2"
            markerEnd={bothActive ? 'url(#pipelineArrowActive)' : 'url(#pipelineArrow)'}
          />
        );
      })}

      {/* Render all nodes (on top of connectors) */}
      {mainNodes.map(node => renderNode(node, MAIN_Y, MAIN_W, MAIN_H, '12px'))}
      {topBranches.map(node => renderNode(node, TOP_Y, BRANCH_W, BRANCH_H, '10px'))}
      {bottomBranches.map(node => renderNode(node, BOTTOM_Y, BRANCH_W, BRANCH_H, '10px'))}
    </svg>
  );
}
