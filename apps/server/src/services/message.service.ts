import { prisma } from '../prisma';
import { NotFoundError, UnauthorizedError, ForbiddenError, BadRequestError } from '../utils/errors';
import { ensureBookExists } from './book.service';
import { broadcastUnreadCount, getIO } from '../sockets';

const KNOWN_THREADS: Record<string, { title: string; bookId: string }> = {
  'v2-t1': { title: 'The Physics of Scribe Annotations', bookId: 'vol-2' },
  'v2-t2': { title: 'Ambient Lighting & Contrast', bookId: 'vol-2' },
  'v2-t3': { title: 'Watermark & Fibre Density', bookId: 'vol-2' },
  'v2-t4': { title: 'Tactile Shadows on Landing', bookId: 'vol-2' },
  'v2-t5': { title: 'The Art of Inner Gutters', bookId: 'vol-2' },
  'v3-t1': { title: 'Left Page vs. Right Page Split', bookId: 'vol-3' },
  'v6-t1': { title: 'Flickering Candle Ember Presences', bookId: 'vol-6' },
  'v6-t2': { title: 'The Inkwell Depletion Engine', bookId: 'vol-6' },
  'v10-t1': { title: 'Next.js & Skeuomorphic Layout Performance', bookId: 'vol-10' },
  'v13-t1': { title: 'Burgundy Leather & Cream Variables', bookId: 'vol-13' },
};

async function ensureParticipant(conversationId: string, userId: string) {
  let isParticipant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!isParticipant) {
    // Check if the conversation actually exists
    let conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      // Find details for this thread
      let threadTitle = 'General Discussion';
      let threadBookId: string | null = null;

      let foundKnown = false;
      for (const knownKey of Object.keys(KNOWN_THREADS)) {
        if (conversationId.endsWith(`-${knownKey}`)) {
          const prefixBookId = conversationId.substring(0, conversationId.length - knownKey.length - 1);
          threadTitle = KNOWN_THREADS[knownKey].title;
          threadBookId = prefixBookId;
          foundKnown = true;
          break;
        }
      }

      if (!foundKnown) {
        const threadDetails = KNOWN_THREADS[conversationId] || { title: 'General Discussion', bookId: 'vol-2' };
        threadTitle = threadDetails.title;
        threadBookId = threadDetails.bookId;
      }

      if (threadBookId) {
        const membership = await prisma.bookMembership.findFirst({
          where: { bookId: threadBookId, userId },
        });
        const totalMemberships = await prisma.bookMembership.count({
          where: { bookId: threadBookId },
        });
        if (totalMemberships > 0 && !membership) {
          throw new ForbiddenError('You must be a member of this book to participate in its discussion threads.');
        }
        await ensureBookExists(threadBookId);
      }

      conversation = await prisma.conversation.create({
        data: {
          id: conversationId,
          title: threadTitle,
          type: 'GROUP',
          bookId: threadBookId,
        },
      });
    } else {
      // Conversation already exists
      if (conversation.type === 'DIRECT') {
        throw new ForbiddenError('Access denied: You are not a participant of this direct conversation.');
      }

      if (conversation.bookId) {
        const membership = await prisma.bookMembership.findUnique({
          where: {
            bookId_userId: {
              bookId: conversation.bookId,
              userId,
            },
          },
        });
        const totalMemberships = await prisma.bookMembership.count({
          where: { bookId: conversation.bookId },
        });
        if (totalMemberships > 0 && !membership) {
          throw new ForbiddenError('You must be a member of this book to participate in its discussion threads.');
        }
      }
    }

    isParticipant = await prisma.conversationParticipant.create({
      data: {
        conversationId,
        userId,
      },
    });
  }

  return isParticipant;
}

