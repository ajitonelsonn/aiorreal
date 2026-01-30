# AI or Real? - The Game

**Cloud9 x JetBrains Hackathon**

A fast-paced visual guessing game where players must determine whether portrait images are AI-generated or real photographs. Built with a VALORANT/League of Legends esports tactical UI theme.

Live at: [aiorreal.fun](https://aiorreal.fun)

---

## How the Game Works

### Game Flow

```
┌─────────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│  Register   │────>│  Loading  │────>│ Countdown │────>│ Playing  │
│ (name/country)    │(preload)  │     │  3..2..1  │     │ 12 rounds│
└─────────────┘     └──────────┘     └───────────┘     └────┬─────┘
                                                            │
                                      ┌─────────┐          │
                                      │Feedback │<─────────┘
                                      │(correct/│    answer or
                                      │ wrong)  │    timeout
                                      └────┬────┘
                                           │
                                           v
                              ┌─────────────────────────┐
                              │       Game Over          │
                              │  Score + Rank + Grade    │
                              │                          │
                              │  ┌────────┐ ┌─────────┐ │
                              │  │ Photo  │ │  Save   │ │
                              │  │ Selfie │ │  Card   │ │
                              │  └────────┘ └─────────┘ │
                              │  ┌─────────────────────┐ │
                              │  │  Upload to Gallery  │ │
                              │  └─────────────────────┘ │
                              │  ┌─────────────────────┐ │
                              │  │    Play Again        │ │
                              │  └─────────────────────┘ │
                              └─────────────────────────┘
```

### Step-by-Step

1. **Register** - Enter your name and optionally select your country
2. **Loading** - All 12 images are preloaded into the browser cache (progress bar shown)
3. **Countdown** - 3-2-1 countdown with sound effects
4. **Playing** - For each of the 12 images:
   - A portrait image is displayed
   - You have **2 seconds** to decide: **AI Generated** or **Real Photo**
   - Timer bar shows remaining time (turns yellow at 1.5s, red at 0.75s)
   - If time runs out, the answer counts as wrong
5. **Feedback** - After each answer, a 1.2-second overlay shows if you were correct/wrong
6. **Game Over** - Your final score, rank, and grade are displayed on a trading card
7. **Post-Game Actions**:
   - **Take Photo** - Use your camera to take a selfie that gets composited onto your card
   - **Save Card** - Download your result card as a JPEG image
   - **Upload to Gallery** - Upload your card to the public gallery wall
   - **Play Again** - Start a new game (form is cleared for the next player)

---

## Scoring System

### Points Calculation

Each correct answer earns points based on **speed** and **streak**:

```
points = (base + speedBonus) × streakMultiplier
```

| Component | Formula | Range |
|---|---|---|
| **Base Points** | Fixed | 100 |
| **Speed Bonus** | `(timeLeft / 2) × 100` | 0 - 100 |
| **Streak Multiplier** | `1 + (streak × 0.25)` | 1x - 4x |

- **Wrong answer** = 0 points, streak resets to 0
- **Timeout** (no answer) = 0 points, streak resets to 0

### Streak Multiplier Table

| Consecutive Correct | Multiplier | Max Points per Round |
|---|---|---|
| 0 (first correct) | 1.00x | 200 |
| 1 | 1.25x | 250 |
| 2 | 1.50x | 300 |
| 3 | 1.75x | 350 |
| 4 | 2.00x | 400 |
| 5 | 2.25x | 450 |
| ... | +0.25x each | ... |
| 11 (perfect game) | 3.75x | 750 |

### Theoretical Score Range

| Scenario | Score |
|---|---|
| All wrong / all timeout | 0 |
| All correct, slowest possible | ~1,200 |
| All correct, instant answers | ~5,700 |
| Perfect game (12/12, instant) | ~5,700 |

### Grade System

| Grade | Score Range | Color |
|---|---|---|
| S+ (Supreme) | 1500+ | Red |
| S (Ace) | 1200 - 1499 | Gold |
| A (Good) | 900 - 1199 | Cyan |
| B (Average) | 600 - 899 | Green |
| C (Novice) | 0 - 599 | Gray |

### Average Time

- Calculated as the mean response time across all rounds where the player answered (timeouts excluded)
- Formula: `sum(TIME_PER_IMAGE - timeLeft) / answeredRounds`
- Displayed on leaderboard as `Xs avg`

---

## System Architecture

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Animations | Framer Motion (LazyMotion) |
| Database | PostgreSQL (Aiven Cloud) |
| ORM | Prisma v6 |
| Storage | AWS S3 (bucket: `aiorreal.fun`) |
| Card Export | html-to-image (toJpeg) |
| Deployment | Vercel |

### Project Structure

```
game-aioreal/
├── prisma/
│   ├── schema.prisma          # Database models
│   └── seed.ts                # Seed script for images/countries
├── public/
│   └── assets/
│       ├── images/            # Hero images, backgrounds, logos
│       └── sounds/            # SFX (click, correct, wrong, etc.)
├── src/
│   ├── lib/
│   │   └── prisma.ts          # Prisma client singleton
│   └── app/
│       ├── page.tsx           # Home / landing page
│       ├── game/page.tsx      # Main game page
│       ├── leaderboard/page.tsx # Live leaderboard (auto-refresh 5s)
│       ├── gallery/page.tsx   # Wall of Fame gallery (auto-refresh 30s)
│       ├── components/
│       │   ├── GameOverCard.tsx    # Post-game card with photo/save/upload
│       │   └── MusicProvider.tsx   # Background music context
│       ├── hooks/
│       │   └── useSfx.ts          # Sound effects hook
│       └── api/
│           ├── images/route.ts        # GET - fetch 12 random images
│           ├── game/submit/route.ts   # POST - submit score
│           ├── leaderboard/route.ts   # GET - top 50 scores
│           ├── countries/route.ts     # GET - country list
│           ├── upload-card/route.ts   # POST - upload card to S3
│           └── gallery/route.ts       # GET - gallery items
```

### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/images` | GET | Returns 12 random images (6 AI + 6 real, shuffled) |
| `/api/game/submit` | POST | Submits score, creates Player + Score records, returns rank |
| `/api/leaderboard` | GET | Returns top 50 scores with player info |
| `/api/countries` | GET | Returns all countries (name, code, flag emoji) |
| `/api/upload-card` | POST | Uploads base64 card image to S3, saves GalleryItem |
| `/api/gallery` | GET | Returns 100 most recent gallery items |

---

## Database Schema

```
┌─────────────────┐       ┌─────────────────┐
│   GameImage     │       │     Player      │
├─────────────────┤       ├─────────────────┤
│ id        (PK)  │       │ id        (PK)  │
│ url       (UQ)  │       │ username        │
│ isAi            │       │ country?        │
│ category?       │       │ createdAt       │
│ description?    │       │                 │
│ source?         │       └────────┬────────┘
│ createdAt       │                │ 1:N
└─────────────────┘                │
                           ┌───────┴────────┐
┌─────────────────┐        │     Score      │
│    Country      │        ├────────────────┤
├─────────────────┤        │ id       (PK)  │
│ id        (PK)  │        │ playerId (FK)  │
│ name      (UQ)  │        │ totalScore     │
│ code            │        │ correctCount   │
│ flag            │        │ totalImages    │
│ createdAt       │        │ accuracy       │
└─────────────────┘        │ avgTime?       │
                           │ createdAt      │
┌─────────────────┐        └────────────────┘
│  GalleryItem    │
├─────────────────┤
│ id        (PK)  │
│ url             │
│ username        │
│ score           │
│ country?        │
│ createdAt       │
└─────────────────┘
```

### Model Details

- **GameImage** - Pool of images used in the game. Indexed by `isAi` for balanced selection (6 AI + 6 real per game)
- **Player** - Created on each game submission. Stores username and optional country
- **Score** - Game result tied to a Player. Stores total score, accuracy, correct count, and average response time
- **Country** - Lookup table for country names, ISO codes, and flag emojis
- **GalleryItem** - Uploaded player cards stored on S3. Independent from Player/Score (stores denormalized username/score for display)

---

## Game Features

### Gameplay
- 12 portrait images per game (6 AI-generated + 6 real photos, randomly shuffled)
- 2-second timer per image with visual countdown
- Keyboard shortcuts: `A` / `1` / `←` for AI, `R` / `2` / `→` for Real
- Speed bonus + streak multiplier scoring system
- Sound effects for all interactions (click, correct, wrong, tick, game over, coin)
- Background music with separate game and victory tracks

### Post-Game Card
- Trading card design with holographic shimmer effect
- Player avatar with country flag or initial fallback
- Score, rank, accuracy, average time, and best streak stats
- Round-by-round results strip (green/red bars)
- QR code linking to the game
- Camera selfie integration (mirror mode, crosshair viewfinder)
- Export as JPEG with html-to-image
- Upload to gallery (S3 + database)
- Copy link to clipboard

### Live Pages
- **Leaderboard** - Top 50 players, auto-refreshes every 5 seconds, podium for top 3, new entry highlight animation
- **Gallery (Wall of Fame)** - Masonry grid of uploaded cards, auto-refreshes every 30 seconds, click to view full-size modal

---

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- AWS S3 bucket

### Environment Variables

```env
DATABASE_URL=postgresql://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=aiorreal.fun
```

### Installation

```bash
cd game-aioreal
npm install
npx prisma generate
npx prisma db push
npm run db:seed    # Seed images and countries
npm run dev
```

### Build

```bash
npm run build
npm run start
```

---

## Event Mode

This game is designed for use at live events (hackathons, meetups). Key design decisions:
- **Play Again clears the form** - Username and country are wiped so the next player starts fresh
- **No login/auth required** - Quick registration with just a name
- **Leaderboard refreshes every 5 seconds** - Display on a screen for live competition
- **Gallery is public** - All uploaded cards appear on the Wall of Fame
- **2-second timer** - Fast-paced for exciting crowd watching
