# Firebase Functions for The Poradas Wedding Website
# Handles backend operations for family tree, guest interactions, and content management

# Core imports that work in both environments
from firebase_admin import initialize_app, firestore, storage, auth
from firebase_admin.exceptions import FirebaseError
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
import requests
from PIL import Image
import io
import os

# Add Flask for Cloud Run deployment
from flask import Flask, request, jsonify
from flask_cors import CORS

# Conditional Firebase Functions imports (only available in Firebase Functions environment)
try:
    from firebase_functions import https_fn, params
    from firebase_functions.options import set_global_options
    FIREBASE_FUNCTIONS_AVAILABLE = True
except ImportError:
    # Create dummy objects for Cloud Run environment
    class DummyHttpsFn:
        class Request:
            def __init__(self, method='GET', args=None, get_json=None):
                self.method = method
                self.args = args or {}
                self._get_json = get_json or (lambda: {})

            def get_json(self):
                return self._get_json()

        class Response:
            def __init__(self, data, status=200, headers=None):
                self.data = data
                self.status = status
                self.headers = headers or {}

    https_fn = DummyHttpsFn()
    params = None
    set_global_options = lambda *args, **kwargs: None
    FIREBASE_FUNCTIONS_AVAILABLE = False

# Conditional decorator for Firebase Functions
def firebase_function(func):
    """Decorator that only applies @https_fn.on_request() when Firebase Functions are available"""
    if FIREBASE_FUNCTIONS_AVAILABLE and https_fn:
        return https_fn.on_request()(func)
    else:
        # In Cloud Run, just return the function as-is
        return func

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
try:
    # In Cloud Run, Firebase credentials should be available via environment variables
    # or service account attached to the Cloud Run service
    initialize_app()
    logger.info("Firebase Admin SDK initialized successfully")
except ValueError:
    logger.info("Firebase Admin SDK already initialized")
except Exception as e:
    logger.warning(f"Firebase Admin SDK initialization failed: {e}")
    logger.info("Continuing without Firebase Admin SDK - some features may not work")

# Initialize Flask app for Cloud Run
app = Flask(__name__)

# Configure CORS for the Flask app
CORS(app, origins=[
    "http://localhost:5174",  # Vite dev server
    "http://localhost:3000",  # Alternative dev port
    "https://theporadas-site.vercel.app",  # Production Vercel domain
    "https://theporadas-site-git-main-austins-projects-*.vercel.app",  # Vercel preview deployments
    "https://wedding-functions-956393407443.us-central1.run.app"  # Firebase Functions domain
], methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], allow_headers=["Content-Type", "Authorization"])

# Set global options for cost control (only for Firebase Functions)
try:
    set_global_options(max_instances=10)
except Exception:
    pass  # Ignore if not in Firebase Functions environment

# Lazy initialization of Firebase clients
_db = None
_bucket = None

def get_firestore_client():
    """Get Firestore client with lazy initialization"""
    global _db
    if _db is None:
        try:
            _db = firestore.client()
        except Exception as e:
            logger.error(f"Failed to initialize Firestore client: {str(e)}")
            raise
    return _db

def get_storage_bucket():
    """Get Storage bucket with lazy initialization"""
    global _bucket
    if _bucket is None:
        try:
            _bucket = storage.bucket()
        except Exception as e:
            logger.error(f"Failed to initialize Storage bucket: {str(e)}")
            raise
    return _bucket

# Remove immediate client initialization
# db = firestore.client()
# bucket = storage.bucket()

# Constants
FAMILY_MEMBERS_COLLECTION = 'familyMembers'
FAMILY_TREES_COLLECTION = 'familyTrees'
GUEST_MESSAGES_COLLECTION = 'guestMessages'
GUEST_REACTIONS_COLLECTION = 'guestReactions'
LIVE_STATS_PATH = 'liveStats'

# HTTP Headers and Content Types
CONTENT_TYPE_JSON = 'application/json'

# Error Messages
ERROR_METHOD_NOT_ALLOWED = 'Method not allowed'
SERVICE_NAME = 'wedding-website-functions'

def get_current_utc_time():
    """Get current UTC time as timezone-aware datetime object"""
    return datetime.now(timezone.utc)

