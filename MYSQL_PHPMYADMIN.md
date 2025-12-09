Running MySQL + phpMyAdmin locally (quick start)
===============================================

This project includes an optional Docker Compose file to run MySQL and phpMyAdmin for local development.

1) Start services

```bash
cd /Users/nmanishkumar/Desktop/profilepic
docker compose -f docker-compose.mysql.yml up -d
```

This creates a MySQL server with default credentials (see the compose file). It also exposes phpMyAdmin on port 8080.

2) Access phpMyAdmin

- Open http://localhost:8080 in your browser.
- Login with: user `root` and password `examplepass` (or change via the compose file).
- You should see the `portfolio` database. If not, create it in phpMyAdmin.

3) Create the submissions table (if not already created)

Run this SQL in phpMyAdmin (SQL tab) or via the server:

```sql
CREATE TABLE IF NOT EXISTS submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name TEXT,
  email TEXT,
  message TEXT,
  timestamp TEXT
);
```

4) Configure the Node server to connect to MySQL

Set environment variables when running the server locally:

```bash
export MYSQL_HOST=127.0.0.1
export MYSQL_PORT=3306
export MYSQL_USER=portfolio_user
export MYSQL_PASSWORD=portfolio_pass
export MYSQL_DATABASE=portfolio
node server.js
```

The server will prefer MySQL if these variables are set and the `mysql2` package is installed.

5) Inspect submissions

- Open phpMyAdmin → `portfolio` → `submissions` to view rows.

Stop services

```bash
docker compose -f docker-compose.mysql.yml down
```
