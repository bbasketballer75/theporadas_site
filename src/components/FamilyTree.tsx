/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';

import { FamilyMember, familyMembersService } from '../services/api';
import { FamilyTreeVisualization } from './FamilyTreeVisualization';
import { FamilyTreeSearch } from './FamilyTreeSearch';
import { FamilyTreeControls } from './FamilyTreeControls';
import { useSearchState } from '../hooks/useSearchState';
import { useD3Interactions } from '../hooks/useD3Interactions';

export default function FamilyTree({
  onMemberClick,
  width = 1000,
  height = 800,
}: {
  onMemberClick?: (member: FamilyMember) => void;
  width?: number;
  height?: number;
}) {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { searchTerm, setSearchTerm, filteredMembers } = useSearchState(familyMembers);
  const { svgRef } = useD3Interactions(filteredMembers, width, height, onMemberClick);

  // Load family members data
  useEffect(() => {
    const loadFamilyData = async () => {
      try {
        setLoading(true);
        // Add timeout to API call
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('API request timed out')), 5000);
        });
        const dataPromise = familyMembersService.getAll();
        const members = (await Promise.race([dataPromise, timeoutPromise])) as FamilyMember[];
        setFamilyMembers(members);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load family data');
        console.error('Error loading family data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFamilyData();
  }, []);

  if (loading) {
    return (
      <div
        className="family-tree-loading"
        style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div>Loading family tree...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="family-tree-error"
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'red',
        }}
      >
        <div>{error}</div>
      </div>
    );
  }

  if (familyMembers.length === 0) {
    return (
      <div
        className="family-tree-empty"
        style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div>No family members found</div>
      </div>
    );
  }

  return (
    <div
      className="family-tree-container"
      style={{ width, height }}
      data-loading={loading ? 'true' : 'false'}
      data-rendered={familyMembers.length > 0 && !loading ? 'true' : 'false'}
      data-testid="family-tree"
    >
      <FamilyTreeSearch searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      <FamilyTreeVisualization
        filteredMembers={filteredMembers}
        width={width}
        height={height}
        onMemberClick={onMemberClick}
      />
      <FamilyTreeControls svgRef={svgRef} width={width} height={height} />
    </div>
  );
}