# =============================================================================
# FLASK ROUTES FOR CLOUD RUN DEPLOYMENT
# =============================================================================

@app.route('/health', methods=['GET'])
def health_check_flask():
    """Health check endpoint for Cloud Run"""
    return jsonify({
        'status': 'healthy',
        'timestamp': get_current_utc_time().isoformat(),
        'service': SERVICE_NAME
    })

@app.route('/family-tree', methods=['GET'])
def get_family_tree_flask():
    """Get family tree data for visualization"""
    try:
        # Get all family members
        members_ref = get_firestore_client().collection(FAMILY_MEMBERS_COLLECTION)
        members_docs = members_ref.stream()

        members = []
        for doc in members_docs:
            member_data = doc.to_dict()
            member_data['id'] = doc.id
            members.append(member_data)

        # Build hierarchical structure
        tree_data = build_family_hierarchy(members)

        return jsonify({
            'success': True,
            'data': tree_data,
            'count': len(members)
        })

    except Exception as e:
        logger.error(f"Error getting family tree: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve family tree data'
        }), 500

@app.route('/family-member', methods=['POST'])
def add_family_member_flask():
    """Add a new family member to the database"""
    try:
        data = request.get_json()
        required_fields = ['name', 'relationship']

        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400

        # Add timestamps
        now = get_current_utc_time()
        data['createdAt'] = now
        data['updatedAt'] = now

        # Add to Firestore
        doc_ref = get_firestore_client().collection(FAMILY_MEMBERS_COLLECTION).document()
        doc_ref.set(data)

        return jsonify({
            'success': True,
            'id': doc_ref.id,
            'message': 'Family member added successfully'
        }), 201

    except Exception as e:
        logger.error(f"Error adding family member: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to add family member'
        }), 500

@app.route('/guest-message', methods=['POST'])
def process_guest_message_flask():
    """Process and store guest messages with moderation"""
    try:
        data = request.get_json()
        required_fields = ['guestName', 'message']

        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400

        # Basic content moderation
        if contains_inappropriate_content(data['message']):
            return jsonify({
                'success': False,
                'error': 'Message contains inappropriate content'
            }), 400

        # Add metadata
        now = get_current_utc_time()
        data['timestamp'] = now
        data['isRead'] = False
        data['type'] = data.get('type', 'message')

        # Store in Firestore
        doc_ref = get_firestore_client().collection(GUEST_MESSAGES_COLLECTION).document()
        doc_ref.set(data)

        # Update live stats
        update_live_stats('totalMessages', increment=True)

        return jsonify({
            'success': True,
            'id': doc_ref.id,
            'message': 'Guest message processed successfully'
        }), 201

    except Exception as e:
        logger.error(f"Error processing guest message: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to process guest message'
        }), 500

@app.route('/guest-messages', methods=['GET'])
def get_guest_messages_flask():
    """Get guest messages with pagination and filtering"""
    try:
        # Parse query parameters
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        message_type = request.args.get('type')

        # Build query
        query = get_firestore_client().collection(GUEST_MESSAGES_COLLECTION).order_by('timestamp', direction=firestore.Query.DESCENDING)

        if message_type:
            query = query.where('type', '==', message_type)

        # Apply pagination
        messages_docs = query.limit(limit).offset(offset).stream()

        messages = []
        for doc in messages_docs:
            message_data = doc.to_dict()
            message_data['id'] = doc.id
            # Convert timestamp to ISO string
            if 'timestamp' in message_data and message_data['timestamp']:
                message_data['timestamp'] = message_data['timestamp'].isoformat()
            messages.append(message_data)

        return jsonify({
            'success': True,
            'data': messages,
            'count': len(messages)
        })

    except Exception as e:
        logger.error(f"Error getting guest messages: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve guest messages'
        }), 500

