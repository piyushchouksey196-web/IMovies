import mongoose from 'mongoose';

const { Schema, model } = mongoose;
const userSchema = new Schema({
  name: {type:String, required:true, trim:true},
  email: {type:String, required:true, unique:true, lowercase:true, trim:true, index:true},
  passwordHash: {type:String, required:true},
  role: {type:String, enum:['user','admin'], default:'user'}
}, {timestamps:true});

const movieSchema = new Schema({
  title:{type:String,required:true,trim:true,index:true},
  description:{type:String,default:''},
  posterUrl:{type:String,default:''},
  genre:{type:String,default:'Drama',index:true},
  language:{type:String,default:'Hindi',index:true},
  durationMinutes:{type:Number,default:120,min:1},
  releaseDate:{type:Date},
  active:{type:Boolean,default:true}
},{timestamps:true});

const theatreSchema = new Schema({
  name:{type:String,required:true},
  address:{type:String,required:true},
  city:{type:String,required:true,index:true},
  screens:{type:Number,default:1,min:1}
},{timestamps:true});

const showSchema = new Schema({
  movie:{type:Schema.Types.ObjectId,ref:'Movie',required:true,index:true},
  theatre:{type:Schema.Types.ObjectId,ref:'Theatre',required:true,index:true},
  screen:{type:String,default:'Screen 1'},
  startsAt:{type:Date,required:true,index:true},
  price:{type:Number,required:true,min:0},
  seatCount:{type:Number,default:40,min:1},
  seats:[{
    code:{type:String,required:true},
    status:{type:String,enum:['available','held','booked'],default:'available'},
    holdToken:{type:String,default:null},
    holdExpiresAt:{type:Date,default:null},
    booking:{type:Schema.Types.ObjectId,ref:'Booking',default:null}
  }]
},{timestamps:true});
showSchema.index({theatre:1,startsAt:1});

const bookingSchema = new Schema({
  reference:{type:String,required:true,unique:true,index:true},
  user:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  show:{type:Schema.Types.ObjectId,ref:'Show',required:true,index:true},
  movieTitle:{type:String,required:true},
  theatreName:{type:String,required:true},
  startsAt:{type:Date,required:true},
  seats:[{type:String,required:true}],
  totalAmount:{type:Number,required:true,min:0},
  status:{type:String,enum:['pending_payment','confirmed','cancelled','payment_failed'],default:'pending_payment',index:true},
  paymentMode:{type:String,default:'demo'}
},{timestamps:true});

const paymentSchema = new Schema({
  booking:{type:Schema.Types.ObjectId,ref:'Booking',required:true,index:true},
  user:{type:Schema.Types.ObjectId,ref:'User',required:true},
  amount:{type:Number,required:true},
  provider:{type:String,default:'demo'},
  status:{type:String,enum:['pending','success','failed','refunded'],default:'pending'},
  transactionRef:{type:String,default:''}
},{timestamps:true});

const notificationSchema = new Schema({
  user:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  message:{type:String,required:true},
  type:{type:String,default:'info'},
  read:{type:Boolean,default:false}
},{timestamps:true});

export const User = model('User',userSchema);
export const Movie = model('Movie',movieSchema);
export const Theatre = model('Theatre',theatreSchema);
export const Show = model('Show',showSchema);
export const Booking = model('Booking',bookingSchema);
export const Payment = model('Payment',paymentSchema);
export const Notification = model('Notification',notificationSchema);
