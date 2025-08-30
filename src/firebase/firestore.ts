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

import { db } from './config';

// Family tree data types
export interface FamilyMember {
  id?: string;
  name: string;
  relationship: string;
  birthDate?: string;
  photoUrl?: string;
  description?: string;
  parentIds: string[];
  childrenIds: string[];
  spouseId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyTree {
  id: string;
  name: string;
  members: FamilyMember[];
  createdAt: Date;
  updatedAt: Date;
}

// Firestore collection references
const FAMILY_MEMBERS_COLLECTION = 'familyMembers';
const FAMILY_TREES_COLLECTION = 'familyTrees';

// Family Members CRUD operations
export const familyMembersService = {
  // Get all family members
  async getAll(): Promise<FamilyMember[]> {
    const querySnapshot = await getDocs(collection(db, FAMILY_MEMBERS_COLLECTION));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as FamilyMember[];
  },

  // Get family member by ID
  async getById(id: string): Promise<FamilyMember | null> {
    const q = query(collection(db, FAMILY_MEMBERS_COLLECTION), where('id', '==', id));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      return {
        id: querySnapshot.docs[0].id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as FamilyMember;
    }
    return null;
  },

  // Add new family member
  async add(member: Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date();
    const docRef = await addDoc(collection(db, FAMILY_MEMBERS_COLLECTION), {
      ...member,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  },

  // Update family member
  async update(id: string, updates: Partial<FamilyMember>): Promise<void> {
    const docRef = doc(db, FAMILY_MEMBERS_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    });
  },

  // Delete family member
  async delete(id: string): Promise<void> {
    const docRef = doc(db, FAMILY_MEMBERS_COLLECTION, id);
    await deleteDoc(docRef);
  },

  // Get family members by relationship
  async getByRelationship(relationship: string): Promise<FamilyMember[]> {
    const q = query(
      collection(db, FAMILY_MEMBERS_COLLECTION),
      where('relationship', '==', relationship),
      orderBy('name'),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as FamilyMember[];
  },
};

// Family Trees CRUD operations
export const familyTreesService = {
  // Get all family trees
  async getAll(): Promise<FamilyTree[]> {
    const querySnapshot = await getDocs(collection(db, FAMILY_TREES_COLLECTION));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as FamilyTree[];
  },

  // Get family tree by ID
  async getById(id: string): Promise<FamilyTree | null> {
    const q = query(collection(db, FAMILY_TREES_COLLECTION), where('id', '==', id));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      return {
        id: querySnapshot.docs[0].id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as FamilyTree;
    }
    return null;
  },

  // Add new family tree
  async add(tree: Omit<FamilyTree, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date();
    const docRef = await addDoc(collection(db, FAMILY_TREES_COLLECTION), {
      ...tree,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  },

  // Update family tree
  async update(id: string, updates: Partial<FamilyTree>): Promise<void> {
    const docRef = doc(db, FAMILY_TREES_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    });
  },

  // Delete family tree
  async delete(id: string): Promise<void> {
    const docRef = doc(db, FAMILY_TREES_COLLECTION, id);
    await deleteDoc(docRef);
  },
};