export class MessageService {
  async markConversationAsRead(conversationId: string, userId: string) {
    await ensureParticipant(conversationId, userId);

    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    }).catch(err => console.error('Failed to update participant lastReadAt:', err));

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (conversation?.bookId) {
      broadcastUnreadCount(userId, conversation.bookId);
    }
  }

  async listMessages(conversationId: string, userId: string, page?: number) {
    // Check/ensure participant first
    await ensureParticipant(conversationId, userId);

    // Update lastReadAt for this participant
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    }).catch(err => console.error('Failed to update participant lastReadAt:', err));

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (conversation?.bookId) {
      broadcastUnreadCount(userId, conversation.bookId);
    }

    const totalCount = await prisma.message.count({
      where: { 
        conversationId,
        hiddenForUsers: {
          none: {
            userId,
          },
        },
      },
    });
    const totalPages = Math.max(1, Math.ceil(totalCount / 16));

    let pageNum = page !== undefined ? Number(page) : totalPages;
    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (pageNum > totalPages) pageNum = totalPages;

    const skip = 16 * (pageNum - 1);
    const take = 16;

    const messages = await prisma.message.findMany({
      where: { 
        conversationId,
        hiddenForUsers: {
          none: {
            userId,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take,
      include: {
        sender: {
          include: {
            profile: true,
          }
        },
        replyTo: {
          include: {
            sender: {
              include: {
                profile: true,
              }
            },
            attachments: true,
          }
        },
        reactions: true,
        attachments: true,
      }
    });

    if (conversation?.bookId) {
      const overrides = await prisma.nicknameOverride.findMany({
        where: {
          ownerId: userId,
          bookId: conversation.bookId,
        }
      });
      const nicknameMap = new Map(overrides.map(o => [o.targetUserId, o.nickname]));

      for (const msg of messages) {
        if (msg.sender) {
          const overrideNickname = nicknameMap.get(msg.senderId);
          if (overrideNickname) {
            if (!msg.sender.profile) {
              msg.sender.profile = {
                id: msg.senderId,
                userId: msg.senderId,
                displayName: overrideNickname,
                bio: null,
                avatarUrl: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              } as any;
            } else {
              msg.sender.profile.displayName = overrideNickname;
            }
            msg.sender.username = overrideNickname;
          }
        }
        if (msg.replyTo && msg.replyTo.sender) {
          const overrideNickname = nicknameMap.get(msg.replyTo.senderId);
          if (overrideNickname) {
            if (!msg.replyTo.sender.profile) {
              msg.replyTo.sender.profile = {
                id: msg.replyTo.senderId,
                userId: msg.replyTo.senderId,
                displayName: overrideNickname,
                bio: null,
                avatarUrl: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              } as any;
            } else {
              msg.replyTo.sender.profile.displayName = overrideNickname;
            }
            msg.replyTo.sender.username = overrideNickname;
          }
        }
      }
    }

    return {
      messages,
      totalPages,
      currentPage: pageNum,
    };
  }

  async createMessage(
    conversationId: string,
    senderId: string,
    data: {
      id?: string;
      content?: string;
      messageType?: string;
      replyToId?: string | null;
      attachments?: Array<{ url: string; fileType: string; fileSize: number; fileName?: string }>;
    }
  ) {
    // Verify/ensure participant first
    await ensureParticipant(conversationId, senderId);

    if (data.replyToId) {
      const repliedMessage = await prisma.message.findUnique({
        where: { id: data.replyToId },
      });
      if (!repliedMessage) {
        throw new BadRequestError('Replied-to message not found');
      }
      if (repliedMessage.conversationId !== conversationId) {
        throw new BadRequestError('Replied-to message does not belong to this conversation');
      }
    }

    // Confirm that message-sending is re-checked against current grants on every send,
    // so revoking a grant actually blocks new messages going forward.
    // Existing message history remains visible/read-only (not queried/deleted on revocation).
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
      },
    });

    if (conversation && conversation.type === 'DIRECT' && conversation.bookId) {
      const recipientParticipant = conversation.participants.find(p => p.userId !== senderId);
      if (recipientParticipant) {
        const recipientId = recipientParticipant.userId;
        const book = await prisma.book.findUnique({
          where: { id: conversation.bookId },
        });

        if (book) {
          const isSenderCreator = book.creatorId === senderId;
          const isRecipientCreator = book.creatorId === recipientId;

          if (!isSenderCreator && !isRecipientCreator) {
            // Neither is creator, so we must check if there is an active visibility grant
            const grant = await prisma.visibilityGrant.findUnique({
              where: {
                bookId_viewerId_visibleUserId: {
                  bookId: conversation.bookId,
                  viewerId: senderId,
                  visibleUserId: recipientId,
                },
              },
            });

            if (!grant) {
              throw new ForbiddenError('You do not have permission to message this member. The book creator must grant visibility first.');
            }
          }
        }
      }
    }

    const hasAttachments = data.attachments && data.attachments.length > 0;
    const computedType = hasAttachments && (!data.content || !data.content.trim()) ? 'ATTACHMENT' : (data.messageType || 'TEXT');

    const newMessage = await prisma.message.create({
      data: {
        id: data.id,
        conversationId,
        senderId,
        content: data.content || '',
        messageType: computedType,
        status: 'SENT',
        replyToId: data.replyToId,
        attachments: hasAttachments ? {
          create: data.attachments!.map(att => ({
            fileUrl: att.url,
            fileType: att.fileType,
            fileSize: att.fileSize,
            fileName: att.fileName || '',
          })),
        } : undefined,
      },
      include: {
        sender: {
          include: {
            profile: true,
          }
        },
        replyTo: {
          include: {
            sender: {
              include: {
                profile: true,
              }
            },
            attachments: true,
          }
        },
        reactions: true,
        attachments: true,
      }
    });

    // Update sender's lastReadAt
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: senderId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    }).catch(err => console.error('Failed to update sender lastReadAt:', err));

    if (conversation && conversation.bookId) {
      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId },
        select: { userId: true },
      });

      const io = getIO();
      const senderName = newMessage.sender?.deletedAt ? "Deleted Scribe" : (
                         newMessage.sender?.profile?.displayName || 
                         newMessage.sender?.username || 
                         `Scribe ${newMessage.senderId.substring(0, 4)}`);

      // Broadcast unread count for every participant based on active viewing state
      for (const p of participants) {
        if (p.userId === senderId) {
          broadcastUnreadCount(senderId, conversation.bookId);
          continue;
        }

        // Determine active viewing status
        let isViewing = false;
        if (io) {
          try {
            const activeSockets = await io.in(`user:${p.userId}`).fetchSockets();
            isViewing = activeSockets.some(s => s.data.activeConversationId === conversationId);
          } catch (err) {
            console.error(`Failed to fetch sockets for user:${p.userId}:`, err);
          }
        }

        if (isViewing) {
          // Actively viewing: immediately update lastReadAt and broadcast (should be 0)
          await prisma.conversationParticipant.update({
            where: {
              conversationId_userId: {
                conversationId,
                userId: p.userId,
              },
            },
            data: {
              lastReadAt: new Date(),
            },
          }).catch(err => console.error('Failed to update viewer lastReadAt:', err));

          broadcastUnreadCount(p.userId, conversation.bookId);
        } else {
          // NOT actively viewing: increment unread count and emit notification:new
          broadcastUnreadCount(p.userId, conversation.bookId);

          if (io) {
            console.log(`[Socket] Emitting notification:new to user:${p.userId} from ${senderId}`);
            io.to(`user:${p.userId}`).emit('notification:new', {
              id: newMessage.id,
              title: `Message from ${senderName}`,
              message: newMessage.content || 'Sent a message.',
              type: 'info',
              conversationId,
              bookId: conversation.bookId,
              senderId: newMessage.senderId,
              senderName: senderName,
            });
          }
        }
      }
    }

    if (conversation && conversation.bookId) {
      const overrides = await prisma.nicknameOverride.findMany({
        where: {
          ownerId: senderId,
          bookId: conversation.bookId,
        }
      });
      const nicknameMap = new Map(overrides.map(o => [o.targetUserId, o.nickname]));

      if (newMessage.sender) {
        const overrideNickname = nicknameMap.get(newMessage.senderId);
        if (overrideNickname) {
          if (!newMessage.sender.profile) {
            newMessage.sender.profile = {
              id: newMessage.senderId,
              userId: newMessage.senderId,
              displayName: overrideNickname,
              bio: null,
              avatarUrl: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as any;
          } else {
            newMessage.sender.profile.displayName = overrideNickname;
          }
          newMessage.sender.username = overrideNickname;
        }
      }

      if (newMessage.replyTo && newMessage.replyTo.sender) {
        const overrideNickname = nicknameMap.get(newMessage.replyTo.senderId);
        if (overrideNickname) {
          if (!newMessage.replyTo.sender.profile) {
            newMessage.replyTo.sender.profile = {
              id: newMessage.replyTo.senderId,
              userId: newMessage.replyTo.senderId,
              displayName: overrideNickname,
              bio: null,
              avatarUrl: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as any;
          } else {
            newMessage.replyTo.sender.profile.displayName = overrideNickname;
          }
          newMessage.replyTo.sender.username = overrideNickname;
        }
      }
    }

    return newMessage;
  }

  async editMessage(messageId: string, senderId: string, newContent: string) {
    const msg = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!msg) {
      throw new NotFoundError('Message not found');
    }

    if (msg.senderId !== senderId) {
      throw new UnauthorizedError('Cannot edit messages belonging to other users');
    }

    return await prisma.message.update({
      where: { id: messageId },
      data: {
        content: newContent,
        edited: true,
        editedAt: new Date(),
        status: 'EDITED',
      },
    });
  }

  async deleteMessage(messageId: string, senderId: string) {
    const msg = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!msg) {
      throw new NotFoundError('Message not found');
    }

    if (msg.senderId !== senderId) {
      throw new ForbiddenError('Cannot delete messages belonging to other users');
    }

    // Soft delete
    return await prisma.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
        status: 'DELETED',
      },
    });
  }

  async markMessageAsRead(messageId: string, userId: string) {
    const msg = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!msg) {
      throw new NotFoundError('Message not found');
    }

    // Only recipients can mark messages as read
    if (msg.senderId === userId) {
      return msg;
    }

    if (msg.readAt) {
      return msg;
    }

    return await prisma.message.update({
      where: { id: messageId },
      data: {
        readAt: new Date(),
        status: 'READ',
      },
    });
  }

  async hideMessageForMe(messageId: string, userId: string) {
    const msg = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!msg) {
      throw new NotFoundError('Message not found');
    }

    const isParticipant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: msg.conversationId,
          userId,
        },
      },
    });

    if (!isParticipant) {
      throw new ForbiddenError('You are not a participant in this conversation');
    }

    return await prisma.messageHiddenForUser.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
      create: {
        messageId,
        userId,
      },
      update: {
        hiddenAt: new Date(),
      },
    });
  }

  async syncMessages(userId: string, since?: string) {
    let sinceDate = new Date(0);
    if (since) {
      const rawSince = String(since);
      if (!isNaN(Number(rawSince))) {
        sinceDate = new Date(Number(rawSince));
      } else {
        const parsed = new Date(rawSince);
        if (!isNaN(parsed.getTime())) {
          sinceDate = parsed;
        }
      }
    }

    // 1. Get all conversation IDs where user is a participant
    const userParticipants = await prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    const participantConvIds = userParticipants.map(p => p.conversationId);

    // 2. Get all book memberships for user to include public group threads in those books
    const userMemberships = await prisma.bookMembership.findMany({
      where: { userId },
      select: { bookId: true },
    });
    const bookIds = userMemberships.map(m => m.bookId);

    const bookGroupConvs = await prisma.conversation.findMany({
      where: {
        bookId: { in: bookIds },
        type: 'GROUP',
      },
      select: { id: true },
    });

    const allowedConversationIds = Array.from(
      new Set([...participantConvIds, ...bookGroupConvs.map(c => c.id)])
    );

    if (allowedConversationIds.length === 0) {
      return {
        syncedAt: new Date().toISOString(),
        messages: [],
        messagesByConversation: {},
      };
    }

    // 3. Find messages created strictly after sinceDate
    const messages = await prisma.message.findMany({
      where: {
        conversationId: { in: allowedConversationIds },
        createdAt: { gt: sinceDate },
        hiddenForUsers: {
          none: { userId },
        },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          include: {
            profile: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              include: {
                profile: true,
              },
            },
            attachments: true,
          },
        },
        reactions: true,
        attachments: true,
      },
    });

    // 4. Apply nickname overrides if applicable
    const conversations = await prisma.conversation.findMany({
      where: { id: { in: allowedConversationIds } },
      select: { id: true, bookId: true },
    });
    const convBookMap = new Map(conversations.map(c => [c.id, c.bookId]));

    const activeBookIds = Array.from(new Set(conversations.map(c => c.bookId).filter(Boolean))) as string[];
    if (activeBookIds.length > 0) {
      const overrides = await prisma.nicknameOverride.findMany({
        where: {
          ownerId: userId,
          bookId: { in: activeBookIds },
        },
      });
      const nicknameMap = new Map(overrides.map(o => [`${o.bookId}_${o.targetUserId}`, o.nickname]));

      for (const msg of messages) {
        const bookId = convBookMap.get(msg.conversationId);
        if (bookId) {
          if (msg.sender) {
            const overrideNickname = nicknameMap.get(`${bookId}_${msg.senderId}`);
            if (overrideNickname) {
              if (!msg.sender.profile) {
                msg.sender.profile = {
                  id: msg.senderId,
                  userId: msg.senderId,
                  displayName: overrideNickname,
                  bio: null,
                  avatarUrl: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                } as any;
              } else {
                msg.sender.profile.displayName = overrideNickname;
              }
              msg.sender.username = overrideNickname;
            }
          }
          if (msg.replyTo && msg.replyTo.sender) {
            const overrideNickname = nicknameMap.get(`${bookId}_${msg.replyTo.senderId}`);
            if (overrideNickname) {
              if (!msg.replyTo.sender.profile) {
                msg.replyTo.sender.profile = {
                  id: msg.replyTo.senderId,
                  userId: msg.replyTo.senderId,
                  displayName: overrideNickname,
                  bio: null,
                  avatarUrl: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                } as any;
              } else {
                msg.replyTo.sender.profile.displayName = overrideNickname;
              }
              msg.replyTo.sender.username = overrideNickname;
            }
          }
        }
      }
    }

    // 5. Group by conversationId
    const messagesByConversation: Record<string, typeof messages> = {};
    for (const msg of messages) {
      if (!messagesByConversation[msg.conversationId]) {
        messagesByConversation[msg.conversationId] = [];
      }
      messagesByConversation[msg.conversationId].push(msg);
    }

    return {
      syncedAt: new Date().toISOString(),
      messages,
      messagesByConversation,
    };
  }
}

export const messageService = new MessageService();