@app.route('/process-image', methods=['POST'])
def process_gallery_image_flask():
    """Process uploaded gallery images with resizing and optimization"""
    try:
        data = request.get_json()
        image_url = data.get('imageUrl')
        filename = data.get('filename')

        if not image_url or not filename:
            return jsonify({'success': False, 'error': 'Missing imageUrl or filename'}), 400

        # Download and process image
        response = requests.get(image_url)
        if response.status_code != 200:
            return jsonify({'success': False, 'error': 'Failed to download image'}), 400

        # Process image
        image = Image.open(io.BytesIO(response.content))

        # Create different sizes
        sizes = {
            'thumbnail': (300, 300),
            'medium': (800, 600),
            'large': (1200, 900)
        }

        processed_images = {}

        for size_name, dimensions in sizes.items():
            # Resize image
            resized_image = image.copy()
            resized_image.thumbnail(dimensions, Image.Resampling.LANCZOS)

            # Convert to WebP for better compression
            output_buffer = io.BytesIO()
            resized_image.save(output_buffer, format='WebP', quality=85)
            output_buffer.seek(0)

            # Upload to Firebase Storage
            blob_name = f"gallery/{size_name}/{filename.replace('.jpg', '.webp').replace('.png', '.webp')}"
            blob = get_storage_bucket().blob(blob_name)
            blob.upload_from_file(output_buffer, content_type='image/webp')

            # Make public
            blob.make_public()

            processed_images[size_name] = blob.public_url

        return jsonify({
            'success': True,
            'images': processed_images,
            'message': 'Image processed successfully'
        })

    except Exception as e:
        logger.error(f"Error processing gallery image: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to process image'
        }), 500

# =============================================================================
# FIREBASE FUNCTIONS (for backward compatibility)
# =============================================================================

@firebase_function
def get_family_tree(req: https_fn.Request) -> https_fn.Response:
    """Get family tree data for visualization"""
    try:
        # Get all family members
        members_ref = get_firestore_client().collection(FAMILY_MEMBERS_COLLECTION)
        members_docs = members_ref.stream()

        members = []
        for doc in members_docs:
            member_data = doc.to_dict()
            member_data['id'] = doc.id
            members.append(member_data)

        # Build hierarchical structure
        tree_data = build_family_hierarchy(members)

        return https_fn.Response(
            json.dumps({
                'success': True,
                'data': tree_data,
                'count': len(members)
            }),
            status=200,
            headers={'Content-Type': CONTENT_TYPE_JSON}
        )

    except Exception as e:
        logger.error(f"Error getting family tree: {str(e)}")
        return https_fn.Response(
            json.dumps({
                'success': False,
                'error': 'Failed to retrieve family tree data'
            }),
            status=500,
            headers={'Content-Type': CONTENT_TYPE_JSON}
        )

@firebase_function
def add_family_member(req: https_fn.Request) -> https_fn.Response:
    """Add a new family member to the database"""
    try:
        if req.method != 'POST':
            return https_fn.Response(
                json.dumps({'success': False, 'error': ERROR_METHOD_NOT_ALLOWED}),
                status=405,
                headers={'Content-Type': CONTENT_TYPE_JSON}
            )

        data = req.get_json()
        required_fields = ['name', 'relationship']

        for field in required_fields:
            if field not in data:
                return https_fn.Response(
                    json.dumps({'success': False, 'error': f'Missing required field: {field}'}),
                    status=400,
                    headers={'Content-Type': CONTENT_TYPE_JSON}
                )

        # Add timestamps
        now = get_current_utc_time()
        data['createdAt'] = now
        data['updatedAt'] = now

        # Add to Firestore
        doc_ref = get_firestore_client().collection(FAMILY_MEMBERS_COLLECTION).document()
        doc_ref.set(data)

        return https_fn.Response(
            json.dumps({
                'success': True,
                'id': doc_ref.id,
                'message': 'Family member added successfully'
            }),
            status=201,
            headers={'Content-Type': CONTENT_TYPE_JSON}
        )

    except Exception as e:
        logger.error(f"Error adding family member: {str(e)}")
        return https_fn.Response(
            json.dumps({
                'success': False,
                'error': 'Failed to add family member'
            }),
            status=500,
            headers={'Content-Type': CONTENT_TYPE_JSON}
        )

# =============================================================================
# GUEST INTERACTION FUNCTIONS
# =============================================================================

