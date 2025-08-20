# GodsBooklet — Backend (Node.js + Express + MongoDB)

## Overview
- Endpoints: `/rooms`, `/rooms/:id`, `/rooms/:id/players`, `/rooms/:id/assign`, `/rooms/:id/step`, `/rooms/:id/undo`
- Models: Room, Player, Rules, Event
- Matches MVP & Sprint backlog

## Quick Start
1. **Install dependencies**
```bash
npm i
```
2. **Set environment (.env)**
```
MONGO_URI=mongodb://127.0.0.1:27017/godsbooklet
PORT=3000
```
3. **Run in dev (hot reload)**
```bash
npm run dev
```
4. **Run in prod**
```bash
npm start
```

## Test with cURL
```bash
# Create 9p classic room
curl -X POST http://localhost:3000/rooms -H "Content-Type: application/json" -d '{
  "name":"Club Night","maxSeats":9,"presetKey":"9p-classic",
  "rules":{"witchSelfSaveFirstNight":false,"guardConsecutiveProtectAllowed":false,"sheriffEnabled":true}
}'

# Add player
curl -X POST http://localhost:3000/rooms/<roomId>/players -H "Content-Type: application/json" -d '{ "seat":1,"nickname":"A" }'

# Assign roles
curl -X POST http://localhost:3000/rooms/<roomId>/assign -H "Content-Type: application/json" -d '{}'

# Step advance
curl -X POST http://localhost:3000/rooms/<roomId>/step -H "Content-Type: application/json" -d '{ "actor":"system","action":"advancePhase" }'
```
