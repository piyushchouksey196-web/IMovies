import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

export async function auth(req,res,next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({message:'Please log in first.'});
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('_id name email role');
    if (!user) return res.status(401).json({message:'Account not found.'});
    req.user = user;
    next();
  } catch {
    return res.status(401).json({message:'Invalid or expired token.'});
  }
}
export function adminOnly(req,res,next) {
  if (req.user?.role !== 'admin') return res.status(403).json({message:'Admin access required.'});
  next();
}
