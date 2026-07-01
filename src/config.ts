import path from 'path';

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  themeDir: path.resolve(process.cwd(), process.env.THEME_DIR || 'themes/linen'),
  uploadsDir: path.resolve(process.cwd(), process.env.UPLOADS_DIR || 'uploads'),
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-in-production-min32chars!',
  databasePath: path.resolve(process.cwd(), process.env.DATABASE_PATH || 'data/store.db'),
};

export default config;
