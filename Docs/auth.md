# Vaulton's auth design

This document describes how accounts are created and authenticated in Vaulton. It focuses on the HTTP API, request/response contracts and the session model. Cryptographic details (Argon2id, HKDF, wraps, domain tags, PIN unlock) are described in `crypto.md`.

## 1. Overview

Vaulton uses an anonymous, AccountId-only identity model:

- Every account is identified only by an opaque GUID called **AccountId**.
- There are no usernames or emails in the core design.
- Authentication is based on a **client-derived verifier** (`K_vrf`) and a **server-side PBKDF2+pepper hash**.
- After successful login the server issues:
  - a short-lived **JWT access token** (returned in the JSON response), and
  - a long-lived **refresh token** stored as an HttpOnly, Secure, SameSite cookie.

Registration is split into two steps:

1. A **pre-register handshake** to obtain a fresh `AccountId`.
2. A **register** call where the client uploads its cryptographic material (verifier, salts, MK wraps, Argon2 parameters, schema version).

The auth layer only proves knowledge of the password (via `K_vrf`) and establishes a session. Vault decryption and local UX (including PIN unlock) happen entirely on the client.

In the current prototype all accounts use **`CryptoSchemaVer = 1`**. No branching based on this value is implemented yet; it is reserved for future cryptographic migrations.

## 2. Identity and account lifecycle

### 2.1 Identity model

- Vaulton uses an AccountId-only identity model (as described above).
- The server allocates new opaque GUIDs called **AccountId** and guarantees they are unique.
- On the web client, the frontend stores the AccountId locally (for example in IndexedDB) so the user does not have to type or paste it on every visit.
- Advanced users can export or back up their AccountId as part of an “account bundle” if they wish (future work).

### 2.2 Account creation (high level)

1. The client calls `POST /auth/pre-register` to obtain a fresh `AccountId`.
2. The client derives all cryptographic material locally from:
   - The master password.
   - Per-user Argon2id salt `S_Pwd`.
   - Random values generated on the client (Master Key, optional Recovery Key, etc.).
3. The client calls `POST /auth/register` with:
   - `AccountId`
   - Raw verifier (`Verifier = K_vrf`)
   - Salts and Argon2id parameters
   - Master Key wraps (`MK_Wrap_Pwd`, optional `MK_Wrap_Rk`)
   - Crypto schema version (`CryptoSchemaVer = 1` in this prototype)
4. The server stores only opaque blobs, salts and KDF parameters. It never sees the password or the Master Key in plaintext.

### 2.3 Login (high level)

1. The frontend loads and uses the refresh token cookie (if present) to attempt a silent `POST /auth/refresh`. If that fails, it shows the login form.
2. The user provides their master password on the client. The frontend already knows the `AccountId` from local storage.
3. The client recomputes the raw verifier (`Verifier = K_vrf`) using the same Argon2id + HKDF process as during registration.
4. The client calls `POST /auth/login` with `{ AccountId, Verifier }`.
5. On success the server:
   - Issues a short-lived JWT access token (JSON response).
   - Creates and sets a long-lived refresh token cookie.
6. The client stores the access token in memory and uses it to call protected endpoints (such as vault CRUD). The refresh token is managed entirely by the browser as an HttpOnly cookie.

### 2.4 Session vs vault unlock (conceptual)

Vaulton distinguishes between:

- **Being logged in**: there is a valid refresh token and access token; the server knows which AccountId the client is acting as.
- **Vault being unlocked**: the client has a usable Master Key (MK) in memory and can decrypt entries.

Closing the tab or reloading the page clears JavaScript memory (MK is gone), but the refresh token cookie may still be valid. On next load the frontend:

- Uses `POST /auth/refresh` to re-establish an access token (logged-in state), and
- Asks the user for the master password (or, in future, a PIN) to recover MK and unlock the vault.

## 3. Endpoints

### 3.1 POST /auth/pre-register

**Purpose**  
Allocate a new, unused `AccountId` for a future account. This call does not create a user record yet.

**Request**

- Method: POST
- Path: `/auth/pre-register`
- Body: empty JSON object `{}` or no body.

**Response (200 OK)**

    {
      "AccountId": "4e3d1c7d-9f9e-4a31-b720-9f6a2a6e3f5a"
    }

Notes:

