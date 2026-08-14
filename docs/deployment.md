# Production VPS Deployment Guide

This guide details the exact steps to configure, build, and deploy the Creative Marketplace application using Docker Compose and Nginx on a Linux VPS.

## Prerequisites
Ensure your target VPS server has the following installed:
1. Docker Engine (v20.10+)
2. Docker Compose (v2.0+)
3. Git

---

## 1. DNS Records Setup
Configure your domain name server DNS rules:
- `A` Record: `example.com` -> `VPS_PUBLIC_IP`
- `A` Record: `www.example.com` -> `VPS_PUBLIC_IP`
- `A` Record: `api.example.com` -> `VPS_PUBLIC_IP` (if running decoupled subdomains)

---

## 2. Firewall Port Configuration (UFW)
Configure UFW or cloud server security groups to block all entry ports except:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
```

---

## 3. Clone Repository & Setup Env
Clone your repository to the target directory (e.g. `/var/www/creative-marketplace`):
```bash
git clone https://github.com/your-org/creative-marketplace.git /var/www/creative-marketplace
cd /var/www/creative-marketplace
```

Create a production `.env` file under `backend/` by copying `.env.example`:
```bash
cp backend/.env.example backend/.env
nano backend/.env
```
Ensure all variables are filled with strong production keys (minimum 32-character keys for `SECRET_KEY` and `JWT_SECRET_KEY`).

---

## 4. Launch Services
Run the production compose build to fetch, compile, and run the multi-stage images:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Verify that all containers are healthy:
```bash
docker compose -f docker-compose.prod.yml ps
```

---

## 5. Apply Migrations & Create Admin
Run the Alembic database migration inside the running backend container:
```bash
docker exec -it creative_marketplace_backend python -m alembic upgrade head
```

Run the administrator creation utility command securely:
```bash
docker exec -it creative_marketplace_backend python -m app.scripts.create_admin
```

---

## 6. Configure SSL Certificates (Let's Encrypt / Certbot)
To secure the reverse-proxy, install Certbot and hook SSL certificates to Nginx:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```
Certbot will modify the virtual host records and setup automatic cron renewals for HTTPS.
