# Vaulton Browser Extension

The Vaulton browser extension bridges the gap between the secure vault and the user's browsing experience. It handles credential detection, filling, and generation while maintaining a strict security boundary.

## 1. Extension Architecture

The extension follows the standard WebExtension architecture:

1.  **Background Service Worker (`background/`)**:
    - Handles persistent state (locked/unlocked status).
    - Manages API requests to the backend.
    - Coordinates communication between content scripts and the popup.

2.  **Content Scripts (`content/`)**:
    - Injected into web pages to detect login/register forms.
    - Renders the `CredentialPicker` and `SavePrompt` overlays.
    - **Security**: Does _not_ have direct access to the vault. It requests credentials from the background worker via message passing.

3.  **Popup (`popup/`)**:
    - Provides the main UI for unlocking the vault and viewing entries.
    - **Crypto Host**: Serves as the host for the `crypto-worker`. This offloads intensive `Argon2id` key derivation tasks to a background thread to prevent UI freezing during login/unlock.

## 2. Core Components (Functional Overview)

### Overlay Manager

Manages the `Shadow DOM` for the extension content-scripts. It ensures that the components are injected into the DOM in a way that does not interfere with the website's functionality.

### Form Detector

Responsible for identifying login and registration fields within the DOM. It uses heuristics to classify inputs (e.g., locating `password` and their associated `username` fields) and prepares them for autofill operations. Current implementation doesn't work on all websites.

### Button Injector

Injects buttons into the detected inputs that trigger the credential picker.

### Credential Picker

The user-facing overlay that appears when the user clicks on the injected button. It handles the display of accounts and provides the `Generate Secure Password` functionality, ensuring the user can select or create secrets without leaving the current context. The user might also choose to use the `Reveal Input` functionality to reveal the password in the input field if the website doesn't support it natively.

### Save Prompt

The user-facing overlay that appears when a form submission was detected. It handles the logic for saving the credentials to the vault.

### Autofill Engine

Executes the filling of data into the detected fields.

## 3. Threat Model & MV3 Persistence

The Vaulton browser extension shares the **Zero-Knowledge** `threatmodel.md` in regards to network operations. Specifically:

- **Data in Transit**: All network communication uses the same encrypted channels and protocols.
- **Server Trust**: The backend remains untrusted and never sees raw secrets.

### Local Threat Model Differences

The extension operates in a unique environment (`MV3 Service Worker`) which introduces distinct local threat vectors compared to the web-based SPA.

| Vector      | Web App (SPA)                                 | Browser Extension (MV3)                                                                            |
| :---------- | :-------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| **Keys**    | Volatile JS Memory (Cleared on refresh/close) | `chrome.storage.session` by default (incl. vault cache); `chrome.storage.local` in Persistent mode |
| **Context** | Single Origin                                 | Universal Injection (Content Scripts)                                                              |

### MV3 Persistence Model

Due to the ephemeral nature of **Manifest V3 Service Workers**, the extension cannot rely on standard JavaScript variables to hold sensitive state (like the MK derived Vault Key), as the worker is frequently terminated by the browser to save resources.

This necessitates a shift from the "Memory-Only" model of the SPA to a **Storage-Backed** model:

1.  **Session Storage (Default)**: By default, the sensitive `VAULT_KEY` material and session tokens are stored in `chrome.storage.session`. This area is managed by the browser process and held in memory, clearing when the browser session ends or the auto lock timer expires.
2.  **Local Storage (Optional Persistence)**: If the user enables "Never Lock Out" (or "Persistent" mode), these keys are explicitly written to `chrome.storage.local`. This persists the cryptographic material to disk within the browser's profile, trading some security for the convenience of surviving browser restarts.
3.  **Encrypted Vault Cache**: The full vault database is cached in `chrome.storage.session` (encrypted with a per-session key for domain separation) to ensure instant access without network round-trips upon service worker wake-up. The per-session wrapping key (`VaultSessionKey`) is also kept in `chrome.storage.session` and is never persisted to disk. This means the cached vault remains accessible if internet connectivity drops during an active session, but requires a fresh network sync after a full browser restart. The extension is not designed to function as a fully persistent offline vault.

## 4. Summary of Residual Risks

While Vaulton strives to protect user data within the browser environment, certain threats are beyond the extension's control:

1.  **Compromised Host Machine**: If the user's device is infected with malware (keyloggers, screen scrapers, or memory dumpers), the extension cannot protect the Master Password or decrypted secrets. A compromised operating system is always a "Game Over" scenario.
2.  **Physical Access**: If an attacker gains physical access to an unlocked device while the extension is unlocked (or if "Never Lock Out" is enabled), they have full access to the vault. Vaulton relies on the user to secure their physical environment and use OS-level screen locks.
