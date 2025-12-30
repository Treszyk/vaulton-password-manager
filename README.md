# Vaulton Password Manager

Vaulton is a zero-knowledge password manager built around an **AccountId-only** identity model. There are no usernames or emails in the core design, just a private AccountId and a master password. The server never sees your master password or your master key in plaintext.

## Why Vaulton

- **Privacy-first identity**: no email address, no username, just an opaque AccountId.
- **Zero-knowledge encryption**: all vault encryption happens on the client; the server stores only opaque blobs and salts.
- **Modern session model**: short-lived JWT access tokens + long-lived refresh tokens in HttpOnly cookies.
- **Future-ready crypto**: KDF mode selectors are built in, and a crypto schema field exists for planned migrations.

## How it works (high level)

1. The client requests a fresh AccountId (`/auth/pre-register`).
2. The client derives a verifier and key-wrapping materials locally, then registers (`/auth/register`).
3. Login proves knowledge of the password-derived verifier (`/auth/login`).
4. The vault is decrypted only on the client using the master key in memory.

## What’s in this repo

- **backend/Api/** – ASP.NET Core API controllers and HTTP contracts.
- **backend/Application/** – service interfaces, commands, and results.
- **backend/Infrastructure/** – EF Core persistence and auth/crypto helpers.
- **backend/Core/** – shared crypto primitives and entities.
- **Docs/** – deep dives on authentication and cryptography.
- **frontend/vaulton-web/** – Angular frontend application.

## Development Setup

The easiest way to run the full stack locally is using Docker Compose.

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Treszyk/vaulton-password-manager.git
   cd vaulton-password-manager
   ```
2. **Ensure Docker is running**:
   - On Windows/Mac: Start **Docker Desktop**.
   - On Linux: Ensure `docker` service is active.
3. Create your local secrets file:
   ```bash
   cp .env.dev.example .env
   ```
4. Run the following command from the root directory:
   ```bash
   docker compose -f docker-compose.dev.yml up
   ```

### Resetting the Environment (Clean Slate)

By default, the development database persists data so you don't lose your work between restarts. If you want to **wipe everything** and start fresh:

```bash
docker compose -f docker-compose.dev.yml down -v
```

The `-v` flag removes the persistent volume (`vaulton-db-dev-data`), giving you an empty database on the next startup.

### Features

- **Health-Aware Startup**: The API waits for the SQL Server database to be healthy before starting.
- **Swagger UI**: Accessible at `http://localhost:8080/swagger` during development.
- **Frontend App**: Accessible at `http://localhost:4200`.

## Production Deployment

Production deployment is managed via the `deploy/` directory. For detailed technical instructions on VPS hosting, SSL termination with Caddy, and hardened security policies, refer to [deploy/README.md](deploy/README.md).

## Documentation

- `Docs/auth.md` for the authentication/session model.
- `Docs/crypto.md` for the key ladder and encryption design.
