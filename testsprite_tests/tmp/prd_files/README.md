# AI-Powered Workflow Automation

Build workflow automations through natural conversation instead of technical configuration.

## Features

- **Conversational Workflow Builder**: Describe what you want in plain English, and AI builds the workflow for you
- **Visual Workflow Preview**: See your workflow structure in real-time as it's being created
- **Multiple Trigger Types**: Schedule (cron), Webhook, Manual
- **Action Steps**: HTTP requests, Email sending, Data transformation, Delays
- **Reliable Execution**: Job queue with retries and error handling
- **Execution History**: Track all workflow runs and their results

## Tech Stack

- **Frontend**: React 19, Tailwind CSS 4, Zustand
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL
- **Queue**: Redis + BullMQ
- **AI**: Google Gemini API
- **Deployment**: Docker

## Project Structure

```
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── stores/       # Zustand state management
│   │   ├── lib/          # API client
│   │   └── types/        # TypeScript types
│   └── Dockerfile
├── backend/               # Node.js backend
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Express middleware
│   │   ├── lib/          # Redis, Queue configuration
│   │   ├── db/           # Database connection & migrations
│   │   └── types/        # TypeScript types
│   └── Dockerfile
├── docker-compose.yml     # Production deployment
└── docker-compose.dev.yml # Development services
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (or use Docker)
- Redis (or use Docker)

### Development Setup

1. **Start development services (PostgreSQL & Redis)**:

   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Set up the backend**:

   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your Gemini API key
   npm run db:migrate
   npm run dev
   ```

3. **Set up the frontend**:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Start the background worker** (in a separate terminal):

   ```bash
   cd backend
   npm run worker
   ```

5. Open http://localhost:5173 in your browser

### Production Deployment

1. Create a `.env` file in the root directory:

   ```env
   JWT_SECRET=your-secure-jwt-secret
   GEMINI_API_KEY=your-gemini-api-key
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

2. Build and start all services:

   ```bash
   docker-compose up -d --build
   ```

3. Run database migrations:
   ```bash
   docker-compose exec backend npm run db:migrate
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Chat (Workflow Building)

- `POST /api/chat/message` - Send message to AI
- `GET /api/chat/sessions` - Get conversation sessions
- `POST /api/chat/save-workflow` - Save workflow from conversation

### Workflows

- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow
- `GET /api/workflows/:id` - Get workflow
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow
- `POST /api/workflows/:id/activate` - Activate workflow
- `POST /api/workflows/:id/deactivate` - Deactivate workflow
- `POST /api/workflows/:id/test` - Test workflow
- `POST /api/workflows/:id/run` - Run workflow manually
- `GET /api/workflows/:id/executions` - Get execution history

### Webhooks

- `ALL /api/webhooks/:webhookId` - Receive webhook trigger

## Workflow JSON Structure

```json
{
  "trigger": {
    "type": "schedule",
    "cron": "0 9 * * MON",
    "timezone": "UTC"
  },
  "steps": [
    {
      "id": "step_1",
      "name": "Get Weather Data",
      "type": "http_request",
      "config": {
        "method": "GET",
        "url": "https://api.example.com/data"
      }
    },
    {
      "id": "step_2",
      "name": "Send Email",
      "type": "send_email",
      "config": {
        "to": "user@example.com",
        "subject": "Report",
        "body": "Data: {{step_1.response.body}}"
      }
    }
  ]
}
```

## Environment Variables

| Variable         | Description                  | Default                |
| ---------------- | ---------------------------- | ---------------------- |
| `PORT`           | Backend server port          | 3001                   |
| `DATABASE_URL`   | PostgreSQL connection string | -                      |
| `REDIS_URL`      | Redis connection string      | redis://localhost:6379 |
| `JWT_SECRET`     | Secret for JWT signing       | -                      |
| `GEMINI_API_KEY` | Google Gemini API key        | -                      |
| `SMTP_HOST`      | SMTP server host             | smtp.gmail.com         |
| `SMTP_PORT`      | SMTP server port             | 587                    |
| `SMTP_USER`      | SMTP username                | -                      |
| `SMTP_PASS`      | SMTP password                | -                      |

## License

MIT
