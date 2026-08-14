# Database Backup & Restore Guide

This guide details the commands to execute regular backups and restores of the MySQL database and uploaded user assets.

## 1. Database Backups

### Manual MySQL Dump
To dump the entire database state into a local SQL dump file:
```bash
docker exec creative_marketplace_db mysqldump -u root -p"YOUR_PRODUCTION_DB_PASSWORD" creative_marketplace > backup_$(date +%F).sql
```

### Scheduled Backups (Cron Job)
Create a simple shell script at `/root/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/root/db_backups"
mkdir -p $BACKUP_DIR
docker exec creative_marketplace_db mysqldump -u root -p"YOUR_PRODUCTION_DB_PASSWORD" creative_marketplace > $BACKUP_DIR/db_backup_$(date +%F_%T).sql
# Delete dumps older than 14 days
find $BACKUP_DIR -type f -name "*.sql" -mtime +14 -delete
```
Make it executable and register in `crontab -e` to run daily at 2:00 AM:
```text
0 2 * * * /bin/bash /root/backup.sh
```

---

## 2. Database Restore

To restore the database state from a backup `.sql` file:
```bash
# 1. Stop app containers to prevent writes
docker compose -f docker-compose.prod.yml stop backend frontend

# 2. Pipe the SQL dump back into MySQL container
docker exec -i creative_marketplace_db mysql -u root -p"YOUR_PRODUCTION_DB_PASSWORD" creative_marketplace < backup_2026-08-14.sql

# 3. Start services again
docker compose -f docker-compose.prod.yml start backend frontend
```

---

## 3. Uploaded Assets Backups
Uploaded assets (profile photos, cover images, workspace files) are saved in the persistent Docker volume `uploads_data`.

To backup the entire uploads directory:
```bash
tar -czvf uploads_backup_$(date +%F).tar.gz /var/lib/docker/volumes/creative-marketplace_uploads_data/_data
```
To restore uploads:
```bash
tar -xzvf uploads_backup_2026-08-14.tar.gz -C /var/lib/docker/volumes/creative-marketplace_uploads_data/_data
```
