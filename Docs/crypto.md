# Vaulton's crypto design

This doc describes how Vaulton derives keys, encrypts data and maps cryptographic material to database fields. It focuses on the client-side “key ladder” and the server-side storage format.

## 1. Goals and assumptions

**Goals:**

- The server should and **will** never see the master password or master key in plaintext form.
- Only opaque ciphertexts, salts, key-wrapping blobs and user-specific Argon2id params are persisted in the database
- A database-only compromise **should not** allow the attacker to decrypt the vault data

**Trade-offs**

- Vaulton is not trying to protect against a fully compromised client due to its zero-knowledge nature (malware, keyloggers, direct access to the client machine)
- Planned local "PIN unlock" is a UX feature that simplifies day-to-day use of the app. While enhancing UX it weakens local security due to PIN being easier to brute-force

## 2. Identity model (high level)

- Each account is identified **only** by an opaque GUID called **AccountId**
- The user is not expected nor asked to enter any usernames or emails in the core design to maintain privacy and protect against cross-site database leaks
- AccountIds are provided by the server by a simple handshake endpoint (`/auth/pre-register`). The client then uses the AccountId to bind and perform locally bound cryptography with AAD.

## 3. Cryptographic primitives and parameters

### 3.1 Client-side primitives

#### **Argon2id**

Used to derive a high-entropy root key `K_argon` from the master password and a per-user salt `S_Pwd`. Parameters (per user) are stored in the database:

- `ArgonMem` (memory cost)
- `ArgonTime` (iterations)
- `ArgonLanes` (parallelism)
- `ArgonVersion`

#### **HKDF (HMAC-SHA-256)**

Used to split `K_argon` into multiple independent keys:

- `K_vrf` (verifier key for auth)
- `K_kek` (key-encryption key for wrapping the Master Key)
- `K_tag` (key used for calculating deterministic domain tags)

HKDF uses fixed, public `info` strings (e.g. `"vaulton/verifier"`, `"vaulton/mk-wrap"`, `"vaulton/domain-tag"`); these do **not** need to be stored per-user.

#### **AES-GCM (AEAD)**

Used on the client to encrypt:

- The randomly generated Master Key (`MK`) under `K_kek` -> `MK_Wrap_Pwd`
- (Planned) MK under randomly generated user-held Recovery Key `K_rk` -> `MK_Wrap_Rk`
- Each vault entry JSON under `MK` -> per-entry { `Nonce`, `CipherText`, `Tag` }

Provides confidentiality + integrity,

#### **HMAC-SHA-256 (Domain tags)**

Used with `K_tag` to compute deterministic tags for normalized domains:

`DomainTag = HMAC(K_tag, normalizedDomain)`

Stored server-side to let a planned extension easily fetch entries by domain without decrypting the whole vault.

This intentionally leaks a small amount of information: an attacker (or hosting provider) who can see the database can tell that a given user has, for example, 3 entries with the same `DomainTag`. They still do not learn the actual domain name or any plaintext credentials without the master password (`K_tag`), but they can see that those 3 entries belong to the same unknown site.

### 3.2 Server-side primitives

#### **PBKDF2 (HMAC-SHA-256) with pepper**

Used to harden the client-side verifier against database leaks.

Input:

- Raw verifier `Verifier_raw = K_vrf` from the client
- Per-user salt `S_Verifier`
- Global secret `Pepper` (kept in configuration, **not** DB)

Output:

- `StoredVerifier = PBKDF2(Verifier_raw || Pepper, S_Verifier, iterations, outputLength)`

Only `StoredVerifier` and `S_Verifier` are stored in the database.

#### **JWT (HS256)**

Used to issue short-lived access tokens after successful login.

- Symmetric signing key stored in configuration.
- Tokens contain `sub = AccountId`, `jti`, `iat`, `exp` (around 20 minutes).

#### **TLS (outside Vaulton scope)**

All communication between client and server is expected to happen over HTTPS.
