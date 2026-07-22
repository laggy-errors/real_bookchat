import { prisma } from '../prisma';
import { NotFoundError } from '../utils/errors';

export class UserService {
  async getProfile(userId: string) {
    let profile = await prisma.profile.findUnique({
      where: { userId },
    });
    if (!profile) {
      // Find the user first to populate default display name
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundError('User not found');
      }
      
      profile = await prisma.profile.create({
        data: {
          userId,
          displayName: user.username || user.email.split('@')[0],
          bio: 'A registered scribe of the ledger.',
        },
      });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true },
    });

    return {
      ...profile,
      id: user?.id || userId,
      email: user?.email || '',
      username: user?.username || (user?.email ? user.email.split('@')[0] : '') || '',
      name: profile.displayName || user?.username || (user?.email ? user.email.split('@')[0] : '') || 'Scribe',
    };
  }

  async updateProfile(userId: string, data: { displayName?: string; bio?: string; avatarUrl?: string }) {
    const updated = await prisma.profile.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });
    return updated;
  }

  async getOwnedBooks(userId: string) {
    return await prisma.book.findMany({
      where: { creatorId: userId },
      select: { id: true, title: true }
    });
  }

  async deleteAccount(userId: string) {
    const ownedBooks = await this.getOwnedBooks(userId);
    if (ownedBooks.length > 0) {
      throw new Error('Cannot delete account because you are the creator of one or more books.');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Revoke all of the user's sessions and refresh tokens
      await tx.session.deleteMany({ where: { userId } });
      await tx.refreshToken.deleteMany({ where: { userId } });

      // 2. Remove user from BookMembership
      await tx.bookMembership.deleteMany({ where: { userId } });

      // 3. Delete any VisibilityGrant rows where they are viewer, visible target, or granter
      await tx.visibilityGrant.deleteMany({
        where: {
          OR: [
            { viewerId: userId },
            { visibleUserId: userId },
            { granterId: userId }
          ]
        }
      });

      // 4. Delete NicknameOverrides where they are creator or target
      await tx.nicknameOverride.deleteMany({
        where: {
          OR: [
            { ownerId: userId },
            { targetUserId: userId }
          ]
        }
      });

      // 5. Delete Bookmarks, Profile, ThemePreference, ReaderPresence, ReadingProgress, Annotations, Quotes, Reactions, MessageHidden, Notifications, and ConversationParticipants
      await tx.bookmark.deleteMany({ where: { userId } });
      await tx.profile.deleteMany({ where: { userId } });
      await tx.themePreference.deleteMany({ where: { userId } });
      await tx.readerPresence.deleteMany({ where: { userId } });
      await tx.readingProgress.deleteMany({ where: { userId } });
      await tx.annotation.deleteMany({ where: { userId } });
      await tx.quote.deleteMany({ where: { userId } });
      await tx.reaction.deleteMany({ where: { userId } });
      await tx.messageHiddenForUser.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({
        where: {
          OR: [
            { receiverId: userId },
            { senderId: userId }
          ]
        }
      });
      await tx.conversationParticipant.deleteMany({ where: { userId } });

      // 6. Anonymize/detach User record
      const tombstoneEmail = `deleted-user-${userId}@tombstone.local`;

      return await tx.user.update({
        where: { id: userId },
        data: {
          email: tombstoneEmail,
          username: null,
          passwordHash: null,
          googleId: null,
          deletedAt: new Date(),
        }
      });
    });
  }
}

export const userService = new UserService();
