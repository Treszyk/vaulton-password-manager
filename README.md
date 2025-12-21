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

- **Api/** – ASP.NET Core API controllers and HTTP contracts.
- **Application/** – service interfaces, commands, and results.
- **Infrastructure/** – EF Core persistence and auth/crypto helpers.
- **Core/** – shared crypto primitives and entities.
- **Docs/** – deep dives on authentication and cryptography.

If you want to learn more, start with:

- `Docs/auth.md` for the authentication/session model.
- `Docs/crypto.md` for the key ladder and encryption design.
