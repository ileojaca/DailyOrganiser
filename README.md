# DailyOrganiser - AI-Powered Daily Planner SaaS

An intelligent daily planning application that learns from user behavior to provide personalized scheduling suggestions and productivity insights.

## Features

- **Smart Goal Management**: Create tasks with importance levels and time constraints
- **AI-Powered Scheduling**: Intelligent time block allocation based on your patterns
- **Energy-Aware Planning**: Matches tasks to your natural energy levels
- **Context-Aware Suggestions**: Recommends tasks based on location and available tools
- **Productivity Analytics**: Track completion rates and efficiency metrics

## Tech Stack

- **Frontend**: Next.js 14 + React + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + Supabase Edge Functions
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **AI/ML**: Client-side inference + Edge Functions
- **Hosting**: Vercel (Frontend) + Supabase (Backend/DB)
- **CI/CD**: GitHub Actions

## Zero-Dollar Architecture

This project is designed to run entirely on free-tier cloud services:

| Service | Free Tier | Usage |
|---------|-----------|-------|
| Vercel | 100 GB/mo, 6K builds | Frontend hosting |
| Supabase | 500 MB DB, 200 connections | Database + Auth |
| GitHub Actions | 2,000 min/month | CI/CD |

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/DailyOrganiser.git
cd DailyOrganiser
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
DailyOrganiser/
├── app/                    # Next.js 14 app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── lib/               # Utility functions
│   └── page.tsx           # Main page
├── components/            # Shared UI components
│   └── ui/               # shadcn/ui components
├── lib/                   # Utility functions
├── public/                # Static assets
├── styles/                # Global styles
├── supabase/             # Supabase migrations
│   └── migrations/       # SQL migrations
├── .github/              # GitHub Actions
│   └── workflows/        # CI/CD workflows
└── docs/                 # Documentation
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Database powered by [Supabase](https://supabase.com/)
- Hosted on [Vercel](https://vercel.com/)
