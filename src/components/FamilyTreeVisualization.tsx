import React from 'react';

import { useD3Interactions } from '../hooks/useD3Interactions';
import { FamilyMember } from '../services/api';

interface FamilyTreeVisualizationProps {
  filteredMembers: FamilyMember[];
  width: number;
  height: number;
  onMemberClick?: (member: FamilyMember) => void;
}

export function FamilyTreeVisualization({
  filteredMembers,
  width,
  height,
  onMemberClick,
}: FamilyTreeVisualizationProps) {
  const { svgRef } = useD3Interactions(filteredMembers, width, height, onMemberClick);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ border: '1px solid #ccc', borderRadius: '4px' }}
      aria-label="Interactive family tree visualization"
    />
  );
}
