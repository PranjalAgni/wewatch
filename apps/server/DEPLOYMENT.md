# WeWatch Server Deployment

## Docker Deployment

This directory contains the Docker configuration for the WeWatch server.

### Setup

1. **Create a `.env` file** in this directory with your configuration:
   ```bash
   # Database Configuration (Supabase)
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

   # Application Configuration
   NODE_ENV=production
   PORT=4000

   # CORS Configuration
   CORS_ORIGIN=https://yourfrontend.com,https://www.yourfrontend.com
   ```

2. **Build and run** the application:
   ```bash
   docker-compose up -d
   ```

3. **Run database migrations** (if needed):
   ```bash
   docker-compose exec server npx prisma migrate deploy
   ```

### Commands

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild
docker-compose build --no-cache
docker-compose up -d
```

The server will be available on port 4000.
