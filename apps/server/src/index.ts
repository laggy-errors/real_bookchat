import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { initSocketServer } from './sockets';
import { prisma } from './prisma';
import { logger } from './utils/logger';

// Import Routes
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { bookRoutes } from './routes/book.routes';
import { chatRoutes } from './routes/chat.routes';
import { messageRoutes } from './routes/message.routes';
import { presenceRoutes } from './routes/presence.routes';
import { notificationRoutes } from './routes/notification.routes';
import { bookmarkRoutes } from './routes/bookmark.routes';
import { searchRoutes } from './routes/search.routes';
import { settingsRoutes } from './routes/settings.routes';
import { readingProgressRoutes } from './routes/reading-progress.routes';
import { annotationRoutes } from './routes/annotation.routes';
import { quoteRoutes } from './routes/quote.routes';
import { conversationRoutes } from './routes/conversation.routes';
import { attachmentRoutes } from './routes/attachment.routes';

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);

// 1. Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "https:", "http:", "wss:", "ws:"],
      },
    },
  })
);
app.use(
  cors({
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    credentials: true,
  })
);

// 2. Compression & Body Parser
app.use(compression());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// 3. Rate Limiter Middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // limit each IP to 100,000 requests per windowMs (prevent proxy blocking)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests, please try again after 15 minutes',
    errorCode: 'TOO_MANY_REQUESTS',
  },
});

app.use('/api', apiLimiter);

// 4. API Routes Mapping
app.get('/', (req, res) => {
  res.send('BookChat Server API Active & Scribing');
});

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        database: 'UP',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Health check failed - Database connectivity issues');
    res.status(500).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      services: {
        database: 'DOWN',
      },
    });
  }
});

// Alias health route on the /api namespace
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        database: 'UP',
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'API health check failed - Database connectivity issues');
    res.status(500).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      services: {
        database: 'DOWN',
      },
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/presence', presenceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/reading-progress', readingProgressRoutes);
app.use('/api/annotations', annotationRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/attachments', attachmentRoutes);

// 5. Global Error Handling Middleware
app.use(errorHandler);

// 6. Socket.IO Server Initialization
const io = initSocketServer(httpServer);
app.set('io', io);

// 7. Start Server Listeners
const port = config.port;
httpServer.listen(port, () => {
  console.log(`[BookChat Server] Listening on port ${port} (HTTP & Sockets Online)`);
});
