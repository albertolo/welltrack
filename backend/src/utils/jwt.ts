import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
}

export function generateAccessToken(userId: string): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not set');
  return jwt.sign({ userId }, secret, { expiresIn } as jwt.SignOptions);
}

export function generateRefreshToken(userId: string): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not set');
  return jwt.sign({ userId }, secret, { expiresIn } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not set');
  return jwt.verify(token, secret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not set');
  return jwt.verify(token, secret) as TokenPayload;
}
