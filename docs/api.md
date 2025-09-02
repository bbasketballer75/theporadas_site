# API Documentation

## Overview

This document provides comprehensive documentation for the wedding website's API layer, including service methods, React Query hooks, data types, and usage examples.

## Architecture

The API layer consists of:
- **Service Layer** (`src/services/api.ts`): Low-level API calls with error handling and retries
- **React Query Hooks** (`src/hooks/useApi.ts`): High-level hooks for data fetching and mutations
- **Type Definitions**: TypeScript interfaces for all data structures

## Data Types

### FamilyMember

```typescript
interface FamilyMember {
  id?: string;                    // Unique identifier
  name: string;                   // Full name
  relationship: string;           // Relationship type (parent, child, sibling, etc.)
  birthDate?: string;             // ISO date string
  photoUrl?: string;              // Photo URL
  description?: string;           // Biography/description
  parentIds: string[];            // Array of parent member IDs
  childrenIds: string[];          // Array of children member IDs
  spouseId?: string;              // Spouse member ID
  createdAt: Date;                // Creation timestamp
  updatedAt: Date;                // Last update timestamp
}
```

### FamilyTree

```typescript
interface FamilyTree {
  id: string;                     // Unique identifier
  name: string;                   // Tree name
  members: FamilyMember[];        // Array of family members
  createdAt: Date;                // Creation timestamp
  updatedAt: Date;                // Last update timestamp
}
```

### GuestMessage

```typescript
interface GuestMessage {
  id?: string;                    // Unique identifier
  name: string;                   // Guest name
  email?: string;                 // Guest email (optional)
  message: string;                // Message content
  createdAt: Date;                // Creation timestamp
}
```

## Service Methods

### Family Members Service

#### `getAll(): Promise<FamilyMember[]>`
Retrieves all family members from the API.

**Returns:** Array of family members with dates converted to Date objects

**Example:**
```typescript
const members = await familyMembersService.getAll();
```

#### `getById(id: string): Promise<FamilyMember | null>`
Retrieves a specific family member by ID.

**Parameters:**
- `id`: Family member ID

**Returns:** Family member object or null if not found

**Example:**
```typescript
const member = await familyMembersService.getById('member-123');
```

#### `add(member): Promise<string>`
Creates a new family member.

**Parameters:**
- `member`: Family member data (excluding id, createdAt, updatedAt)

**Returns:** ID of the created member

**Example:**
```typescript
const memberId = await familyMembersService.add({
  name: 'John Doe',
  relationship: 'parent',
  parentIds: [],
  childrenIds: []
});
```

#### `update(id, updates): Promise<void>`
Updates an existing family member.

**Parameters:**
- `id`: Family member ID
- `updates`: Partial family member data

**Example:**
```typescript
await familyMembersService.update('member-123', {
  name: 'Jane Doe',
  description: 'Updated bio'
});
```

#### `delete(id): Promise<void>`
Deletes a family member.

**Parameters:**
- `id`: Family member ID

**Example:**
```typescript
await familyMembersService.delete('member-123');
```

#### `getByRelationship(relationship): Promise<FamilyMember[]>`
Retrieves family members by relationship type.

**Parameters:**
- `relationship`: Relationship type to filter by

**Returns:** Array of family members with the specified relationship

**Example:**
```typescript
const parents = await familyMembersService.getByRelationship('parent');
```

### Guest Messages Service

#### `getAll(): Promise<GuestMessage[]>`
Retrieves all guest messages.

**Returns:** Array of guest messages with dates converted to Date objects

**Example:**
```typescript
const messages = await guestMessagesService.getAll();
```

#### `add(message): Promise<string>`
Creates a new guest message.

**Parameters:**
- `message`: Guest message data (excluding id, createdAt)

**Returns:** ID of the created message

**Example:**
```typescript
const messageId = await guestMessagesService.add({
  name: 'John Smith',
  email: 'john@example.com',
  message: 'Congratulations on your wedding!'
});
```

### Image Processing Service

#### `processImage(imageFile): Promise<{ processedUrl: string }>`
Processes an uploaded image file.

**Parameters:**
- `imageFile`: File object to process

**Returns:** Object containing the processed image URL

**Example:**
```typescript
const result = await imageProcessingService.processImage(imageFile);
console.log('Processed image URL:', result.processedUrl);
```

## React Query Hooks

### Query Hooks

#### `useFamilyMembers()`
Fetches all family members with caching.

**Returns:** Query object with `data`, `isLoading`, `error`, etc.

**Cache Settings:**
- Stale time: 5 minutes
- GC time: 10 minutes
- Retries: 3

**Example:**
```typescript
const { data: members, isLoading, error } = useFamilyMembers();

if (isLoading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;

return (
  <ul>
    {members?.map(member => (
      <li key={member.id}>{member.name}</li>
    ))}
  </ul>
);
```

#### `useFamilyMember(id)`
Fetches a specific family member by ID.

