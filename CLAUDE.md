# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier format all files
npm run format:check # Check formatting
npm run initialize   # Generate unique publicSalt in src/qapp-config.ts (run once for new deployments)
```

## Architecture Overview

Subwire is a decentralized publishing platform built on the Qortal blockchain. It uses the Qortal Data Network (QDN) for content storage and retrieval.

### Core Dependencies
- **qapp-core**: Qortal Q-App framework providing `GlobalProvider`, authentication (`useGlobal`, `useAuth`), publishing (`usePublish`), list management, and encryption utilities
- **jotai**: Atomic state management with persistence (`atomWithStorage`)
- **react-router-dom**: Routing with dynamic base URL support via `window._qdnBase`

### State Management (src/state/global/)
- `system.ts`: Theme state, notification permissions
- `profile.ts`: User profile, owned groups, subscription groups, encryption preferences
- `userNames.ts`: Multi-account name management

### QDN Integration (src/constants/qdn.ts, src/utils/articleQdn.ts)
Content types use QDN services:
- `SERVICE_DOCUMENT`: Articles, metadata, profiles
- `SERVICE_VIDEO`/`SERVICE_AUDIO`: Public media files
- `SERVICE_FILE`: Encrypted media files

Entity identifiers:
- `SUBWIRE_ARTICLE`/`SUBWIRE_EPISODE`: Public articles
- `GROUP_PRIVATE_ARTICLE`/`GROUP_PRIVATE_EPISODE`: Encrypted articles (require group membership)
- `QTUBE_VIDEO_BASE`: Public videos published to QTube

### Encryption Model
Articles can be encrypted for private groups:
- **Partial encryption** (default): title, subtitle, coverImage remain public for discovery; content/images/media encrypted
- **Full encryption**: Everything encrypted, empty title in metadata
- Media (video/audio) encryption uses AES-256-CTR with per-file key/IV stored in article metadata

### Page Structure
- `HomePage`: Feed of articles from followed authors
- `DiscoverPage`: Browse public articles
- `WritePage`/`EditArticlePage`: Markdown editor with image embedding and video/audio attachments
- `ArticlePage`: Reading view with decryption for private content
- `ProfilePage`: Author profile outside main layout

### i18n (src/i18n/)
Uses i18next with dynamic locale loading from `src/i18n/locales/{lang}/*.json`. Custom post-processors: `capitalizeAll`, `capitalizeFirstChar`, `capitalizeFirstWord`.

### Test Mode
Set `useTestIdentifiers = true` in `src/constants/qdn.ts` to use test prefixes (`MYTEST3_vid_`, `perennial-dev` app name) for development without affecting production data.