import { z } from 'zod';

export const createMessageSchema = z.object({
  body: z.object({
    id: z.string().optional(),
    content: z.string().optional().default(''),
    messageType: z.string().default('TEXT'),
    replyToId: z.string().nullable().optional(),
    attachments: z.array(
      z.object({
        url: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        fileName: z.string().optional(),
      })
    ).optional(),
  }).refine((data) => (data.content && data.content.trim().length > 0) || (data.attachments && data.attachments.length > 0), {
    message: 'Message must contain either text content or an attachment.',
  }),
  params: z.object({
    conversationId: z.string(),
  }),
});

export const updateMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Message content cannot be empty'),
  }),
  params: z.object({
    conversationId: z.string(),
    messageId: z.string(),
  }),
});

export const messageIdParamSchema = z.object({
  params: z.object({
    messageId: z.string(),
  }),
});
