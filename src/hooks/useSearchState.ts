import { useCallback, useEffect, useState } from 'react';

import { FamilyMember } from '../services/api';

export function useSearchState(initialMembers: FamilyMember[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMembers, setFilteredMembers] = useState<FamilyMember[]>(initialMembers);

  // Filter members based on search term
  const filterMembers = useCallback((members: FamilyMember[], term: string) => {
    if (!term.trim()) return members;

    const lowerTerm = term.toLowerCase();
    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(lowerTerm) ||
        member.relationship.toLowerCase().includes(lowerTerm) ||
        (member.description && member.description.toLowerCase().includes(lowerTerm)) ||
        (member.birthDate && member.birthDate.toLowerCase().includes(lowerTerm)),
    );
  }, []);

  // Update filtered members when search term or family members change
  useEffect(() => {
    setFilteredMembers(filterMembers(initialMembers, searchTerm));
  }, [initialMembers, searchTerm, filterMembers]);

  return {
    searchTerm,
    setSearchTerm,
    filteredMembers,
  };
}
