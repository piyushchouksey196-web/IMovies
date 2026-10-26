import {Router} from 'express';
import crypto from 'node:crypto';
import {auth} from '../middleware/auth.js';
import {Show,Booking,Payment,Notification} from '../models/index.js';
const router=Router();
let io;
export const setBookingIO = socketServer => {io=socketServer;};
router.use(auth);
router.post('/',async(req,res,next)=>{
 const claimed=[];
 try{
  const showId=String(req.body.showId||''), seats=[...new Set((Array.isArray(req.body.seats)?req.body.seats:[]).map(String))];
  if(!showId||!seats.length||seats.length>10)return res.status(400).json({message:'Choose between 1 and 10 seats.'});
  const show=await Show.findById(showId).populate('movie','title').populate('theatre','name');
  if(!show||show.startsAt<=new Date())return res.status(404).json({message:'Show not found or has already started.'});
  const total=show.price*seats.length;
  const reference='IMV-'+crypto.randomBytes(5).toString('hex').toUpperCase();
  const booking=await Booking.create({reference,user:req.user._id,show:show._id,movieTitle:show.movie.title,theatreName:show.theatre.name,startsAt:show.startsAt,seats,totalAmount:total,status:'pending_payment'});
  for(const code of seats){
   const result=await Show.updateOne({_id:show._id,seats:{$elemMatch:{code,status:'available'}}},{$set:{'seats.$.status':'held','seats.$.holdToken':reference,'seats.$.holdExpiresAt':new Date(Date.now()+10*60*1000),'seats.$.booking':booking._id}});
   if(result.modifiedCount!==1)throw Object.assign(new Error(`Seat ${code} is no longer available.`),{status:409});
   claimed.push(code);
  }
  const payment=await Payment.create({booking:booking._id,user:req.user._id,amount:total,status:'pending',provider:'demo'});
  io?.to(`show:${show._id}`).emit('seats:updated',{showId:show._id,seats:claimed,status:'held'});
  res.status(201).json({booking,payment,message:'Seats held for 10 minutes. Complete demo payment to confirm.'});
 }catch(e){
  if(claimed.length){
   try{
    const b=await Booking.findOne({user:req.user._id,status:'pending_payment'}).sort({createdAt:-1});
    if(b)await Show.updateOne({_id:b.show},{$set:{'seats.$[s].status':'available','seats.$[s].holdToken':null,'seats.$[s].holdExpiresAt':null,'seats.$[s].booking':null}},{arrayFilters:[{'s.code':{$in:claimed},'s.holdToken':b.reference}]});
   }catch(cleanupError){console.error('Seat cleanup failed',cleanupError);}
  }
  next(e);
 }
});
router.get('/mine',async(req,res,next)=>{try{const items=await Booking.find({user:req.user._id}).sort({createdAt:-1}).limit(100);res.json(items);}catch(e){next(e);}});
router.post('/:id/pay-demo',async(req,res,next)=>{
 try{
  const booking=await Booking.findOne({_id:req.params.id,user:req.user._id});
  if(!booking)return res.status(404).json({message:'Booking not found.'});
  if(booking.status!=='pending_payment')return res.status(409).json({message:'Booking is not awaiting payment.'});
  const outcome=req.body.outcome==='fail'?'fail':'success';
  const show=await Show.findById(booking.show);
  if(!show)return res.status(404).json({message:'Show not found.'});
  const payment=await Payment.findOne({booking:booking._id}).sort({createdAt:-1});
  if(outcome==='fail'){
   booking.status='payment_failed';await booking.save();
   if(payment){payment.status='failed';payment.transactionRef='DEMO-FAIL-'+Date.now();await payment.save();}
   await Show.updateOne({_id:show._id},{$set:{'seats.$[s].status':'available','seats.$[s].holdToken':null,'seats.$[s].holdExpiresAt':null,'seats.$[s].booking':null}},{arrayFilters:[{'s.code':{$in:booking.seats},'s.holdToken':booking.reference}]});
   io?.to(`show:${show._id}`).emit('seats:updated',{showId:show._id,seats:booking.seats,status:'available'});
   return res.json({booking,payment,message:'Demo payment failed; seats released.'});
  }
  const now=new Date();
  const result=await Show.updateOne({_id:show._id,seats:{$elemMatch:{code:{$in:booking.seats},status:'held',holdToken:booking.reference,holdExpiresAt:{$gt:now}}}},{$set:{'seats.$[s].status':'booked','seats.$[s].holdToken':null,'seats.$[s].holdExpiresAt':null}},{arrayFilters:[{'s.code':{$in:booking.seats},'s.holdToken':booking.reference,'s.status':'held','s.holdExpiresAt':{$gt:now}}]});
  const refreshed=await Show.findById(show._id);
  const allBooked=booking.seats.every(code=>refreshed.seats.some(s=>s.code===code&&s.status==='booked'&&String(s.booking)===String(booking._id)));
  if(!allBooked){
   booking.status='payment_failed';await booking.save();
   return res.status(409).json({message:'Seat hold expired. Please start a new booking.'});
  }
  booking.status='confirmed';await booking.save();
  if(payment){payment.status='success';payment.transactionRef='DEMO-SUCCESS-'+Date.now();await payment.save();}
  await Notification.create({user:req.user._id,message:`Booking ${booking.reference} confirmed.`,type:'booking'});
  io?.to(`show:${show._id}`).emit('seats:updated',{showId:show._id,seats:booking.seats,status:'booked'});
  res.json({booking,payment,message:'Demo payment successful. Booking confirmed.'});
 }catch(e){next(e);}
});
router.post('/:id/cancel',async(req,res,next)=>{
 try{
  const booking=await Booking.findOne({_id:req.params.id,user:req.user._id});
  if(!booking)return res.status(404).json({message:'Booking not found.'});
  if(booking.status!=='confirmed'&&booking.status!=='pending_payment')return res.status(409).json({message:'This booking cannot be cancelled.'});
  if(booking.startsAt<=new Date())return res.status(400).json({message:'Past or started shows cannot be cancelled.'});
  const show=await Show.findById(booking.show);
  if(booking.status==='confirmed'){
   const payment=await Payment.findOne({booking:booking._id,status:'success'});
   if(payment)return res.status(409).json({message:'A paid booking requires a verified refund workflow. This demo does not issue real refunds.'});
  }
  if(show)await Show.updateOne({_id:show._id},{$set:{'seats.$[s].status':'available','seats.$[s].holdToken':null,'seats.$[s].holdExpiresAt':null,'seats.$[s].booking':null}},{arrayFilters:[{'s.code':{$in:booking.seats},'s.booking':booking._id}]});
  booking.status='cancelled';await booking.save();
  io?.to(`show:${booking.show}`).emit('seats:updated',{showId:booking.show,seats:booking.seats,status:'available'});
  res.json({booking,message:'Booking cancelled.'});
 }catch(e){next(e);}
});
export default router;
