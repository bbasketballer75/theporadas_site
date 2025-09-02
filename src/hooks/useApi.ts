import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  FamilyMember,
  GuestMessage,
  familyMembersService,
  guestMessagesService,
} from '../services/api';

/**
 * React Query hooks for API data management with caching and performance optimization
 * Provides hooks for family members, guest messages, and related operations
 * @module useApi
 */

// React Query hooks for better caching and performance
/**
 * Hook to fetch all family members with caching
 * @returns Query object with family members data, loading state, and error handling
 * @example
 * ```typescript
 * const { data: members, isLoading, error } = useFamilyMembers();
 * ```
 */
export const useFamilyMembers = () => {
  return useQuery({
    queryKey: ['family-members'],
    queryFn: () => familyMembersService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  });
};

/**
 * Hook to fetch a specific family member by ID
 * @param id - The family member ID to fetch
 * @returns Query object with family member data, loading state, and error handling
 * @example
 * ```typescript
 * const { data: member, isLoading, error } = useFamilyMember('member-123');
 * ```
 */
export const useFamilyMember = (id: string) => {
  return useQuery({
    queryKey: ['family-member', id],
    queryFn: () => familyMembersService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
  });
};

/**
 * Hook to fetch family members by relationship type
 * @param relationship - The relationship type to filter by (e.g., 'parent', 'child')
 * @returns Query object with filtered family members data
 * @example
 * ```typescript
 * const { data: parents, isLoading } = useFamilyMembersByRelationship('parent');
 * ```
 */
export const useFamilyMembersByRelationship = (relationship: string) => {
  return useQuery({
    queryKey: ['family-members', 'relationship', relationship],
    queryFn: () => familyMembersService.getByRelationship(relationship),
    enabled: !!relationship,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
  });
};

/**
 * Hook to fetch all guest messages with shorter cache time
 * @returns Query object with guest messages data
 * @example
 * ```typescript
 * const { data: messages, isLoading, error } = useGuestMessages();
 * ```
 */
export const useGuestMessages = () => {
  return useQuery({
    queryKey: ['guest-messages'],
    queryFn: () => guestMessagesService.getAll(),
    staleTime: 2 * 60 * 1000, // 2 minutes (guest messages change more frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};

/**
 * Hook to add a new guest message with cache invalidation
 * @returns Mutation object for adding guest messages
 * @example
 * ```typescript
 * const addMessage = useAddGuestMessage();
 * addMessage.mutate({ name: 'John', message: 'Congratulations!' });
 * ```
 */
export const useAddGuestMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: Omit<GuestMessage, 'id' | 'createdAt'>) =>
      guestMessagesService.add(message),
    onSuccess: () => {
      // Invalidate and refetch guest messages
      queryClient.invalidateQueries({ queryKey: ['guest-messages'] });
    },
  });
};

/**
 * Hook to add a new family member with cache invalidation
 * @returns Mutation object for adding family members
 * @example
 * ```typescript
 * const addMember = useAddFamilyMember();
 * addMember.mutate({ name: 'Jane Doe', relationship: 'sibling' });
 * ```
 */
export const useAddFamilyMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (member: Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt'>) =>
      familyMembersService.add(member),
    onSuccess: () => {
      // Invalidate and refetch family members
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
    },
  });
};

/**
 * Hook to update an existing family member with cache invalidation
 * @returns Mutation object for updating family members
 * @example
 * ```typescript
 * const updateMember = useUpdateFamilyMember();
 * updateMember.mutate({ id: 'member-123', updates: { name: 'Jane Smith' } });
 * ```
 */
export const useUpdateFamilyMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<FamilyMember> }) =>
      familyMembersService.update(id, updates),
    onSuccess: () => {
      // Invalidate and refetch family members
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
    },
  });
};

/**
 * Hook to delete a family member with cache invalidation
 * @returns Mutation object for deleting family members
 * @example
 * ```typescript
 * const deleteMember = useDeleteFamilyMember();
 * deleteMember.mutate('member-123');
 * ```
 */
export const useDeleteFamilyMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => familyMembersService.delete(id),
    onSuccess: () => {
      // Invalidate and refetch family members
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
    },
  });
};