@firebase_function
def process_guest_message(req: https_fn.Request) -> https_fn.Response:
    """Process and store guest messages with moderation"""
    try:
        if req.method != 'POST':
            return https_fn.Response(
                json.dumps({'success': False, 'error': ERROR_METHOD_NOT_ALLOWED}),
                status=405,
                headers={'Content-Type': CONTENT_TYPE_JSON}
            )

        data = req.get_json()
        required_fields = ['guestName', 'message']

        for field in required_fields:
            if field not in data:
                return https_fn.Response(
                    json.dumps({'success': False, 'error': f'Missing required field: {field}'}),
                    status=400,
                    headers={'Content-Type': CONTENT_TYPE_JSON}
                )

        # Basic content moderation
        if contains_inappropriate_content(data['message']):
            return https_fn.Response(
                json.dumps({
                    'success': False,
                    'error': 'Message contains inappropriate content'
                }),
                status=400,
                headers={'Content-Type': CONTENT_TYPE_JSON}
            )

        # Add metadata
        now = get_current_utc_time()
        data['timestamp'] = now
        data['isRead'] = False
        data['type'] = data.get('type', 'message')

        # Store in Firestore
        doc_ref = get_firestore_client().collection(GUEST_MESSAGES_COLLECTION).document()
        doc_ref.set(data)

        # Update live stats
        update_live_stats('totalMessages', increment=True)

        return https_fn.Response(
            json.dumps({
                'success': True,
                'id': doc_ref.id,
                'message': 'Guest message processed successfully'
            }),
            status=201,
            headers={'Content-Type': CONTENT_TYPE_JSON}
        )

    except Exception as e:
        logger.error(f"Error processing guest message: {str(e)}")
        return https_fn.Response(
            json.dumps({
                'success': False,
                'error': 'Failed to process guest message'
            }),
            status=500,
            headers={'Content-Type': CONTENT_TYPE_JSON}
        )

@firebase_function
def get_guest_messages(req: https_fn.Request) -> https_fn.Response:
    """Get guest messages with pagination and filtering"""
    try:
        # Parse query parameters
        limit = int(req.args.get('limit', 50))
        offset = int(req.args.get('offset', 0))
        message_type = req.args.get('type')

        # Build query
        query = get_firestore_client().collection(GUEST_MESSAGES_COLLECTION).order_by('timestamp', direction=firestore.Query.DESCENDING)

        if message_type:
            query = query.where('type', '==', message_type)

        # Apply pagination
        messages_docs = query.limit(limit).offset(offset).stream()

        messages = []
        for doc in messages_docs:
            message_data = doc.to_dict()
            message_data['id'] = doc.id
            # Convert timestamp to ISO string
            if 'timestamp' in message_data and message_data['timestamp']:
                message_data['timestamp'] = message_data['timestamp'].isoformat()
            messages.append(message_data)

        return https_fn.Response(
            json.dumps({
                'success': True,
                'data': messages,
                'count': len(messages)
            }),
            status=200,
            headers={'Content-Type': CONTENT_TYPE_JSON}
        )

    except Exception as e:
        logger.error(f"Error getting guest messages: {str(e)}")
        return https_fn.Response(
            json.dumps({
                'success': False,
                'error': 'Failed to retrieve guest messages'
            }),
            status=500,
            headers={'Content-Type': CONTENT_TYPE_JSON}
        )

# =============================================================================
# IMAGE PROCESSING FUNCTIONS
# =============================================================================

