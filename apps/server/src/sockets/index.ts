import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../config';
import { prisma } from '../prisma';
import { presenceService } from '../services/presence.service';
import { messageService } from '../services/message.service';

let ioInstance: Server | null = null;

const disconnectTimeouts = new Map<string, NodeJS.Timeout>();

async function getUsersWhoCanSee(targetUserId: string): Promise<string[]> {
  try {
    // 1. Get all books where targetUserId is a member
    const targetMemberships = await prisma.bookMembership.findMany({
      where: { userId: targetUserId },
      include: {
        book: true,
      }
    });

    const bookIds = targetMemberships.map(m => m.bookId);
    if (bookIds.length === 0) return [];

    // 2. Get all other memberships in those books
    const otherMemberships = await prisma.bookMembership.findMany({
      where: {
        bookId: { in: bookIds },
        userId: { not: targetUserId }
      },
      include: {
        book: true,
      }
    });

    // 3. For each book, find visibility grants where targetUserId is the visible user
    const grants = await prisma.visibilityGrant.findMany({
      where: {
        bookId: { in: bookIds },
        visibleUserId: targetUserId
      }
    });

    // Map of bookId -> Set of viewerIds who have visibility grant to see targetUserId
    const grantsMap = new Map<string, Set<string>>();
    for (const grant of grants) {
      if (!grantsMap.has(grant.bookId)) {
        grantsMap.set(grant.bookId, new Set());
      }
      grantsMap.get(grant.bookId)!.add(grant.viewerId);
    }

    const allowedViewerIds = new Set<string>();

    for (const m of otherMemberships) {
      const viewerId = m.userId;
      const bookId = m.bookId;
      const book = m.book;

      // Check if viewer is creator of this book, or target is creator
      const targetMem = targetMemberships.find(tm => tm.bookId === bookId);
      const isTargetCreator = book.creatorId === targetUserId || (targetMem && targetMem.role === 'CREATOR');
      const isViewerCreator = book.creatorId === viewerId || m.role === 'CREATOR';

      const bookGrants = grantsMap.get(bookId);
      const hasGrant = bookGrants ? bookGrants.has(viewerId) : false;

      if (isTargetCreator || isViewerCreator || hasGrant) {
        allowedViewerIds.add(viewerId);
      }
    }

    return Array.from(allowedViewerIds);
  } catch (error) {
    console.error(`[Socket] Error getting viewers who can see user ${targetUserId}:`, error);
    return [];
  }
}

export function getIO(): Server | null {
  return ioInstance;
}

export async function broadcastUnreadCount(userId: string, bookId: string) {
  try {
    const participants = await prisma.conversationParticipant.findMany({
      where: {
        userId,
        conversation: {
          bookId,
        },
      },
      select: {
        conversationId: true,
        lastReadAt: true,
      },
    });

    let unreadMessageCount = 0;
    for (const p of participants) {
      const count = await prisma.message.count({
        where: {
          conversationId: p.conversationId,
          senderId: { not: userId },
          createdAt: { gt: p.lastReadAt },
          deletedAt: null,
        },
      });
      unreadMessageCount += count;
    }

    if (ioInstance) {
      console.log(`[Socket] Broadcasting unread:updated to user:${userId} for book ${bookId}: ${unreadMessageCount}`);
      ioInstance.to(`user:${userId}`).emit('unread:updated', {
        bookId,
        unreadMessageCount,
      });
    }
  } catch (error) {
    console.error(`Failed to broadcast unread count for user ${userId} and book ${bookId}:`, error);
  }
}