**Parameters:**
- `id`: Family member ID

**Returns:** Query object with single member data

**Example:**
```typescript
const { data: member, isLoading } = useFamilyMember('member-123');
```

#### `useFamilyMembersByRelationship(relationship)`
Fetches family members by relationship type.

**Parameters:**
- `relationship`: Relationship type to filter by

**Returns:** Query object with filtered members

**Example:**
```typescript
const { data: parents } = useFamilyMembersByRelationship('parent');
```

#### `useGuestMessages()`
Fetches all guest messages.

**Cache Settings:**
- Stale time: 2 minutes (shorter for frequently changing data)
- GC time: 5 minutes
- Retries: 3

**Example:**
```typescript
const { data: messages, isLoading } = useGuestMessages();
```

### Mutation Hooks

#### `useAddFamilyMember()`
Adds a new family member with automatic cache invalidation.

**Returns:** Mutation object with `mutate`, `isPending`, `error`, etc.

**Example:**
```typescript
const addMember = useAddFamilyMember();

const handleSubmit = (memberData) => {
  addMember.mutate(memberData, {
    onSuccess: () => {
      console.log('Member added successfully');
    },
    onError: (error) => {
      console.error('Failed to add member:', error);
    }
  });
};
```

#### `useUpdateFamilyMember()`
Updates an existing family member.

**Example:**
```typescript
const updateMember = useUpdateFamilyMember();

updateMember.mutate({
  id: 'member-123',
  updates: { name: 'Updated Name' }
});
```

#### `useDeleteFamilyMember()`
Deletes a family member.

**Example:**
```typescript
const deleteMember = useDeleteFamilyMember();

deleteMember.mutate('member-123');
```

#### `useAddGuestMessage()`
Adds a new guest message.

**Example:**
```typescript
const addMessage = useAddGuestMessage();

addMessage.mutate({
  name: 'John Doe',
  message: 'Best wishes!'
});
```

## Error Handling

The API layer includes comprehensive error handling:

### HTTP Error Codes
- `404`: Resource not found
- `429`: Too many requests (rate limited)
- `500`: Server error
- `403`: Access denied
- `401`: Authentication required

### Automatic Retries
- Failed requests are automatically retried up to 3 times
- Exponential backoff delay (1s, 2s, 4s)
- Maximum delay capped at 5 seconds

### Timeout Handling
- Requests timeout after 10 seconds
- Timeout errors are properly handled and reported

## Best Practices

### Data Fetching
1. Use React Query hooks instead of direct service calls for caching benefits
2. Handle loading and error states in your components
3. Use appropriate cache times based on data change frequency

### Error Handling
1. Always check for error states in your components
2. Provide user-friendly error messages
3. Handle network errors gracefully

### Performance
1. Use the appropriate query keys for cache invalidation
2. Consider data dependencies when invalidating queries
3. Use optimistic updates for better UX when appropriate

### Type Safety
1. Use the provided TypeScript interfaces
2. Leverage type inference from React Query hooks
3. Validate data at runtime when necessary

## Environment Configuration

Set the following environment variable:

```bash
VITE_API_BASE_URL=https://your-api-endpoint.com
```

## Examples

### Complete Component Example

```typescript
import React from 'react';
import { useFamilyMembers, useAddFamilyMember } from '../hooks/useApi';

const FamilyMembersList: React.FC = () => {
  const { data: members, isLoading, error } = useFamilyMembers();
  const addMember = useAddFamilyMember();

  if (isLoading) return <div>Loading family members...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const handleAddMember = () => {
    addMember.mutate({
      name: 'New Member',
      relationship: 'child',
      parentIds: [],
      childrenIds: []
    });
  };

  return (
    <div>
      <button onClick={handleAddMember} disabled={addMember.isPending}>
        {addMember.isPending ? 'Adding...' : 'Add Member'}
      </button>

      <ul>
        {members?.map(member => (
          <li key={member.id}>
            {member.name} - {member.relationship}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FamilyMembersList;
```

### Guest Book Component

```typescript
import React, { useState } from 'react';
import { useGuestMessages, useAddGuestMessage } from '../hooks/useApi';

const GuestBook: React.FC = () => {
  const { data: messages } = useGuestMessages();
  const addMessage = useAddGuestMessage();
  const [formData, setFormData] = useState({ name: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMessage.mutate(formData, {
      onSuccess: () => {
        setFormData({ name: '', message: '' });
      }
    });
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Your name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
        <textarea
          placeholder="Your message"
          value={formData.message}
          onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
          required
        />
        <button type="submit" disabled={addMessage.isPending}>
          {addMessage.isPending ? 'Sending...' : 'Send Message'}
        </button>
      </form>

      <div>
        {messages?.map(message => (
          <div key={message.id}>
            <strong>{message.name}</strong>: {message.message}
            <small>{message.createdAt.toLocaleDateString()}</small>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GuestBook;