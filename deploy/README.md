# Vaulton Production Deployment

Technical guide for deploying the Vaulton password manager to a production environment using Docker and Caddy.

## Prerequisites

- Linux VPS with Docker Engine and Docker Compose installed.
- Domain name with A/AAAA records pointing to the server IP.
- Ports 80 and 443 accessible for HTTP/HTTPS traffic.

## Deployment Structure

The repository is structured to support a direct "Clone and Run" deployment. All relative paths in the Docker configurations expect the following hierarchy (which is the default after cloning):

/vaulton-password-manager/<br/>
├── deploy/ <-- Configuration, Caddyfile, and .env files<br/>
├── backend/ <-- API source (built automatically by Docker)<br/>
└── frontend/ <-- Frontend source (built automatically by Docker)<br/>

```

### File Reference

- **`deploy/docker/docker-compose.prod.yml`**: The main orchestration file. Defines the 3 services (API, DB, Caddy) and their network isolation.
- **`deploy/Caddyfile`**: The configuration for the edge proxy. Handles routing, SSL, and HTTP security headers.
- **`deploy/.env.example`**: Template for production secrets. Copy this to `deploy/.env`.
- **`deploy/docker/Dockerfile.caddy`**: Special Dockerfile that builds the Angular frontend and serves it via Caddy.
- **`backend/Api/Dockerfile`**: Dockerfile that builds the .NET API.

```

## Setup Instructions

### 1. Prepare the VPS

Clone the repository to your production server:

```bash
git clone https://github.com/Treszyk/vaulton-password-manager.git
cd vaulton-password-manager
```

### 2. How the App is Built

Vaulton uses **Multi-stage Docker builds** for both the Backend and Frontend. You do not need to build any code on your local machine if you have source access on the VPS.

- **Frontend**: `Dockerfile.caddy` pulls Node.js, compiles the Angular app, and transfers the static assets to a clean Caddy image.
- **Backend**: `Dockerfile` pulls the .NET SDK, compiles the source, and transfers the binaries to a clean .NET runtime image.

This ensures a consistent production environment without needing local toolchains installed.

### 3. Configure Environment Variables

Initialize the `.env` file in the `deploy/` directory from the provided `.env.example`.

### 4. Launch the Stack

From the **root of the repository**:

```bash
docker compose -f deploy/docker/docker-compose.prod.yml --env-file deploy/.env up -d
```

If you need to **update the code**, you must rebuild the images manually:

```bash
docker compose -f deploy/docker/docker-compose.prod.yml --env-file deploy/.env build
```

## System Architecture

1. **Gateway (Caddy)**: Handles SSL termination, static file delivery, and API reverse proxying. Enhances security headers (CSP, HSTS) at the edge.
2. **Backend (API)**: .NET 8 Web API implementing core business logic and security middleware.
3. **Database (SQL Server)**: Persistent storage for encrypted user data.

## Security Policies

- **Content Security Policy (CSP)**: Strict policy enforcing Trusted Types and disabling untrusted script/style sources.
- **HSTS**: Force HTTPS with 1-year max-age and preloading support.
- **Health Checks**: Containers implement automated health checks to ensure service availability and proper startup sequencing.
