import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { familyMembersService, familyTreesService } from '../src/firebase/firestore';

// Mock type for DocumentReference
type MockDocumentReference = {
  id: string;
  path: string;
  type: 'document';
  firestore: { type: 'firestore' };
  converter: null;
  parent: MockDocumentReference | null;
  withConverter: ReturnType<typeof vi.fn>;
  toJSON: ReturnType<typeof vi.fn>;
};

// Helper functions for mock data
function createMockTimestamp() {
  return { toDate: () => new Date() };
}

function createMockFamilyMemberData(overrides = {}) {
  return {
    name: 'John Doe',
    relationship: 'father',
    parentIds: [],
    childrenIds: ['2'],
    spouseId: undefined,
    createdAt: createMockTimestamp(),
    updatedAt: createMockTimestamp(),
    ...overrides,
  };
}

function createMockFamilyTreeData(overrides = {}) {
  return {
    name: 'Doe Family Tree',
    members: [],
    createdAt: createMockTimestamp(),
    updatedAt: createMockTimestamp(),
    ...overrides,
  };
}

function createMockQuerySnapshot(docs: Array<{ id: string; data: () => Record<string, unknown> }>) {
  return {
    docs: docs.map((doc) => ({
      id: doc.id,
      data: () => doc.data,
    })),
  };
}

// Mock Firebase modules before importing the services
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ type: 'firestore' })),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({ bucket: 'test' })),
}));

vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({ type: 'realtime' })),
}));

