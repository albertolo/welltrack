import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import symptomsRouter from './routes/symptoms';
import symptomLogsRouter from './routes/symptomLogs';
import moodLogsRouter from './routes/moodLogs';
import medicationsRouter from './routes/medications';
import medicationLogsRouter from './routes/medicationLogs';
import habitsRouter from './routes/habits';
import habitLogsRouter from './routes/habitLogs';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/symptoms', symptomsRouter);
app.use('/api/symptom-logs', symptomLogsRouter);
app.use('/api/mood-logs', moodLogsRouter);
app.use('/api/medications', medicationsRouter);
app.use('/api/medication-logs', medicationLogsRouter);
app.use('/api/habits', habitsRouter);
app.use('/api/habit-logs', habitLogsRouter);

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[app error]', err.message, err.stack?.split('\n')[1]);
  res.status(500).json({ error: err.message });
});

export default app;
