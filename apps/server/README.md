# WeWatch Server - Production Deployment

## HTTPS Setup with Caddy Reverse Proxy

This setup includes automatic HTTPS using Caddy reverse proxy with Let's Encrypt certificates.

### Prerequisites

- Docker and Docker Compose
- Domain name pointing to your server's IP address

### Environment Configuration

Create a `.env` file with these variables:

```bash
# Database Configuration (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Domain Configuration (REQUIRED for HTTPS)
DOMAIN=yourdomain.com

# Application Configuration
NODE_ENV=production
PORT=4000

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

### Deployment

1. **Set your domain** - Make sure your domain points to your server
2. **Create `.env` file** with your configuration
3. **Deploy:**
   ```bash
   docker-compose up -d
   ```

### Services

- **Caddy**: Reverse proxy with automatic HTTPS (ports 80, 443)
- **Node.js Server**: API server (internal port 4000, not exposed)

### Architecture

```
Internet → Caddy (HTTPS) → Node.js Server
         (Port 443)        (Port 4000)
```

### Features

✅ **Automatic HTTPS** - Let's Encrypt certificates  
✅ **HTTP → HTTPS redirects**  
✅ **Security headers** (HSTS, XSS protection, etc.)  
✅ **Gzip compression**  
✅ **Health check** endpoint at `/health`  

### Commands

```bash
# Start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild
docker-compose build --no-cache
docker-compose up -d
```

Your API will be available at `https://yourdomain.com` with automatic SSL certificates!
