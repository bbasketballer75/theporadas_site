# Firebase Functions for The Poradas Wedding Website

This directory contains Firebase Cloud Functions that provide backend services for the wedding website, including family tree management, guest interactions, and image processing.

## Available Functions

### Family Tree Functions

#### `get_family_tree`

- **Method**: GET
- **Purpose**: Retrieve family tree data for visualization
- **Response**: Hierarchical family tree structure with all members
- **Usage**: Called by the FamilyTree component to load and display family relationships

#### `add_family_member`

- **Method**: POST
- **Purpose**: Add a new family member to the database
- **Required Fields**:
  - `name`: Family member's name
  - `relationship`: Relationship to the couple (e.g., "parent", "sibling", "cousin")
- **Optional Fields**:
  - `parentIds`: Array of parent member IDs
  - `spouseId`: Spouse member ID
  - `photoUrl`: Profile photo URL
  - `birthDate`: Birth date
  - `description`: Additional information
- **Response**: New member ID and success confirmation

### Guest Interaction Functions

#### `process_guest_message`

- **Method**: POST
- **Purpose**: Process and store guest messages with content moderation
- **Required Fields**:
  - `guestName`: Guest's name
  - `message`: Message content
- **Optional Fields**:
  - `type`: Message type ("message", "question", "well-wish")
- **Features**:
  - Basic content moderation
  - Automatic timestamping
  - Live statistics updates
- **Response**: Message ID and processing confirmation

#### `get_guest_messages`

- **Method**: GET
- **Purpose**: Retrieve guest messages with pagination and filtering
- **Query Parameters**:
  - `limit`: Number of messages to return (default: 50)
  - `offset`: Pagination offset (default: 0)
  - `type`: Filter by message type
- **Response**: Array of guest messages with metadata

### Image Processing Functions

#### `process_gallery_image`

- **Method**: POST
- **Purpose**: Process uploaded gallery images with resizing and optimization
- **Required Fields**:
  - `imageUrl`: URL of the image to process
  - `filename`: Original filename
- **Features**:
  - Automatic resizing to multiple sizes (thumbnail, medium, large)
  - WebP conversion for better compression
  - Upload to Firebase Storage
  - Public URL generation
- **Response**: URLs for all processed image sizes

### Utility Functions

#### `health_check`

- **Method**: GET
- **Purpose**: Health check endpoint for monitoring
- **Response**: Service status and timestamp

## Deployment

### Prerequisites

1. Firebase CLI installed and authenticated
2. Python 3.12 runtime available
3. Firebase project configured

### Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:get_family_tree

# Deploy with environment variables
firebase functions:config:set app.env="production"
firebase deploy --only functions
```

### Local Development

```bash
# Start Firebase emulators
firebase emulators:start

# Test functions locally
curl http://localhost:5001/wedding-site-final/us-central1/get_family_tree
```

## Configuration

### Environment Variables

- `PYTHONPATH`: Set to `/workspace/functions` for proper module resolution

### Runtime Settings

- **Runtime**: Python 3.12
- **Memory**: 1GB
- **Timeout**: 540 seconds (9 minutes)
- **Max Instances**: 10 (for cost control)

## Dependencies

Key dependencies include:

- `firebase-functions`: Firebase Functions SDK
- `firebase-admin`: Firebase Admin SDK for database access
- `Pillow`: Image processing library
- `requests`: HTTP client for image downloads
- `python-dateutil`: Date/time utilities

## Security Considerations

1. **Content Moderation**: Basic inappropriate content filtering
2. **Rate Limiting**: Max instances limit prevents abuse
3. **Input Validation**: Required field validation on all endpoints
4. **Error Handling**: Comprehensive error handling with appropriate HTTP status codes

## Monitoring

Functions include logging for:

- Successful operations
- Error conditions
- Performance metrics
- Content moderation actions

Monitor function performance through:

- Firebase Console > Functions
- Cloud Logging
- Custom metrics in live statistics

## Future Enhancements

Potential additions:

- Email notifications for new messages
- Advanced image processing (face detection, auto-tagging)
- Real-time notifications via Firebase Cloud Messaging
- Analytics and reporting functions
- Backup and data export functions
