import {Router} from 'express';
import {Movie} from '../models/index.js';
import {auth,adminOnly} from '../middleware/auth.js';
const router=Router();
router.get('/',async(req,res,next)=>{
 try{
  const {q,genre,language,page='1',limit='12'}=req.query;
  const filter={active:true};
  if(q) filter.title={$regex:String(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'};
  if(genre) filter.genre=genre;
  if(language) filter.language=language;
  const p=Math.max(1,Number(page)||1), l=Math.min(50,Math.max(1,Number(limit)||12));
  const [items,total]=await Promise.all([Movie.find(filter).sort({createdAt:-1}).skip((p-1)*l).limit(l),Movie.countDocuments(filter)]);
  res.json({items,total,page:p,pages:Math.ceil(total/l)});
 }catch(e){next(e);}
});
router.get('/:id',async(req,res,next)=>{try{const m=await Movie.findOne({_id:req.params.id,active:true});if(!m)return res.status(404).json({message:'Movie not found.'});res.json(m);}catch(e){next(e);}});
router.post('/',auth,adminOnly,async(req,res,next)=>{try{const m=await Movie.create(req.body);res.status(201).json(m);}catch(e){next(e);}});
router.put('/:id',auth,adminOnly,async(req,res,next)=>{try{const m=await Movie.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});if(!m)return res.status(404).json({message:'Movie not found.'});res.json(m);}catch(e){next(e);}});
router.delete('/:id',auth,adminOnly,async(req,res,next)=>{try{const m=await Movie.findByIdAndUpdate(req.params.id,{active:false},{new:true});if(!m)return res.status(404).json({message:'Movie not found.'});res.json({message:'Movie deactivated.',movie:m});}catch(e){next(e);}});
export default router;
