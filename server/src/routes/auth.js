import {Router} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {User} from '../models/index.js';
import {auth} from '../middleware/auth.js';
const router=Router();
const safe = u => ({id:u._id,name:u.name,email:u.email,role:u.role});
router.post('/register',async(req,res,next)=>{
  try {
    const name=String(req.body.name||'').trim(), email=String(req.body.email||'').trim().toLowerCase(), password=String(req.body.password||'');
    if(!name || !email || password.length<8) return res.status(400).json({message:'Name, valid email, and password of at least 8 characters are required.'});
    const passwordHash=await bcrypt.hash(password,12);
    const user=await User.create({name,email,passwordHash,role:'user'});
    res.status(201).json({user:safe(user)});
  } catch(e){next(e);}
});
router.post('/login',async(req,res,next)=>{
  try {
    const email=String(req.body.email||'').trim().toLowerCase(), password=String(req.body.password||'');
    const user=await User.findOne({email});
    if(!user || !(await bcrypt.compare(password,user.passwordHash))) return res.status(401).json({message:'Email or password is incorrect.'});
    const token=jwt.sign({sub:user._id.toString(),role:user.role},process.env.JWT_SECRET,{expiresIn:'8h'});
    res.json({token,user:safe(user)});
  } catch(e){next(e);}
});
router.get('/me',auth,(req,res)=>res.json({user:req.user}));
export default router;
