# Peer-to-Peer Password Manager

A secure, decentralized password manager built with [Pear](https://docs.pears.com/). Share passwords securely(?) with peers who have the same mnemonic words and password combination.

## Features

- Fully decentralized password storage
- BIP39 mnemonic words generation and recovery
- Local-only credential storage
- Peer-to-peer synchronization
- Deterministic topic generation for secure peer discovery

## Prerequisites

- Node.js v22.16.0 or higher
- Pear v1.17.0

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Running the Application

```bash
npm run build
npm start
```

Or in dev mode with hot reloading:

```bash
npm run dev
```

## How It Works

### Initial Setup

When you first open the application, you have two options:

1. **Create a New Account**
   - The app generates new 12 BIP39 mnemonic words
   - Store these words in a secure location - they are required for account recovery and accessing your passwords on other devices
   - Set a password that will be used for daily access
   - Seed is derived from the mnemonic using BIP39 and stored locally on your computer
   - A final seed is derived from the combination of mnemonic seed and password

2. **Recover Existing Account**
   - Enter your previously saved mnemonic words
   - Enter your password
   - The app will reconnect to other peers and pull the passwords

### Daily Usage

- After initial setup, you'll only need your password to access the app
- Your mnemonic seed is stored securely on your local machine
- This deterministic seed is used to generate a topic that peers use to find each other
- Only peers with the same mnemonic words and password combination can generate a topic and join it to fetch passwords

### Security Model

- The mnemonic words and password combination ensures that only authorized peers can access the shared passwords
- All data is stored locally and synchronized peer-to-peer
- No central servers are involved in storing or managing passwords
- The deterministic topic generation ensures that peers can find each other without exchanging any information out of bound first via other means

## Technical Stack

- React v19.1.0
- Vite v7.0.4
- Pear ecosystem (hyperswarm, hyperbee, corestore, hyperstore)

## Known Limitations

Did not address those due to lack of time.

### User Experience
- No visual feedback for asynchronous operations (creating, fetching, updating passwords)
- Missing confirmation dialogs for destructive actions like password deletion
- No built-in functionality to export mnemonic words for backup (you need to copy them by hand)
- Password and entry fields lack input validation

### Development
- JavaScript-only codebase without TypeScript or PropTypes for type safety (Pear js libraries don't have type support anyway)
- Test suite not implemented
- Missing comprehensive error handling system

### Critical User Flows
- Recovery process is irreversible - entering incorrect mnemonic words requires application local storage cleanup manually
- Passwords are currently stored in plaintext. They should be encrypted using symmetric encryption with a key derived from the master password, other pear will be able to decrypt it since they have the password