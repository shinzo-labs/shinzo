# Shinzo Database
Shinzo uses a Postgres database to store relevant information related to users and their dapps.

Unlike the other services, the database is not served via docker container, because there is dangerously little protecting a database docker container from being killed and restarted, essentially destroying all of the data. Instead, there are commands provided to spin up a postgres instance assuming the server uses `Ubuntu`.

## Ubuntu Postgres Installation

Following the steps in [Install and configure PostgeSQL](https://ubuntu.com/server/docs/databases-postgresql)

1. Open template database terminal as `postgres` user:
```bash
sudo -u postgres psql template1
```

2. Set `postgres` user password:
```bash
alter user postgres with encrypted password 'postgres';
```

3. Update `pg_hba.conf` to accept connections from all local network IPs and users:
```bash
sudo sh -c "echo 'host    all             all             0.0.0.0/0               md5' >> /etc/postgresql/12/main/pg_hba.conf"
```

4. Set `listen_addresses` in `postgresql.conf`:
```bash
vim /etc/postgresql/12/main/postgresql.conf"

(set listen_addresses = '*')
```

5. Restart `postgresql` service to pick up new config:
```bash
sudo systemctl restart postgresql.service
```

## Database Setup

1. Create user:
```bash
sudo -u postgres createuser shinzo_app_user
```

2. Create database:
```bash
sudo -u postgres createdb shinzo_app_db
```

3. Open `psql` terminal in `shinzo_app_db` as `postgres` user:
```bash
sudo -u postgres psql shinzo_app_db
```

4. Give user password:
```bash
alter user shinzo_app_user with encrypted password 'shinzo_app_user_password';
```

5. Grant all privileges on `shinzo_app_db` to `shinzo_app_user`:
```bash
grant all privileges on database shinzo_app_db to shinzo_app_user;
```

6. Add `pgcrypto` extension:
```bash
create extension pgcrypto;
```

## Database Operations (from root directory)

Reset database (runs most below commands):
```bash
./db/scripts/reset-db.sh
```

Migrate database:
```bash
dbmate up
```

Rollback latest migration:
```bash
dbmate down
```

Write `schema.sql`:
```bash
dbmate dump
```

Write new migration:
```bash
dbmate new <migration_name>
```

Seed database:
```bash
psql $DATABASE_URL < db/seed.sql
```
