# AI or Real?

**Can you tell AI-generated images from real photographs?**

A fast-paced visual guessing game built for the **Sky's the Limit - Cloud9 x JetBrains Hackathon** (Category 4: Event Mini-Game). Players are shown 12 portrait images and must decide in 2 seconds each whether each image is AI-generated or a real photo.

**Live:** [https://www.aiorreal.fun](https://www.aiorreal.fun)
**Repository:** [https://github.com/ajitonelsonn/aiorreal.git](https://github.com/ajitonelsonn/aiorreal.git)

![AI or Real? Landing Page](ss/image.png)

---

## About the Game

AI or Real? is designed to be the main attraction at esports event booths. It's a quick, engaging mini-game that fans can play in under 3 minutes while visiting a Cloud9 & JetBrains booth at LCS or VCT events. The game features a VALORANT/League of Legends tactical esports UI theme.

### Key Features

- **12 images per game** — 6 AI-generated + 6 real photos, randomly shuffled each round
- **2-second timer** — Fast-paced gameplay that keeps crowds watching
- **Mouse-only controls** — Click AI or Real (keyboard shortcuts also supported)
- **Live Leaderboard** — Auto-refreshes every 5 seconds for live event display
- **Wall of Fame Gallery** — Players can upload their result cards with selfies
- **Trading Card Results** — Holographic card with score, rank, grade, and stats
- **Sound effects & music** — Full audio experience with game and victory tracks
- **Fully responsive** — Works on phones, tablets, and desktops

---

## How It Works

1. **Register** — Enter your name, optionally select your country
2. **Loading** — Images are preloaded for instant display during gameplay
3. **Countdown** — 3-2-1 countdown with sound effects
4. **Play** — 12 rounds, 2 seconds each. Tap **AI Generated** or **Real Photo**
5. **Results** — Score card with grade (S+/S/A/B/C), rank, accuracy, and stats
6. **Share** — Take a selfie, save your card, upload to the gallery, or play again

The scoring system rewards both speed and consistency. Faster answers earn a speed bonus, and consecutive correct answers build a streak multiplier (up to 3.75x). See [game-aioreal/README.md](game-aioreal/README.md) for the full scoring breakdown, database schema, and technical documentation.

---

## Development

This project was developed using **JetBrains WebStorm** with **Junie** (JetBrains AI Coding Agent) to accelerate game development and improve code quality.

![Development with WebStorm + Junie](ss/Screenshot%202026-01-30%20at%2018.56.48.png)

### How Junie Was Used

The game concept and requirements were documented in the `idea/` folder before development began. This gave Junie clear context to work from:

- `idea/hackthon.txt` — Full hackathon brief and category requirements
- `idea/game_idea.txt` — Game concept, technology choices, and feature spec
- `idea/ai_image_description.txt` — AI-generated image descriptions and S3 paths
- `idea/not_ai_image_description.txt` — Real photo descriptions and S3 paths

By structuring the project requirements upfront, Junie could understand the full scope and assist with building the game architecture, database schema, UI components, and game logic.

---

## Tech Stack

| Layer         | Technology                 |
| ------------- | -------------------------- |
| Framework     | Next.js 16 (App Router)    |
| Language      | TypeScript                 |
| Styling       | Tailwind CSS 4             |
| Animations    | Framer Motion (LazyMotion) |
| Database      | PostgreSQL (Aiven Cloud)   |
| ORM           | Prisma v6                  |
| Image Storage | AWS S3                     |
| Card Export   | html-to-image              |
| Deployment    | Vercel                     |
| IDE           | JetBrains WebStorm + Junie |

---

## Project Structure

```
aiorreal/
├── README.md                 # This file
├── LICENSE                   # MIT License
├── idea/                     # Game concept & hackathon requirements
│   ├── hackthon.txt          # Hackathon brief & rules
│   ├── game_idea.txt         # Game concept document
│   ├── ai_image_description.txt
│   └── not_ai_image_description.txt
├── imag/                     # Source images
│   ├── ai_image/             # AI-generated portrait images
│   └── not_ai_image/         # Real portrait photographs
├── ss/                       # Screenshots
│   ├── image.png             # Landing page screenshot
│   └── Screenshot 2026-...   # WebStorm + Junie development
└── game-aioreal/             # Next.js application
    ├── README.md             # Detailed technical documentation
    ├── prisma/               # Database schema & seeds
    ├── public/               # Static assets (images, sounds)
    └── src/                  # Application source code
        ├── app/
        │   ├── page.tsx          # Landing page
        │   ├── game/page.tsx     # Main game
        │   ├── leaderboard/      # Live leaderboard
        │   ├── gallery/          # Wall of Fame
        │   ├── components/       # Shared components
        │   ├── hooks/            # Custom hooks (SFX)
        │   └── api/              # API routes
        └── lib/
            └── prisma.ts         # Database client
```

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/ajitonelsonn/aiorreal.git
cd aiorreal/game-aioreal

# Install dependencies
npm install

# Set up environment variables (DATABASE_URL, AWS credentials, S3 bucket)

# Set up database
npx prisma generate
npx prisma db push
npm run db:seed

# Run development server
npm run dev
```

See [game-aioreal/README.md](game-aioreal/README.md) for detailed setup instructions, environment variables, scoring system, API documentation, and database schema.

---

## Hackathon Category

**Category 4: Event Mini-Game** — Develop a mini-game that can be played by fans at a LCS or VCT Event Booth or Finals Activation.

### How AI or Real? Meets the Requirements

| Requirement                       | Implementation                                               |
| --------------------------------- | ------------------------------------------------------------ |
| **Fast & Engaging** (under 3 min) | 12 images x 2 seconds = ~30 second gameplay + results        |
| **Intuitive & Accessible**        | Mouse-only click controls, no tutorial needed                |
| **Thematic**                      | VALORANT/LoL tactical esports UI theme                       |
| **Live Leaderboard**              | Real-time top 50, auto-refreshes every 5 seconds             |
| **High Replayability**            | Random image selection from pool, different images each game |
| **Event-Ready**                   | Play Again clears form for next player, no auth required     |

---

## License

MIT License — see [LICENSE](LICENSE) for details.

Copyright (c) 2026 Ajito Nelson