@firebase_function
def process_gallery_image(req: https_fn.Request) -> https_fn.Response:
    """Process uploaded gallery images with resizing and optimization"""
    try:
        if req.method != 'POST':
            return https_fn.Response(
                json.dumps({'success': False, 'error': ERROR_METHOD_NOT_ALLOWED}),
                status=405,
                headers={'Content-Type': CONTENT_TYPE_JSON}
            )

        # Get image data from request
        data = req.get_json()
        image_url = data.get('imageUrl')
        filename = data.get('filename')

        if not image_url or not filename:
            return https_fn.Response(
                json.dumps({'success': False, 'error': 'Missing imageUrl or filename'}),
                status=400,
                headers={'Content-Type': CONTENT_TYPE_JSON}
            )

        # Download and process image
        response = requests.get(image_url)
        if response.status_code != 200:
            return https_fn.Response(
                json.dumps({'success': False, 'error': 'Failed to download image'}),
                status=400,
                headers={'Content-Type': CONTENT_TYPE_JSON}
            )

        # Process image
        image = Image.open(io.BytesIO(response.content))

        # Create different sizes
        sizes = {
            'thumbnail': (300, 300),
            'medium': (800, 600),
            'large': (1200, 900)
        }

        processed_images = {}

        for size_name, dimensions in sizes.items():
            # Resize image
            resized_image = image.copy()
            resized_image.thumbnail(dimensions, Image.Resampling.LANCZOS)

            # Convert to WebP for better compression
            output_buffer = io.BytesIO()
            resized_image.save(output_buffer, format='WebP', quality=85)
            output_buffer.seek(0)

            # Upload to Firebase Storage
            blob_name = f"gallery/{size_name}/{filename.replace('.jpg', '.webp').replace('.png', '.webp')}"
            blob = get_storage_bucket().blob(blob_name)
            blob.upload_from_file(output_buffer, content_type='image/webp')

            # Make public
            blob.make_public()

            processed_images[size_name] = blob.public_url

        return https_fn.Response(
            json.dumps({
                'success': True,
                'images': processed_images,
                'message': 'Image processed successfully'
            }),
            status=200,
            headers={'Content-Type': CONTENT_TYPE_JSON}
        )

    except Exception as e:
        logger.error(f"Error processing gallery image: {str(e)}")
        return https_fn.Response(
            json.dumps({
                'success': False,
                'error': 'Failed to process image'
            }),
            status=500,
            headers={'Content-Type': CONTENT_TYPE_JSON}
        )

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def build_family_hierarchy(members: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Build hierarchical family tree structure from flat member list"""
    # Find root members (no parents)
    root_members = [m for m in members if not m.get('parentIds', [])]

    def build_node(member: Dict[str, Any]) -> Dict[str, Any]:
        children = [m for m in members if member['id'] in m.get('parentIds', [])]
        spouse = None
        if member.get('spouseId'):
            spouse = next((m for m in members if m['id'] == member['spouseId']), None)

        return {
            'id': member['id'],
            'name': member['name'],
            'relationship': member['relationship'],
            'photoUrl': member.get('photoUrl'),
            'birthDate': member.get('birthDate'),
            'description': member.get('description'),
            'spouse': spouse,
            'children': [build_node(child) for child in children]
        }

    if root_members:
        return {
            'roots': [build_node(root) for root in root_members],
            'totalMembers': len(members)
        }
    else:
        # If no clear roots, return all members
        return {
            'members': members,
            'totalMembers': len(members)
        }

def contains_inappropriate_content(text: str) -> bool:
    """Basic content moderation - check for inappropriate content"""
    inappropriate_words = [
        'spam', 'advertisement', 'scam', 'phishing',
        # Add more inappropriate words as needed
    ]

    text_lower = text.lower()
    return any(word in text_lower for word in inappropriate_words)

def update_live_stats(field: str, increment: bool = False, value: Any = None) -> None:
    """Update live statistics in Realtime Database"""
    try:
        from firebase_admin import db as realtime_db

        stats_ref = realtime_db.reference(LIVE_STATS_PATH)
        current_stats = stats_ref.get() or {
            'totalGuests': 0,
            'activeGuests': 0,
            'totalMessages': 0,
            'totalReactions': 0,
            'lastUpdated': get_current_utc_time().isoformat()
        }

        if increment and field in current_stats:
            current_stats[field] += 1
        elif value is not None:
            current_stats[field] = value

        current_stats['lastUpdated'] = get_current_utc_time().isoformat()
        stats_ref.set(current_stats)

    except Exception as e:
        logger.error(f"Error updating live stats: {str(e)}")

# =============================================================================
# HEALTH CHECK FUNCTION
# =============================================================================

@firebase_function
def health_check(req: https_fn.Request) -> https_fn.Response:
    """Health check endpoint for monitoring"""
    return https_fn.Response(
        json.dumps({
            'status': 'healthy',
            'timestamp': get_current_utc_time().isoformat(),
            'service': SERVICE_NAME
        }),
        status=200,
        headers={'Content-Type': CONTENT_TYPE_JSON}
    )

# =============================================================================
# MAIN BLOCK FOR CLOUD RUN
# =============================================================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
