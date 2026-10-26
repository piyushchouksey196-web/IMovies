import {Router} from 'express';
import {Show,Movie,Theatre} from '../models/index.js';
import {auth,adminOnly} from '../middleware/auth.js';
const router=Router();
const makeSeats=n=>Array.from({length:n},(_,i)=>({code:`${String.fromCharCode(65+Math.floor(i/10))}${(i%10)+1}`,status:'available'}));
router.get('/',async(req,res,next)=>{
 try{
  const f={startsAt:{$gte:new Date()}};
  if(req.query.movie)f.movie=req.query.movie;
  if(req.query.theatre)f.theatre=req.query.theatre;
  const shows=await Show.find(f).populate('movie','title posterUrl genre language durationMinutes').populate('theatre','name city address').sort({startsAt:1}).limit(100);
  res.json(shows.map(s=>({ ...s.toObject(),availableSeats:s.seats.filter(x=>x.status==='available'||(x.status==='held'&&x.holdExpiresAt<new Date())).length })));
 }catch(e){next(e);}
});
router.get('/:id',async(req,res,next)=>{try{const s=await Show.findById(req.params.id).populate('movie').populate('theatre');if(!s)return res.status(404).json({message:'Show not found.'});const o=s.toObject();o.seats=o.seats.map(x=>({code:x.code,status:x.status==='held'&&x.holdExpiresAt<new Date()?'available':x.status}));res.json(o);}catch(e){next(e);}});
router.post('/',auth,adminOnly,async(req,res,next)=>{
 try{
  const {movie,theatre,screen='Screen 1',startsAt,price,seatCount=40}=req.body;
  if(!movie||!theatre||!startsAt||!Number.isFinite(Number(price))||Number(price)<0)return res.status(400).json({message:'Movie, theatre, valid start time and price are required.'});
  if(new Date(startsAt)<=new Date())return res.status(400).json({message:'Showtime must be in the future.'});
  if(!await Movie.findById(movie)||!await Theatre.findById(theatre))return res.status(400).json({message:'Movie or theatre does not exist.'});
  const count=Math.min(100,Math.max(1,Number(seatCount)||40));
  const show=await Show.create({movie,theatre,screen,startsAt,price:Number(price),seatCount:count,seats:makeSeats(count)});
  res.status(201).json(await Show.findById(show._id).populate('movie').populate('theatre'));
 }catch(e){next(e);}
});
router.put('/:id',auth,adminOnly,async(req,res,next)=>{try{const allowed={};for(const k of ['screen','startsAt','price'])if(req.body[k]!==undefined)allowed[k]=req.body[k];const s=await Show.findByIdAndUpdate(req.params.id,allowed,{new:true,runValidators:true}).populate('movie').populate('theatre');if(!s)return res.status(404).json({message:'Show not found.'});res.json(s);}catch(e){next(e);}});
router.delete('/:id',auth,adminOnly,async(req,res,next)=>{try{const s=await Show.findById(req.params.id);if(!s)return res.status(404).json({message:'Show not found.'});if(s.seats.some(x=>x.status==='booked'))return res.status(409).json({message:'Cannot delete a show with booked seats.'});await s.deleteOne();res.json({message:'Show deleted.'});}catch(e){next(e);}});
export default router;
