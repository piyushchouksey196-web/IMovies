import {Router} from 'express';
import {auth} from '../middleware/auth.js';
import {Notification} from '../models/index.js';
const router=Router();
router.get('/',auth,async(req,res,next)=>{try{res.json(await Notification.find({user:req.user._id}).sort({createdAt:-1}).limit(50));}catch(e){next(e);}});
router.patch('/:id/read',auth,async(req,res,next)=>{try{const n=await Notification.findOneAndUpdate({_id:req.params.id,user:req.user._id},{read:true},{new:true});if(!n)return res.status(404).json({message:'Notification not found.'});res.json(n);}catch(e){next(e);}});
export default router;
