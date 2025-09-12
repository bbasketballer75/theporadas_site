import React from 'react';

interface FamilyTreeSearchProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export function FamilyTreeSearch({ searchTerm, setSearchTerm }: FamilyTreeSearchProps) {
  return (
    <div className="family-tree-search" style={{ marginBottom: '10px' }}>
      <input
        type="text"
        placeholder="Search family members..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: '100%',
          padding: '8px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '14px',
        }}
        data-testid="family-tree-search"
      />
    </div>
  );
}
