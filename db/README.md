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

1. Create database for the application:
```bash
sudo -u postgres createdb shinzo_platform
```

2. Create user (optional - you can use postgres user):
```bash
sudo -u postgres createuser shinzo_user
```

3. Open `psql` terminal in `shinzo_platform` as `postgres` user:
```bash
sudo -u postgres psql shinzo_platform
```

4. Give user password (if using custom user):
```bash
alter user shinzo_user with encrypted password 'your_secure_password';
```

5. Grant all privileges on `shinzo_platform` to user:
```bash
grant all privileges on database shinzo_platform to shinzo_user;
```

## Environment Configuration

Update your environment variables to point to your external database:

```bash
# In backend/.env or your environment
DATABASE_URL=postgresql://postgres:password@localhost:5432/shinzo_platform
# Or for custom user:
# DATABASE_URL=postgresql://shinzo_user:your_secure_password@localhost:5432/shinzo_platform
```

## Database Operations (from root directory)

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
