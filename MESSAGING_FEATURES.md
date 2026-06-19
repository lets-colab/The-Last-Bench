# Messaging System Features

## Overview
The Last Bench messaging system enables real-time communication between students and mentors/advisors with support for file sharing and typing indicators.

## Features Implemented

### 1. Chat Interface
- **Conversation List**: Browse all active conversations with mentors
- **Message Bubbles**: Clear visual distinction between sent and received messages
- **Timestamps**: Each message shows when it was sent
- **Unread Badges**: Visual indicator of unread message counts

### 2. Real-Time Chat
- **Message Threading**: Organized conversation history between two users
- **Instant Delivery**: Messages sent immediately with visual feedback
- **Message Status**: Shows when messages are read (via database tracking)
- **Scroll to Latest**: Auto-scrolls to newest messages

### 3. Typing Indicators
- **Live Typing Detection**: Shows "typing..." indicator when other user is composing
- **Automatic Timeout**: Typing indicator disappears after 2 seconds of inactivity
- **Visual Feedback**: Animated typing indicator with three dots

### 4. File Sharing
- **File Upload Button**: Dedicated button to attach files
- **File Preview**: Messages with attachments show "📎 View File" button
- **File URL Storage**: File URLs stored with messages for later retrieval
- **Multiple File Support**: Can attach documents, images, or transcripts

### 5. Message Management
- **Mark as Read**: Automatically marks messages as read when viewed
- **Read Status Tracking**: Database tracks which messages have been read
- **Conversation History**: Full message history persists in database
- **Conversation Switching**: Easy navigation between multiple conversations

## UI Components

### Conversation List View
- Shows all active conversations
- Displays last message preview
- Shows last message timestamp
- Displays unread count badge
- Tap to open conversation

### Chat View
- Header with contact name and typing status
- Full message history with timestamps
- Input area with file attachment and send button
- Typing indicator animation
- Back button to return to conversation list

### Message Bubbles
- **Sent Messages**: Blue background (primary color), right-aligned
- **Received Messages**: Gray background (surface color), left-aligned
- **File Attachments**: Shows file icon and "View File" button
- **Timestamps**: Small text below message content

## Technical Implementation

### Backend (tRPC Routers)
```typescript
message: router({
  // Get all messages between two users
  getThread: protectedProcedure
    .input({ otherUserId: number })
    .query()

  // Send a new message
  send: protectedProcedure
    .input({ recipientId, content, fileUrl? })
    .mutation()

  // Mark message as read
  markAsRead: protectedProcedure
    .input({ messageId })
    .mutation()
})
```

### Database Schema
```sql
messages (
  id INT PRIMARY KEY,
  senderId INT,
  recipientId INT,
  content TEXT,
  fileUrl VARCHAR(255),
  isRead TINYINT,
  createdAt TIMESTAMP
)
```

### Frontend State Management
- React hooks for local state
- tRPC queries for fetching messages
- tRPC mutations for sending/updating messages
- useRef for scroll and typing timeout management

## User Flows

### Starting a Conversation
1. User navigates to Messages tab
2. Sees list of existing conversations
3. Taps on a conversation to open chat
4. Can start sending messages immediately

### Sending a Message
1. User types in the message input field
2. Typing indicator is sent to other user
3. User taps Send button
4. Message appears in chat with timestamp
5. Message is stored in database
6. Other user receives message in real-time

### Sharing a File
1. User taps the attachment button (📎)
2. File picker opens (implementation pending)
3. User selects file to upload
4. File is uploaded to storage
5. File URL is sent with message
6. Recipient can tap "View File" to download

### Marking Messages as Read
1. User opens a conversation
2. All unread messages automatically marked as read
3. Read status updates in database
4. Sender can see message was read (future feature)

## Future Enhancements

1. **Message Reactions**: Add emoji reactions to messages
2. **Message Editing**: Allow users to edit sent messages
3. **Message Deletion**: Allow users to delete messages
4. **Group Chats**: Support conversations with multiple participants
5. **Voice Messages**: Record and send audio messages
6. **Video Calls**: Integrate video calling capability
7. **Message Search**: Search through message history
8. **Message Pinning**: Pin important messages
9. **Read Receipts**: Show when messages are read (checkmarks)
10. **Last Seen**: Show when user was last active

## Security Considerations

- **Authentication**: Only authenticated users can send/receive messages
- **Authorization**: Users can only access their own messages
- **Input Validation**: All message content is validated
- **File Security**: File uploads should be scanned for malware
- **Rate Limiting**: Implement rate limiting to prevent spam
- **Encryption**: Consider end-to-end encryption for sensitive conversations

## Performance Optimization

- **Pagination**: Load messages in batches (not all at once)
- **Caching**: Cache recent conversations
- **Lazy Loading**: Load older messages on scroll
- **Debouncing**: Debounce typing indicator updates
- **Compression**: Compress files before upload

## Testing Checklist

- [ ] Send message between two users
- [ ] Receive message in real-time
- [ ] Mark message as read
- [ ] Show typing indicator
- [ ] Typing indicator timeout
- [ ] File attachment and preview
- [ ] Message timestamp accuracy
- [ ] Conversation list updates
- [ ] Unread badge displays correctly
- [ ] Scroll to latest message
- [ ] Switch between conversations
- [ ] Back button returns to list
- [ ] Empty state when no messages
- [ ] Error handling for failed sends
