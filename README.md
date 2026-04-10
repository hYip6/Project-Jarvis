# SBU Bite Bridge MVP

Hackathon MVP for matching students who need discounted food orders with students who have extra dining dollars.

## Stack

- Next.js (App Router)
- MongoDB (native driver)
- Tailwind CSS

## Environment Variables

Create `.env.local`:

```bash
MONGODB_URI="your-mongodb-connection-string"
MONGODB_DB="marketplace-arbitrage"
```

## Run Locally

```bash
npm install
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## MVP Features

- Mock login via SBU email + role selection
- Create new request orders at a fixed 50% discount
- Marketplace feed for pending orders
- First-come-first-served claim flow
- Status transitions: `PENDING -> CLAIMED -> PLACED -> PICKED_UP -> COMPLETED`
- Manual payment flow with Venmo link

## Main API Routes

- `POST /api/users` upsert mock user session profile
- `GET /api/orders?onlyOpen=true` list pending marketplace orders
- `POST /api/orders` create order request
- `POST /api/orders/:id/claim` claim pending order
- `POST /api/orders/:id/place` add order proof and mark placed
- `POST /api/orders/:id/picked-up` requester confirms pickup
- `POST /api/orders/:id/complete` requester confirms manual payment

## Notes

- Payments are not processed in-app for MVP.
- Polling refresh is every 20 seconds.
