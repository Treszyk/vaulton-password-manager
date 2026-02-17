# Vaulton's threat model

This document provides a security analysis of the Vaulton Password Manager, focusing on the core architectural principles and the protection of user data. Vaulton is designed with a **Zero-Knowledge** philosophy, ensuring that the service provider never has access to unencrypted user secrets.

## 1. Security Philosophy & Architecture

Vaulton operates on the principle that the user is the sole owner of their cryptographic keys.

- **Zero-Knowledge**: All sensitive data is encrypted on the client side before being transmitted to the backend. The backend stores only opaque, encrypted blobs.
- **Key Isolation**: Sensitive cryptographic operations run in a dedicated Web Worker context, isolated from the main UI thread to reduce accidental key exposure paths. This improves resilience, but does not replace browser trust boundaries if the origin runtime is fully compromised.
- **Identity Privacy**: Users are identified by anonymous identifiers. No personally identifiable information (PII) such as emails or usernames is stored by the backend.

## 2. Core Security Assets

| Asset                     | Protection Strategy                                                                               |
| :------------------------ | :------------------------------------------------------------------------------------------------ |
| **User Password**         | Never stored. Used only to derive keys locally using computationally expensive algorithms.        |
| **Master Key**            | The root key for the vault. Stored only in volatile memory and protected by Web Worker isolation. |
| **Recovery Key**          | High-entropy key managed by the user offline. Authorizes recovery in case of password loss.       |
| **Vault Data**            | Protected by industry-standard authenticated encryption (AES-GCM) using a MK-derived VaultKey.    |
| **Authentication Proofs** | Stored on the server as salted and peppered PBKDF2 hashes to protect against database leaks.      |

## 3. Threat Mitigations

### 3.1 Server & Database Security

The backend is treated as an untrusted storage provider. Even a total database compromise does not grant access to user vault data, as the Master Key is never transmitted to the server in raw form (it is only stored as an encrypted wrap). Server-side hashes are further protected by environment-specific secret ("pepper"), significantly increasing the difficulty of offline brute-force attacks on compromised data.

### 3.2 Privacy & Information Leaks

The system strives to mitigate account discovery by responding consistently to primary authentication requests (such as pre-login and login). For these core endpoints, the server returns structurally consistent responses, uses deterministic fake data for unknown accounts, and performs additional dummy verification work to reduce observable differences, making large-scale account probing significantly more difficult.

### 3.3 Protection Against Brute Force

The system employs multiple layers of defense against automated guessing attacks:

- **Client-Side Work**: Deriving keys requires significant computational effort and memory (standard configuration requires at least 128MB of RAM per guess) by the client, naturally slowing down any guessing attempt and making hardware-accelerated attacks significantly more expensive.
- **Smart Lockout**: Repeated failed authentication attempts lead to temporary lockouts, enforced at the application layer.
- **Rate Limiting**: Auth endpoints are protected with per-IP rate limiting to reduce abusive automation.

### 3.4 Data in Transit

All communication is protected by industry-standard encryption (TLS). Additional security measures, such as HSTS, ensure that browsers always use secure connections. For the hosted environment (https://vaulton.dev), the use of specialized top-level domains (.dev) provides a built-in layer of HTTPS enforcement that protects users from the first connection.

### 3.5 Browser & Application Security

Vaulton employs modern browser security features to protect data within the user's browser:

- **Component Isolation**: The most sensitive key operations are performed in a separate worker execution context from the user interface. This meaningfully raises the bar for trivial UI-thread leakage, but should be understood as defense-in-depth rather than absolute isolation.
- **Security Headers**: Strict browser policies (including CSP) are enforced at the edge proxy in production deployments to prevent unauthorized scripts and ensure only trusted resources are loaded.
- **Memory Hygiene**: Best-effort measures are taken to overwrite sensitive data in memory. While technical buffers (ArrayBuffers) are explicitly cleared after use, JavaScript strings (such as the initial password input) are immutable and managed by the garbage collector, making their erasure a "best-effort" mitigation.

### 3.6 Session & Physical Access

- **Session Security**: Authentication is split into short-lived Access Tokens (held only in volatile memory) and long-lived Refresh Tokens. Refresh Tokens are protected by secure browser flags (`HttpOnly`, `SameSite=Strict`, and `Secure` in production) that prevent access by scripts, mitigating session hijacking via XSS.
- **Tab Isolation**: Closing the application tab clears the sensitive keys from memory, requiring re-authentication to re-open the vault.
- **Convenience vs. Security**: Optional features like PIN/Passcode-based unlocking offer a user-controlled trade-off between the high local security of the full password and the convenience of quick access on a trusted device.

## 4. Account Recovery & Integrity

Vaulton provides a recovery path using a high-entropy offline key. While the key itself is managed independently, the **recovery process** is bound to the user's identity through strict authorization and cryptographic "Context Binding" (AAD) of the Master Key wrap. This ensures that recovery data is mathematically tied to the specific account, preventing an attacker from reusing or moving encrypted secrets between different user identities. All cryptographic operations are designed to fail if sensitive data is presented in an unauthorized context.

## 5. Summary of Residual Risks

While Vaulton tries to provide strong protections, no system is perfectly secure. Residual risks include:

1. **User Password Choice**: The security of the vault ultimately rests on the strength of the user's chosen password. Vaulton mitigates this by using password strength meters and enforcing a minimal "Fair" score requirement, but weak passwords remain a vulnerability if the service's database and secrets are both compromised.
2. **Device Integrity**: A compromised user device (e.g. malware, keyloggers, or memory-dumping tools) is a "game over" scenario. If the execution environment itself is hostile, no client-side cryptographic measure can perfectly guarantee the safety of secrets once they are decrypted for use.

## 6. Browser Extension Security

The Vaulton browser extension shares the same core zero-knowledge threat model regarding the network and server interaction. However, as an MV3 manifest chromium extension, it utilizes strategies that are inherently less secure locally due to MV3 service worker constraints, necessitating different approaches to session persistence compared to the transient web SPA. These specific threat vectors and mitigations are detailed separately in `extension.md`.