export function initSocketServer(server: HttpServer): Server {
  const io = new Server(server, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    },
  });

  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    const handleUserOnline = async (userId: string, activeBookId?: string, currentChapter?: string) => {
      if (!userId) return;
      socket.data.userId = userId;

      // Cancel any pending disconnect timeout for this user
      if (disconnectTimeouts.has(userId)) {
        console.log(`[Presence] Cancelling disconnect timeout for user ${userId}`);
        clearTimeout(disconnectTimeouts.get(userId)!);
        disconnectTimeouts.delete(userId);
      }

      const presence = await presenceService.updatePresence(userId, {
        online: true,
        activeBookId,
        currentChapter,
      });

      const fullPresence = await prisma.readerPresence.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
          activeBook: true,
        },
      });

      const payload = {
        userId,
        username: fullPresence?.user?.username || fullPresence?.user?.email || 'Anonymous Scribe',
        activeBookId: fullPresence?.activeBookId || activeBookId,
        currentChapter: fullPresence?.currentChapter || currentChapter,
        lastSeen: fullPresence?.lastSeen || new Date(),
        online: true,
      };

      // Get users who can see this user
      const allowedViewerIds = await getUsersWhoCanSee(userId);
      console.log(`[Presence] Broadcasting user:online for ${userId} to allowed viewers:`, allowedViewerIds);
      
      // Emit specifically to allowed viewers
      for (const viewerId of allowedViewerIds) {
        io.to(`user:${viewerId}`).emit('user:online', payload);
      }
      
      // Also send to the user themselves
      io.to(`user:${userId}`).emit('user:online', payload);
    };

    // Join notification room for specific users
    socket.on('user:join', (userId: string) => {
      if (!userId) return;
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} joined user notification room: user:${userId}`);
      handleUserOnline(userId);
    });

    // 1. user:online
    socket.on('user:online', async (data: { userId: string; activeBookId?: string; currentChapter?: string }) => {
      console.log(`[Socket] user:online for user ${data.userId}`);
      await handleUserOnline(data.userId, data.activeBookId, data.currentChapter);
    });

    // 2. user:offline
    socket.on('user:offline', async (data: { userId: string }) => {
      console.log(`[Socket] user:offline for user ${data.userId}`);
      if (!data.userId) return;

      // Cancel any disconnect timeout immediately since offline was requested explicitly
      if (disconnectTimeouts.has(data.userId)) {
        clearTimeout(disconnectTimeouts.get(data.userId)!);
        disconnectTimeouts.delete(data.userId);
      }

      const presence = await presenceService.updatePresence(data.userId, {
        online: false,
      });

      const fullPresence = await prisma.readerPresence.findUnique({
        where: { userId: data.userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
          activeBook: true,
        },
      });

      const payload = {
        userId: data.userId,
        online: false,
        lastSeen: fullPresence?.lastSeen || new Date(),
      };

      const allowedViewerIds = await getUsersWhoCanSee(data.userId);
      for (const viewerId of allowedViewerIds) {
        io.to(`user:${viewerId}`).emit('user:offline', payload);
      }
      io.to(`user:${data.userId}`).emit('user:offline', payload);
    });

    // 3. typing:start
    socket.on('typing:start', async (data: { userId: string; conversationId: string }) => {
      console.log(`[Socket] typing:start for user ${data.userId} in chat ${data.conversationId}`);
      if (!data.userId) return;

      await presenceService.updatePresence(data.userId, {
        typing: true,
      });

      const fullPresence = await prisma.readerPresence.findUnique({
        where: { userId: data.userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
          activeBook: true,
        },
      });

      socket.to(data.conversationId).emit('typing:start', {
        ...data,
        presence: fullPresence,
      });
    });

    // 4. typing:stop
    socket.on('typing:stop', async (data: { userId: string; conversationId: string }) => {
      console.log(`[Socket] typing:stop for user ${data.userId} in chat ${data.conversationId}`);
      if (!data.userId) return;

      await presenceService.updatePresence(data.userId, {
        typing: false,
      });

      const fullPresence = await prisma.readerPresence.findUnique({
        where: { userId: data.userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
          activeBook: true,
        },
      });

      socket.to(data.conversationId).emit('typing:stop', {
        ...data,
        presence: fullPresence,
      });
    });

    // 5. message:new
    socket.on('message:new', async (data: { conversationId: string; message: any }) => {
      console.log(`[Socket] message:new in chat ${data.conversationId}`);
      
      try {
        if (data.message && data.message.id) {
          // Check if message is already written to the database to prevent duplicate key errors
          const existingMsg = await prisma.message.findUnique({
            where: { id: data.message.id },
          });

          if (!existingMsg) {
            const senderId = data.message.senderId || socket.data.userId;
            if (senderId) {
              await messageService.createMessage(data.conversationId, senderId, {
                id: data.message.id,
                content: data.message.text || data.message.content || '',
                messageType: data.message.messageType || 'TEXT',
                replyToId: data.message.replyToId || null,
              });
              console.log(`[Socket] Successfully persisted message:new to DB: ${data.message.id}`);
            }
          }
        }
      } catch (err) {
        console.error('[Socket] Failed to persist message:new in database:', err);
      }

      socket.to(data.conversationId).emit('message:new', data);
      socket.to(`chat:${data.conversationId}`).emit('message:new', data);
    });

    // 6. message:edited
    socket.on('message:edited', (data: { conversationId: string; messageId: string; newContent: string; message: any }) => {
      console.log(`[Socket] message:edited in chat ${data.conversationId}`);
      socket.to(data.conversationId).emit('message:edited', data);
      socket.to(`chat:${data.conversationId}`).emit('message:edited', data);
    });

    // 7. message:deleted
    socket.on('message:deleted', (data: { conversationId: string; messageId: string }) => {
      console.log(`[Socket] message:deleted in chat ${data.conversationId}`);
      socket.to(data.conversationId).emit('message:deleted', data);
      socket.to(`chat:${data.conversationId}`).emit('message:deleted', data);
    });

    // 10. message:read
    socket.on('message:read', (data: { conversationId: string; messageId: string; readAt: string }) => {
      console.log(`[Socket] message:read in chat ${data.conversationId}`);
      socket.to(data.conversationId).emit('message:read', data);
      socket.to(`chat:${data.conversationId}`).emit('message:read', data);
    });

    // Track active conversation being viewed by socket
    socket.on('conversation:view', (data: { conversationId: string | null; userId?: string }) => {
      if (data.userId && !socket.data.userId) {
        socket.data.userId = data.userId;
      }
      socket.data.activeConversationId = data.conversationId;
      console.log(`[Socket] Socket ${socket.id} (user:${socket.data.userId}) is actively viewing conversation: ${data.conversationId}`);
    });

    // 8. notification:new
    socket.on('notification:new', (data: { receiverId: string; notificationId: string; title: string; message?: string; type?: string; color?: string; page?: number }) => {
      console.log(`[Socket] notification:new targeting user ${data.receiverId}`);
      io.to(`user:${data.receiverId}`).emit('notification:new', data);
    });

    // 9. bookmark:created
    socket.on('bookmark:created', (data: { userId: string; bookmarkId: string; bookId?: string; bookmark?: any }) => {
      console.log(`[Socket] bookmark:created for user ${data.userId}`);
      socket.broadcast.emit('bookmark:created', data);
    });

    // Handle joining chat rooms for isolated messaging namespaces
    socket.on('room:join', (room: string) => {
      socket.join(room);
      console.log(`Socket ${socket.id} joined room: ${room}`);
    });

    socket.on('room:leave', (room: string) => {
      socket.leave(room);
      console.log(`Socket ${socket.id} left room: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const userId = socket.data.userId;
      if (userId) {
        // Check if there are any other sockets connected for this user
        const otherSockets = Array.from(io.sockets.sockets.values()).filter(
          s => s.data.userId === userId && s.id !== socket.id
        );

        if (otherSockets.length === 0) {
          // No other active sockets for this user. Schedule offline state with a grace period
          console.log(`[Presence] Scheduling offline transition for user ${userId} in 5s (grace period)`);
          
          if (disconnectTimeouts.has(userId)) {
            clearTimeout(disconnectTimeouts.get(userId)!);
          }

          const timeout = setTimeout(async () => {
            disconnectTimeouts.delete(userId);
            
            const presence = await presenceService.updatePresence(userId, {
              online: false,
              typing: false,
            });

            const fullPresence = await prisma.readerPresence.findUnique({
              where: { userId },
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    username: true,
                  },
                },
                activeBook: true,
              },
            });

            const payload = {
              userId,
              online: false,
              lastSeen: fullPresence?.lastSeen || new Date(),
            };

            const allowedViewerIds = await getUsersWhoCanSee(userId);
            console.log(`[Presence] Broadcasting user:offline for ${userId} to allowed viewers:`, allowedViewerIds);
            
            for (const viewerId of allowedViewerIds) {
              io.to(`user:${viewerId}`).emit('user:offline', payload);
            }
            io.to(`user:${userId}`).emit('user:offline', payload);
          }, 5000); // 5 seconds grace period

          disconnectTimeouts.set(userId, timeout);
        } else {
          console.log(`[Presence] User ${userId} still has other active connections. Skipping offline transition.`);
        }
      }
    });
  });

  return io;
}
