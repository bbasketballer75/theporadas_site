import React, { useEffect, useState } from 'react';

import { GuestMessage, guestMessagesService } from '../services/api';
import './GuestMessages.css';

export function GuestMessages() {
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add field-specific error state
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', message: '' });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const messagesPerPage = 10;

  // Rate limiting constants
  const MAX_MESSAGES_PER_HOUR = 3;
  const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
  const STORAGE_KEY = 'guestbook_submissions';

  // Rate limiting functions
  const getStoredSubmissions = (): number[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const storeSubmission = (timestamp: number) => {
    try {
      const submissions = getStoredSubmissions();
      submissions.push(timestamp);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
    } catch (error) {
      console.error('Failed to store submission:', error);
    }
  };

  const isRateLimited = (): boolean => {
    const now = Date.now();
    const submissions = getStoredSubmissions();
    const recentSubmissions = submissions.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
    );
    return recentSubmissions.length >= MAX_MESSAGES_PER_HOUR;
  };

  const cleanOldSubmissions = () => {
    try {
      const now = Date.now();
      const submissions = getStoredSubmissions();
      const recentSubmissions = submissions.filter(
        (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentSubmissions));
    } catch (error) {
      console.error('Failed to clean submissions:', error);
    }
  };

  // Load guest messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);
        const allMessages = await guestMessagesService.getAll();
        // Sort by newest first
        const sortedMessages = allMessages.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
        setMessages(sortedMessages);
        setError(null);
        // Clean old submissions on load
        cleanOldSubmissions();
      } catch (err) {
        setError('Failed to load guest messages');
        console.error('Error loading guest messages:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, []);

  // Validation functions
  const validateName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return 'Name is required';
    if (trimmed.length > 100) return 'Name must be 100 characters or less';
    return '';
  };

  const validateEmail = (email: string) => {
    const trimmed = email.trim();
    if (!trimmed) return ''; // optional
    if (trimmed.length > 254) return 'Email must be 254 characters or less';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return 'Please enter a valid email address';
    return '';
  };

  const validateMessage = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return 'Message is required';
    if (trimmed.length > 1000) return 'Message must be 1000 characters or less';
    return '';
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check rate limit first
    if (isRateLimited()) {
      setError(
        'Rate limit exceeded. You can only send 3 messages per hour. Please try again later.',
      );
      return;
    }

    // Validate all fields
    const nameError = validateName(guestName);
    const emailError = validateEmail(guestEmail);
    const messageError = validateMessage(newMessage);

    setFieldErrors({ name: nameError, email: emailError, message: messageError });

    // If any validation fails, prevent submission
    if (nameError || emailError || messageError) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setFieldErrors({ name: '', email: '', message: '' }); // Clear field errors

      const messageData = {
        name: guestName.trim(),
        email: guestEmail.trim() || undefined,
        message: newMessage.trim(),
      };

      await guestMessagesService.add(messageData);

      // Store submission timestamp
      storeSubmission(Date.now());

      // Clear form
      setNewMessage('');
      setGuestName('');
      setGuestEmail('');

      // Reload messages to show the new one
      const allMessages = await guestMessagesService.getAll();
      const sortedMessages = allMessages.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      setMessages(sortedMessages);
      // Reset to first page to show new message
      setCurrentPage(1);
    } catch (err) {
      setError('Failed to send message. Please try again.');
      console.error('Error sending message:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Pagination logic
  const totalPages = Math.ceil(messages.length / messagesPerPage);
  const startIndex = (currentPage - 1) * messagesPerPage;
  const endIndex = startIndex + messagesPerPage;
  const currentMessages = messages.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (loading) {
    return (
      <div className="guest-messages-loading" style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', marginBottom: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #4ecdc4',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
        <div>Loading guest messages...</div>
      </div>
    );
  }

  return (
    <div
      className="guest-messages"
      style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}
    >
      {/* Screen reader announcements for dynamic content */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {loading && 'Loading guest messages...'}
        {error && `Error: ${error}`}
        {submitting && 'Submitting your message...'}
        {!loading && !error && messages.length > 0 && `Loaded ${messages.length} guest messages`}
        {!loading && !error && messages.length === 0 && 'No guest messages yet'}
      </div>

      {/* Status announcements for form submissions */}
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {fieldErrors.name && `Name error: ${fieldErrors.name}`}
        {fieldErrors.email && `Email error: ${fieldErrors.email}`}
        {fieldErrors.message && `Message error: ${fieldErrors.message}`}
      </div>

      <h3 style={{ marginBottom: '30px', color: '#333' }}>Guest Messages</h3>

      {/* Message Form */}
      <div
        className="message-form"
        style={{
          marginBottom: '40px',
          padding: '20px',
          border: '1px solid #ddd',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ marginBottom: '20px', color: '#555' }}>Leave a Message</h3>

        {error && (
          <div
            style={{
              color: 'red',
              marginBottom: '15px',
              padding: '10px',
              backgroundColor: '#ffe6e6',
              borderRadius: '4px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} data-testid="guest-form">
          <div style={{ marginBottom: '15px' }}>
            <label
              htmlFor="guestName"
              style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}
            >
              Your Name *
            </label>
            <input
              id="guestName"
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
              maxLength={100}
              data-testid="guest-name"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
              placeholder="Enter your name"
            />
            {fieldErrors.name && (
              <div style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>
                {fieldErrors.name}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label
              htmlFor="guestEmail"
              style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}
            >
              Email (optional)
            </label>
            <input
              id="guestEmail"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              maxLength={254}
              data-testid="guest-email"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
              placeholder="your.email@example.com"
            />
            {fieldErrors.email && (
              <div style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>
                {fieldErrors.email}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="message"
              style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}
            >
              Your Message *
            </label>
            <textarea
              id="message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              required
              rows={4}
              maxLength={1000}
              data-testid="guest-message"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
              placeholder="Share your well wishes, memories, or congratulations..."
            />
            {fieldErrors.message && (
              <div style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>
                {fieldErrors.message}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            data-testid="guest-submit"
            style={{
              backgroundColor: submitting ? '#ccc' : '#4ecdc4',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            {submitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>

      {/* Messages List */}
      <div className="messages-list" data-testid="guest-messages">
        <h3 style={{ marginBottom: '20px', color: '#555' }}>
          Messages from Guests ({messages.length})
        </h3>

        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666', fontStyle: 'italic' }}>
            No messages yet. Be the first to leave a message!
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {currentMessages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    padding: '20px',
                    border: '1px solid #eee',
                    borderRadius: '8px',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ fontWeight: '600', color: '#333' }}>{message.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {formatDate(message.createdAt)}
                    </div>
                  </div>
                  <div style={{ color: '#555', lineHeight: '1.5' }}>{message.message}</div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <nav
                aria-label="Guest messages pagination"
                style={{
                  marginTop: '30px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: currentPage === 1 ? '#f5f5f5' : '#fff',
                    color: currentPage === 1 ? '#ccc' : '#333',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Previous
                </button>

                <div style={{ display: 'flex', gap: '5px' }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      aria-label={`Go to page ${page}`}
                      aria-current={page === currentPage ? 'page' : undefined}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        backgroundColor: page === currentPage ? '#4ecdc4' : '#fff',
                        color: page === currentPage ? '#fff' : '#333',
                        cursor: 'pointer',
                        fontWeight: page === currentPage ? 'bold' : 'normal',
                      }}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: currentPage === totalPages ? '#f5f5f5' : '#fff',
                    color: currentPage === totalPages ? '#ccc' : '#333',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
