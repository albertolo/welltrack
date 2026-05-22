import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRouter from './routes/auth';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[app error]', err.message, err.stack?.split('\n')[1]);
  res.status(500).json({ error: err.message });
});

export default app;
