# Vaulton's crypto design

This doc describes how Vaulton derives keys, encrypts data and maps cryptographic material to database fields. It focuses on the client-side “key ladder” and the server-side storage format.

## 1. Goals and assumptions

**Goals:**

- The server will **never** see the master password or master key in plaintext form.
- Only opaque ciphertexts, salts, key-wrapping blobs and verifier hashes are persisted in the database.
- A database-only compromise **cannot** allow the attacker to easily decrypt the vault data.

**Trade-offs**

- Vaulton is not trying to protect against a fully compromised client due to its zero-knowledge nature (malware, keyloggers, direct access to the client machine)
- **Passcode Unlock** is a UX feature that allows local sessions to be protected by a simple numeric or alphanumeric PIN. On activation, the user's `MK` is re-wrapped under a passcode-derived key and stored in the browser's persistent storage. This allows "unlocking" without the full master password as long as the local `MK` wrap persists.

## 2. Identity model (high level)

- Each account is identified **only** by an opaque GUID called **AccountId**
- The user is not expected nor asked to enter any usernames or emails in the core design to maintain privacy and protect against cross-site database leaks
- AccountIds are provided by the server by a simple handshake endpoint (`/auth/pre-register`). The client then uses the AccountId to bind and perform locally bound cryptography with AAD.

## 3. Cryptographic primitives and parameters

### 3.1 Client-side primitives

#### **Password KDF mode (Argon2id-backed on the client)**

Vaulton stores a coarse-grained `KdfMode` selector instead of per-user Argon2 parameters. The client runs Argon2id (v1.3) and maps the mode to a concrete Argon2id profile:

- **`KdfMode = 1` (Default)**:
  - Memory: 128 MB
  - Iterations (opsLimit): 3
- **`KdfMode = 2` (Strong)**:
  - Memory: 256 MB
  - Iterations (opsLimit): 4
- **`KdfMode = 3` (Passcode/Local)**:
  - Memory: 192 MB
  - Iterations (opsLimit): 3

The per-user salt `S_Pwd` (16 bytes) is stored in the database.

#### **HKDF (HMAC-SHA-256)**

Used to split high-entropy base keys into context-specific child keys. Labels use fixed, public `info` strings:

**1. From the Password-Derived `hkdfBaseKey`**

- `vaulton/verifier`: Derives the login `verifier`.
- `vaulton/admin`: Derives the administrative `adminVerifier`.
- `vaulton/kek`: Derives the Key Encryption Key (`kekKey`) for wrapping the Master Key.

**2. From the Recovery Key (`RK`)**

- `vaulton/rk-vrf`: Derives the `rkVerifier`.
- `vaulton/rk-kek`: Derives the Key Encryption Key (`rkKek`) for wrapping the Master Key.

**3. From the Master Key (`MK`)**

- `vaulton/vault-enc`: Derives the **`vaultKey`** used for entry encryption.

**4. From a Passcode/Local Key**

- `vaulton/passcode-kek`: Derives the local wrap key.

#### **Master Key (MK)**

- The Master Key (`MK`) is a randomly generated high-entropy symmetric key (256 bits), created on the client during registration.
- `MK` is never sent to the server in plaintext and is **not** used directly for encryption.

- **`vaultKey`** for encrypting vault entries with AES-GCM:

  `vaultKey = HKDF(MK, info = "vaulton/vault-enc")`

Deriving `vaultKey` from `MK` (instead of from the password-derived `hkdfBaseKey`) keeps the vault data independent of password changes. A password change only re-wraps `MK` with a new `kekKey` and updates the verifiers; it does not require re-encrypting all entries.

#### **AES-GCM (AEAD)**

Used on the client to encrypt sensitive material. Every AES-GCM operation in Vaulton uses a domain-separated **AAD (Additional Authenticated Data)** to prevent ciphertext substitution:

- **Master Key Wrap (Password)**: `vaulton:mk-wrap-pwd:schema<N>:<AccountId>`
- **Master Key Wrap (Recovery)**: `vaulton:mk-wrap-rk:schema<N>:<AccountId>`
- **Master Key Wrap (Passcode/Local)**: `vaulton:local-passcode-wrap:<AccountId>`
- **Vault Entries**: `vaulton:v-entry:<AccountId>:<EntryId>`

Each operation uses a **random 12-byte nonce** and produces a **16-byte authentication tag**.

Vaulton uses three independent proofs to protect different actions:

1.  **Login Proof (`verifier`)**:
    - Derived from password via `HKDF(hkdfBaseKey, info="vaulton/verifier")`.
    - Used for standard authentication and session issuance.
2.  **Admin Proof (`adminVerifier`)**:
    - Derived from password via `HKDF(hkdfBaseKey, info="vaulton/admin")`.
    - Required for sensitive actions (e.g., password change, fetching raw wraps).
3.  **Recovery Proof (`rkVerifier`)**:
    - Derived from the high-entropy random **Recovery Key (`RK`)** via `HKDF(rkBaseKey, info="vaulton/rk-vrf")`.
    - Proves possession of the Recovery Key during account recovery.

![Vault Entry Encryption](/docs/diagrams/encryption-flow.jpeg)
![Vault Entry Decryption](/docs/diagrams/decryption-flow.jpeg)

### 3.2 Server-side primitives

#### **PBKDF2 (HMAC-SHA-256) with pepper**

Used to harden the client-side verifiers against database leaks.

Input:

- Raw verifier `verifier` from the client
- Per-user salt `sVerifier` (generated by the server during registration)
- Global secret `Pepper` (kept in configuration)

Output:

- `storedVerifier = PBKDF2(verifier || Pepper, sVerifier, iterations, 32)`

Only `StoredVerifier` and `S_Verifier` are stored in the database.

#### **JWT (HS256)**

Used to issue short-lived access tokens after successful login.

- Symmetric signing key stored in configuration.
- Tokens contain `sub = AccountId`, `jti`, `iat`, `exp` (around 20 minutes).

#### **TLS (outside Vaulton scope)**

All communication between client and server is expected to happen over HTTPS.
