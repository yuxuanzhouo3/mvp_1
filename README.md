# PersonaLink - AI-Driven Social Matching Platform

A modern, full-stack social application featuring AI-powered personality matching, real-time chat, integrated payments, and comprehensive user management.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account
- Vercel account
- Upstash Redis account

### Local Development

1. **Clone and install dependencies:**
```bash
git clone <your-repo-url>
cd mvp_1
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env.local
# Add your credentials to .env.local
```

3. **Run the development server:**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🚀 Production Deployment

### Automated Deployment with Vercel

1. **Setup Vercel configuration:**
```bash
./scripts/vercel-setup.sh
```

2. **Deploy to production:**
```bash
./scripts/deploy.sh
```

3. **Deploy to preview:**
```bash
./scripts/deploy.sh preview
```

### Manual Deployment

1. **Install Vercel CLI:**
```bash
npm install -g vercel@latest
vercel login
```

2. **Configure environment variables:**
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... add all required environment variables
```

3. **Deploy:**
```bash
vercel --prod
```

## 📦 Project Structure

```
mvp_1/
├── app/                    # Next.js 14 App Router
│   ├── (auth)/            # Authentication routes
│   ├── (ops)/             # Operations routes
│   ├── api/               # API routes
│   ├── chat/              # Chat functionality
│   ├── dashboard/         # User dashboard
│   └── matching/          # AI matching system
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard components
│   └── ui/               # UI components
├── lib/                  # Utilities and services
│   ├── matching/         # AI matching engine
│   └── supabase/         # Database client
├── scripts/              # Deployment and utility scripts
└── supabase/             # Database migrations
```

## 🌟 Key Features

### 🔐 Authentication
- Multi-method authentication (Email, Google, Phone)
- Two-factor authentication (2FA)
- Session management with NextAuth.js
- Role-based access control

### 💬 Real-time Chat
- WebSocket-based real-time messaging
- Message encryption
- File sharing support
- Typing indicators

### 🤖 AI Matching System
- Personality-based matching algorithm
- Interest compatibility scoring
- Location-based filtering
- Behavioral analysis

### 💳 Payment Integration
- Stripe payment processing
- USDT cryptocurrency support
- Alipay integration
- Transaction history

### 📊 Admin Dashboard
- User management
- Payment monitoring
- System health metrics
- Analytics dashboard

### 🔧 Infrastructure
- Supabase PostgreSQL database
- Redis caching with Upstash
- Vercel serverless deployment
- Comprehensive error handling

## 🛠️ Technology Stack

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS, Radix UI
- **Database:** Supabase (PostgreSQL)
- **Caching:** Upstash Redis
- **Authentication:** NextAuth.js
- **Payments:** Stripe, USDT, Alipay
- **Deployment:** Vercel
- **Monitoring:** Vercel Analytics

## 🔧 Development Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Testing
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report

# Database
npm run db:init          # Initialize database
npm run db:migrate       # Run migrations
npm run test:db          # Test database connection

# Deployment
./scripts/deploy.sh      # Deploy to production
./scripts/rollback.sh    # Rollback deployment
./scripts/load-test.sh   # Run load tests
```

## 🔒 Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Redis
UPSTASH_REDIS_URL=your_redis_url
UPSTASH_REDIS_TOKEN=your_redis_token

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Payments
STRIPE_SECRET_KEY=your_stripe_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

## 📊 Database Schema

The application uses the following main tables:

- **users** - User profiles and authentication
- **user_settings** - User preferences and settings
- **matches** - AI-generated user matches
- **chat_rooms** - Chat conversations
- **messages** - Individual chat messages
- **payments** - Payment transactions
- **user_balance** - User credit balance
- **transactions** - Financial transactions
- **user_interests** - User interests for matching
- **user_photos** - User profile photos

## 🚀 Performance Features

- **Connection Management:** Unified database connection manager
- **Retry Logic:** Smart retry system with exponential backoff
- **Circuit Breaker:** Automatic failure detection and recovery
- **Caching:** Redis-based caching for improved performance
- **Health Monitoring:** Real-time system health dashboard
- **Load Balancing:** Automatic load distribution

## 🔍 Monitoring and Debugging

### Health Check
```bash
curl https://your-app.vercel.app/api/health
```

### Load Testing
```bash
./scripts/load-test.sh https://your-app.vercel.app 50 120
```

### Logs
```bash
vercel logs https://your-app.vercel.app --limit 100
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@personalink.com or create an issue in this repository.

## 🔄 Deployment Status

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/personalink)

---

**Built with ❤️ using Next.js, Supabase, and Vercel** 