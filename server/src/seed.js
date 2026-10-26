import 'dotenv/config';
import bcrypt from 'bcryptjs';
import connectDB from './config/db.js';
import {User,Movie,Theatre,Show} from './models/index.js';
await connectDB();
const adminPass=await bcrypt.hash('Admin123!',12);
const userPass=await bcrypt.hash('User123!',12);
await User.updateOne({email:'admin@imovies.local'},{$setOnInsert:{name:'IMovies Admin',email:'admin@imovies.local',passwordHash:adminPass,role:'admin'}},{upsert:true});
await User.updateOne({email:'user@imovies.local'},{$setOnInsert:{name:'Demo Customer',email:'user@imovies.local',passwordHash:userPass,role:'user'}},{upsert:true});
if(await Movie.countDocuments()===0){
 const movies=await Movie.insertMany([
  {title:'The Last Orbit',description:'A crew races to save a distant space station.',posterUrl:'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600',genre:'Sci-Fi',language:'English',durationMinutes:132},
  {title:'Monsoon Letters',description:'Two old friends reconnect during a rainy season.',posterUrl:'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=600',genre:'Drama',language:'Hindi',durationMinutes:118},
  {title:'City of Shadows',description:'A detective uncovers a mystery across a changing city.',posterUrl:'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=600',genre:'Thriller',language:'Hindi',durationMinutes:126}
 ]);
 const theatre=await Theatre.create({name:'IMovies Central',address:'Main Road',city:'Bhopal',screens:3});
 const startsAt=new Date(Date.now()+24*60*60*1000);startsAt.setHours(18,30,0,0);
 for(let i=0;i<movies.length;i++){
  const seats=Array.from({length:40},(_,j)=>({code:`${String.fromCharCode(65+Math.floor(j/10))}${(j%10)+1}`,status:'available'}));
  await Show.create({movie:movies[i]._id,theatre:theatre._id,screen:`Screen ${i+1}`,startsAt:new Date(startsAt.getTime()+i*60*60*1000),price:180+i*30,seatCount:40,seats});
 }
}
console.log('Seed complete. Admin: admin@imovies.local / Admin123! | User: user@imovies.local / User123!');
await (await import('mongoose')).default.disconnect();