- The server generates a GUID and ensures it is not already used as a `User.Id`.
- The client persists this AccountId locally (e.g. IndexedDB) and uses it in the subsequent `/auth/register` call.
- If the client never calls `/auth/register`, this AccountId simply remains unused.

---

### 3.2 POST /auth/register

**Purpose**  
Create a new user account, storing only verifier hashes, salts, wraps and Argon2 parameters.

The client must have already:

- Derived `K_vrf` from the password (`Verifier = K_vrf`).
- Generated a random Master Key (`MK`).
- Derived `K_kek` and computed `MK_Wrap_Pwd`.
- (Optionally) generated a Recovery Key, derived `K_rk` and computed `MK_Wrap_Rk`.
- Selected Argon2id parameters (for Vaulton v1 these will likely be fixed globally but still stored explicitly per user).

**Request (JSON)**

    {
      "AccountId": "4e3d1c7d-9f9e-4a31-b720-9f6a2a6e3f5a",
      "Verifier": "base64(K_vrf)",
      "S_Verifier": "base64(Pbkdf2Salt)",
      "S_Pwd": "base64(Argon2Salt)",
      "ArgonMem": 65536,
      "ArgonTime": 3,
      "ArgonLanes": 1,
      "ArgonVersion": 19,
      "MK_Wrap_Pwd": "base64(ciphertext)",
      "S_Rk": "base64(...) or null",
      "MK_Wrap_Rk": "base64(...) or null",
      "CryptoSchemaVer": 1
    }

**Response (201 Created)**

    {
      "AccountId": "4e3d1c7d-9f9e-4a31-b720-9f6a2a6e3f5a"
    }

**Server behaviour (conceptual)**

1. Validate the request (required fields present, base64 decodes, etc.).
2. Ensure `AccountId` is not already in use.
3. Compute the stored verifier using PBKDF2+pepper:

   StoredVerifier = PBKDF2(Verifier_raw || Pepper, S_Verifier, iterations, outputLength)

4. Create a new `User` row with:
   - `Id = AccountId`
   - `Verifier = StoredVerifier`
   - `S_Verifier`, `S_Pwd`
   - `MK_Wrap_Pwd`, optional `S_Rk` and `MK_Wrap_Rk`
   - `ArgonMem`, `ArgonTime`, `ArgonLanes`, `ArgonVersion`
   - `CryptoSchemaVer = 1` (fixed in this prototype)
   - Timestamps (`CreatedAt`, `UpdatedAt`)
5. Save to the database and return `201 Created`.

**Error cases**

- AccountId already used → `409 Conflict` (or `400 Bad Request`), generic message:

      {
        "message": "Account cannot be created."
      }

---

### 3.3 POST /auth/login

**Purpose**  
Authenticate an existing account by verifying the password-derived verifier and return an access token plus a refresh cookie.

The client must:

- Know the `AccountId` (from local storage or manual entry).
- Re-derive `Verifier = K_vrf` from the password using `S_Pwd` and Argon2id parameters from the `User` record.

**Request (JSON)**

    {
      "AccountId": "4e3d1c7d-9f9e-4a31-b720-9f6a2a6e3f5a",
      "Verifier": "base64(K_vrf)"
    }

**Response (200 OK)**

    {
      "Token": "jwt-access-token-here"
    }

In addition to the JSON body, the server also sets a refresh token cookie, for example:

- Name: `vaulton_refresh`
- Flags: `HttpOnly`, `Secure`, `SameSite=Lax`
- Path: `/auth/refresh`
- Expires: several days in the future

The refresh token value itself is a random opaque string (not a JWT). Only a hash of this value is stored in the database.

**Server behaviour (conceptual)**

1.  Look up the `User` row by `AccountId`.
2.  If no user is found:
    - Perform a dummy PBKDF2 step to avoid timing-based user enumeration.
    - Return `401 Unauthorized` with a generic error.
3.  If user exists:

    - Read `S_Verifier` and stored verifier hash (`StoredVerifier`).
    - Compute:

          Computed = PBKDF2(Verifier_raw || Pepper, S_Verifier, iterations, outputLength)

    - Compare `Computed` to `StoredVerifier` using constant-time equality.

4.  On success:
    - Optionally update `LastLoginAt`.
    - Revoke or delete any existing refresh tokens for this `AccountId` (only one active refresh token per account).
    - Issue a short-lived JWT access token via `ITokenIssuer`.
    - Generate a new refresh token value, store its hash in the database and set the `vaulton_refresh` cookie.
    - Return `200 OK` with `{ "Token": "<jwt>" }`.

