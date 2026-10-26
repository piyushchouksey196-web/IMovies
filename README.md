# IMovies — MERN Cinema Booking System

A runnable full-stack starter implementing the requested IMovies workflow:
- React + Vite + Bootstrap UI
- Express + MongoDB/Mongoose REST API
- JWT authentication, bcrypt password hashing, user/admin roles
- Movies, theatres, shows, seat availability, bookings and demo payments
- Socket.IO seat-status broadcasts
- Admin CRUD screens for movies, theatres and shows
- Search/filtering, booking history and cancellation
- Central error handling and API rate limiting

## Requirements
- Node.js 20 LTS or newer
- MongoDB running locally, or a MongoDB Atlas connection string
- npm

## Run locally
1. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` and a long random `JWT_SECRET`.
2. In one terminal:
   ```bash
   cd server
   npm install
   npm run seed
   npm run dev
   ```
3. In another terminal:
   ```bash
   cd client
   npm install
   npm run dev
   ```
4. Open the Vite URL printed in the terminal (usually http://localhost:5173).

Seeded admin:
- Email: `admin@imovies.local`
- Password: `Admin123!`

Seeded customer:
- Email: `user@imovies.local`
- Password: `User123!`

Change seeded passwords before any shared deployment.

## Payment note
The included payment flow is explicitly a **demo payment simulator**, not a real payment gateway. It exercises success/failure booking states without collecting card details. For real payments, integrate a provider such as Razorpay/Stripe in test mode, verify signed webhooks server-side, and never trust a frontend-only success result.

## Important implementation notes
- Seat reservations are created with a conditional atomic update on each show seat; only one request can claim a seat.
- If any seat cannot be claimed, already-claimed seats in that attempt are released.
- This is a learning/demo implementation, not a certified production ticketing platform. Review concurrency, payment webhooks, audit logging, deployment secrets, backups, and privacy before production use.
- Movie posters accept image URLs in this starter; `multer` is included for future upload integration.