describe('Firestore Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Family Members Service', () => {
    it('should get all family members', async () => {
      const mockData = createMockFamilyMemberData();
      const mockQuerySnapshot = createMockQuerySnapshot([
        {
          id: '1',
          data: () => mockData,
        },
      ]);

      // @ts-expect-error - Mock for testing
      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot);
      // @ts-expect-error - Mock for testing
      vi.mocked(collection).mockReturnValue('mock-collection');

      const result = await familyMembersService.getAll();

      expect(collection).toHaveBeenCalledWith({ type: 'firestore' }, 'familyMembers');
      expect(getDocs).toHaveBeenCalledWith('mock-collection');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Doe');
    });

    it('should get family member by ID', async () => {
      const mockData = createMockFamilyMemberData({
        name: 'Jane Doe',
        relationship: 'mother',
        spouseId: '1',
      });
      const mockQuerySnapshot = createMockQuerySnapshot([
        {
          id: '1',
          data: () => mockData,
        },
      ]);

      // @ts-expect-error - Mock for testing
      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot);
      // @ts-expect-error - Mock for testing
      vi.mocked(query).mockReturnValue('mock-query');
      // @ts-expect-error - Mock for testing
      vi.mocked(collection).mockReturnValue('mock-collection');
      // @ts-expect-error - Mock for testing
      vi.mocked(where).mockReturnValue('mock-where');

      const result = await familyMembersService.getById('1');

      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('id', '==', '1');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Jane Doe');
    });

    it('should return null when family member not found', async () => {
      const mockQuerySnapshot = {
        empty: true,
        docs: [],
      };

      // @ts-expect-error - Mock for testing
      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot);
      // @ts-expect-error - Mock for testing
      vi.mocked(query).mockReturnValue('mock-query');

      const result = await familyMembersService.getById('nonexistent');

      expect(result).toBeNull();
    });

    it('should add new family member', async () => {
      const newMember = {
        name: 'Baby Doe',
        relationship: 'child',
        parentIds: ['1', '2'],
        childrenIds: [],
        spouseId: undefined,
      };

      const mockDocRef = { id: 'new-id' };

      // @ts-expect-error - Mock for testing
      vi.mocked(addDoc).mockResolvedValue(mockDocRef);
      // @ts-expect-error - Mock for testing
      vi.mocked(collection).mockReturnValue('mock-collection');

      const result = await familyMembersService.add(newMember);

      expect(addDoc).toHaveBeenCalledWith('mock-collection', {
        ...newMember,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(result).toBe('new-id');
    });

    it('should update family member', async () => {
      const updates = { name: 'Updated Name' };
      const mockDocRef = {
        id: '1',
        path: 'familyMembers/1',
        type: 'document' as const,
        firestore: { type: 'firestore' },
        converter: null,
        parent: null,
        withConverter: vi.fn(),
        toJSON: vi.fn(),
      };

      vi.mocked(updateDoc).mockResolvedValue(undefined);
      // @ts-expect-error - Mock for testing
      vi.mocked(doc).mockReturnValue(mockDocRef);

      await familyMembersService.update('1', updates);

      expect(doc).toHaveBeenCalledWith({ type: 'firestore' }, 'familyMembers', '1');
      expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
        ...updates,
        updatedAt: expect.any(Date),
      });
    });

    it('should delete family member', async () => {
      const mockDocRef: MockDocumentReference = {
        id: '1',
        path: 'familyMembers/1',
        type: 'document' as const,
        firestore: { type: 'firestore' },
        converter: null,
        parent: null,
        withConverter: vi.fn(),
        toJSON: vi.fn(),
      };

      vi.mocked(deleteDoc).mockResolvedValue(undefined);
      // @ts-expect-error - Mock for testing
      vi.mocked(doc).mockReturnValue(mockDocRef);

      await familyMembersService.delete('1');

      expect(doc).toHaveBeenCalledWith({ type: 'firestore' }, 'familyMembers', '1');
      expect(deleteDoc).toHaveBeenCalledWith(mockDocRef);
    });

    it('should get family members by relationship', async () => {
      const mockData = createMockFamilyMemberData();
      const mockQuerySnapshot = createMockQuerySnapshot([
        {
          id: '1',
          data: () => mockData,
        },
      ]);

      // @ts-expect-error - Mock for testing
      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot);
      // @ts-expect-error - Mock for testing
      vi.mocked(query).mockReturnValue('mock-query');
      // @ts-expect-error - Mock for testing
      vi.mocked(collection).mockReturnValue('mock-collection');
      // @ts-expect-error - Mock for testing
      vi.mocked(orderBy).mockReturnValue('mock-orderby');
      // @ts-expect-error - Mock for testing
      vi.mocked(where).mockReturnValue('mock-where');

      const result = await familyMembersService.getByRelationship('father');

      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('relationship', '==', 'father');
      expect(orderBy).toHaveBeenCalledWith('name');
      expect(result).toHaveLength(1);
    });
  });

  describe('Family Trees Service', () => {
    it('should get all family trees', async () => {
      const mockData = createMockFamilyTreeData();
      const mockQuerySnapshot = createMockQuerySnapshot([
        {
          id: 'tree-1',
          data: () => mockData,
        },
      ]);

      // @ts-expect-error - Mock for testing
      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot);
      // @ts-expect-error - Mock for testing
      vi.mocked(collection).mockReturnValue('mock-collection');

      const result = await familyTreesService.getAll();

      expect(collection).toHaveBeenCalledWith({ type: 'firestore' }, 'familyTrees');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Doe Family Tree');
    });

    it('should add new family tree', async () => {
      const newTree = {
        name: 'Smith Family Tree',
        members: [],
      };

      const mockDocRef = { id: 'tree-new' };

      // @ts-expect-error - Mock for testing
      vi.mocked(addDoc).mockResolvedValue(mockDocRef);
      // @ts-expect-error - Mock for testing
      vi.mocked(collection).mockReturnValue('mock-collection');

      const result = await familyTreesService.add(newTree);

      expect(addDoc).toHaveBeenCalledWith('mock-collection', {
        ...newTree,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(result).toBe('tree-new');
    });

    it('should update family tree', async () => {
      const updates = { name: 'Updated Family Tree' };
      const mockDocRef: MockDocumentReference = {
        id: 'tree-1',
        path: 'familyTrees/tree-1',
        type: 'document' as const,
        firestore: { type: 'firestore' },
        converter: null,
        parent: null,
        withConverter: vi.fn(),
        toJSON: vi.fn(),
      };

      vi.mocked(updateDoc).mockResolvedValue(undefined);
      // @ts-expect-error - Mock for testing
      vi.mocked(doc).mockReturnValue(mockDocRef);

      await familyTreesService.update('tree-1', updates);

      expect(doc).toHaveBeenCalledWith({ type: 'firestore' }, 'familyTrees', 'tree-1');
      expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
        ...updates,
        updatedAt: expect.any(Date),
      });
    });

    it('should delete family tree', async () => {
      const mockDocRef: MockDocumentReference = {
        id: 'tree-1',
        path: 'familyTrees/tree-1',
        type: 'document' as const,
        firestore: { type: 'firestore' },
        converter: null,
        parent: null,
        withConverter: vi.fn(),
        toJSON: vi.fn(),
      };

      vi.mocked(deleteDoc).mockResolvedValue(undefined);
      // @ts-expect-error - Mock for testing
      vi.mocked(doc).mockReturnValue(mockDocRef);

      await familyTreesService.delete('tree-1');

      expect(doc).toHaveBeenCalledWith({ type: 'firestore' }, 'familyTrees', 'tree-1');
      expect(deleteDoc).toHaveBeenCalledWith(mockDocRef);
    });
  });
});
