import React, { useEffect, useState } from 'react';

import { GuestMessage, guestMessagesService } from '../services/api';

interface GuestMessagesProps {
  maxMessages?: number;
}

export function GuestMessages({ maxMessages = 10 }: GuestMessagesProps) {
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load guest messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);
        const allMessages = await guestMessagesService.getAll();
        // Sort by newest first and limit
        const sortedMessages = allMessages
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, maxMessages);
        setMessages(sortedMessages);
        setError(null);
      } catch (err) {
        setError('Failed to load guest messages');
        console.error('Error loading guest messages:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [maxMessages]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !guestName.trim()) {
      setError('Please fill in your name and message');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const messageData = {
        name: guestName.trim(),
        email: guestEmail.trim() || undefined,
        message: newMessage.trim(),
      };

      await guestMessagesService.add(messageData);

      // Clear form
      setNewMessage('');
      setGuestName('');
      setGuestEmail('');

      // Reload messages to show the new one
      const allMessages = await guestMessagesService.getAll();
      const sortedMessages = allMessages
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, maxMessages);
      setMessages(sortedMessages);
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

  if (loading) {
    return (
      <div className="guest-messages-loading" style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading guest messages...</div>
      </div>
    );
  }

  return (
    <div
      className="guest-messages"
      style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}
    >
      <h2 style={{ marginBottom: '30px', color: '#333' }}>Guest Messages</h2>

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

        <form onSubmit={handleSubmit}>
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
          </div>

          <button
            type="submit"
            disabled={submitting}
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
      <div className="messages-list">
        <h3 style={{ marginBottom: '20px', color: '#555' }}>
          Messages from Guests ({messages.length})
        </h3>

        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666', fontStyle: 'italic' }}>
            No messages yet. Be the first to leave a message!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {messages.map((message) => (
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
        )}
      </div>
    </div>
  );
}
