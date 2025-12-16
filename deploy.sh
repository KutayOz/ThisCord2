#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

DOMAIN="thiscord.fun"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ThisCord Production Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo -e "${YELLOW}Please copy .env.example to .env and configure it:${NC}"
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
fi

# Load environment variables
source .env

# Validate required variables
if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" = "CHANGE_THIS_TO_A_SECURE_PASSWORD" ]; then
    echo -e "${RED}Error: Please set a secure DB_PASSWORD in .env${NC}"
    exit 1
fi

if [ -z "$JWT_SECRET_KEY" ] || [ "$JWT_SECRET_KEY" = "CHANGE_THIS_TO_A_SECURE_SECRET_KEY_MIN_32_CHARS" ]; then
    echo -e "${RED}Error: Please set a secure JWT_SECRET_KEY in .env${NC}"
    exit 1
fi

if [ -z "$LETSENCRYPT_EMAIL" ] || [ "$LETSENCRYPT_EMAIL" = "your-email@example.com" ]; then
    echo -e "${RED}Error: Please set LETSENCRYPT_EMAIL in .env${NC}"
    exit 1
fi

# Create required directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p certbot/www certbot/conf

# Check if SSL certificate exists
if [ ! -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo -e "${YELLOW}SSL certificate not found. Starting initial setup...${NC}"

    # Use non-SSL config initially
    cp nginx/conf.d/default.conf.nossl nginx/conf.d/default.conf

    # Start services without certbot
    echo -e "${YELLOW}Starting services (without SSL)...${NC}"
    docker compose -f docker-compose.prod.yml up -d db api client nginx

    # Wait for services to be ready
    echo -e "${YELLOW}Waiting for services to start...${NC}"
    sleep 10

    # Get SSL certificate
    echo -e "${YELLOW}Obtaining SSL certificate...${NC}"
    docker compose -f docker-compose.prod.yml run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $LETSENCRYPT_EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN \
        -d www.$DOMAIN

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}SSL certificate obtained successfully!${NC}"

        # Switch to SSL config
        echo -e "${YELLOW}Switching to SSL configuration...${NC}"
        cp nginx/conf.d/default.conf nginx/conf.d/default.conf.nossl.backup
        cat > nginx/conf.d/default.conf << 'NGINX_SSL_CONFIG'
# Upstream definitions
upstream api_backend {
    server api:5284;
    keepalive 32;
}

upstream client_backend {
    server client:80;
    keepalive 32;
}

# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name thiscord.fun www.thiscord.fun;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name thiscord.fun www.thiscord.fun;

    ssl_certificate /etc/letsencrypt/live/thiscord.fun/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/thiscord.fun/privkey.pem;

    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=63072000" always;

    client_max_body_size 100M;

    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        limit_conn conn_limit 10;

        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /hubs/ {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
    }

    location /uploads/ {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://client_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_SSL_CONFIG

        # Reload nginx with SSL config
        docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

        # Start certbot for auto-renewal
        docker compose -f docker-compose.prod.yml up -d certbot
    else
        echo -e "${RED}Failed to obtain SSL certificate!${NC}"
        echo -e "${YELLOW}Make sure your domain DNS is pointing to this server.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}SSL certificate found. Starting all services...${NC}"
    docker compose -f docker-compose.prod.yml up -d --build
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Your application is available at:"
echo -e "  ${GREEN}https://$DOMAIN${NC}"
echo ""
echo -e "Useful commands:"
echo -e "  View logs:     ${YELLOW}docker compose -f docker-compose.prod.yml logs -f${NC}"
echo -e "  Stop:          ${YELLOW}docker compose -f docker-compose.prod.yml down${NC}"
echo -e "  Restart:       ${YELLOW}docker compose -f docker-compose.prod.yml restart${NC}"
echo -e "  Update:        ${YELLOW}git pull && docker compose -f docker-compose.prod.yml up -d --build${NC}"