**Error cases**

- Wrong password / wrong verifier / unknown AccountId → always:

      HTTP/1.1 401 Unauthorized
      {
        "message": "Invalid credentials."
      }

  (No difference in message between “account not found” and “bad password”.)

- Invalid body (missing fields, invalid base64, etc.) → for example:

      HTTP/1.1 400 Bad Request
      {
        "message": "Invalid request."
      }

---

### 3.4 POST /auth/refresh

**Purpose**  
Rotate the refresh token and issue a new access token without requiring the password again.

**Request**

- Method: POST
- Path: `/auth/refresh`
- Body: empty JSON object `{}` or no body.
- The refresh token is sent automatically by the browser as an HttpOnly cookie (e.g. `vaulton_refresh`).

**Response (200 OK)**

    {
      "Token": "new-jwt-access-token-here"
    }

**Server behaviour (conceptual)**

1. Read the refresh token value from the cookie.
2. Look up the corresponding refresh token record in the database by a hash of this value.
3. Validate:
   - Token exists and is not revoked.
   - Token belongs to an existing `AccountId`.
   - Token is not expired.
4. If validation fails → return:

   HTTP/1.1 401 Unauthorized
   {
   "message": "Invalid refresh token."
   }

5. If validation succeeds:
   - Create a new JWT access token for the associated `AccountId`.
   - Generate a new refresh token value.
   - Store the new refresh token hash in the database and revoke/delete the old one (rotation).
   - Set a new `vaulton_refresh` cookie with the new value (HttpOnly, Secure, SameSite).
   - Return `200 OK` with `{ "Token": "<new-jwt>" }`.

---

### 3.5 POST /auth/logout

**Purpose**  
Invalidate the current refresh token and remove its cookie.

**Request**

- Method: POST
- Path: `/auth/logout`
- Body: empty JSON object `{}` or no body.
- Uses the refresh token cookie (if present) to identify which session to revoke.

**Server behaviour (conceptual)**

1. Read the refresh token value from the cookie, if present.
2. Revoke or delete the corresponding refresh token record in the database.
3. Set the `vaulton_refresh` cookie with an immediate expiry (clearing it in the browser).
4. Return `204 No Content` or `200 OK`.

If no valid refresh token is present, the endpoint still returns success; logout is idempotent.

## 4. Session model with refresh tokens

Vaulton uses a two-token model:

- A short-lived **access token** (JWT), returned in the JSON body of `/auth/login` and `/auth/refresh`.
- A long-lived **refresh token**, stored as an HttpOnly, Secure, SameSite cookie.

**Access token:**

- Signed JWT (HS256) with at least `sub = AccountId`, `jti`, `iat`, `exp` (around 20 minutes).
- Stored only in memory on the frontend and sent in the `Authorization: Bearer <token>` header.
- When expired, the frontend calls `/auth/refresh` to obtain a new access token.

**Refresh token:**

- Random opaque value (not a JWT).
- Stored as a hash in the database, and as an HttpOnly, Secure, SameSite cookie in the browser.
- Used only with `/auth/refresh` and `/auth/logout`.
- Rotated on each successful call to `/auth/refresh` (old token revoked or deleted).
- At any point there is at most **one active refresh token per account**; successful login or refresh invalidates the previous token.

Security properties:

- The access token is not stored in cookies, which reduces CSRF exposure for normal API calls.
- The refresh token cookie is not accessible from JavaScript (HttpOnly), which reduces the impact of XSS for long-lived sessions.
- SameSite and same-origin deployment further limit cross-site misuse of the refresh cookie.

## 5. Security considerations

- The server never receives the master password or the Master Key, only derived values (verifier, wraps, salts). All vault decryption happens on the client.
- The verifier is not stored directly; only a PBKDF2+pepper hash is stored, which makes a database-only compromise less useful to an attacker.
- Refresh tokens are stored as HttpOnly, Secure, SameSite cookies and only their hashes are stored in the database. This protects long-lived sessions from direct theft via XSS.
- Login errors are deliberately uniform (`401 Invalid credentials`) to reduce the risk of account enumeration.
- All communication between client and server is expected to happen over HTTPS; Vaulton does not implement transport-layer security itself.
- Additional hardening (rate limiting, logging, account lockout, IP-based alerts) can be added at the API or reverse-proxy level in later stages.
