# Changelog

## Version 1.1.0 - Enhanced Edition

### 1. Better Website Recognition

- Added domain-to-friendly-name mapping for 30+ popular websites
- Added logic to automatically derive friendly names from domain parts
- Implemented title cleaning to remove common suffixes like "- YouTube"
- Created context-aware activity messages (e.g., "Watching videos on YouTube" instead of just "Browsing YouTube")

### 2. Favicon Handling Improvements

- Now attempts to get favicons directly from websites via content script
- Added multiple icon selector strategies to find the best favicon
- Implemented favicon caching to reduce repeated requests
- Still provides Google's favicon service as a reliable fallback

### 3. Improved Rich Presence Visuals

- Added mapping between domains and Discord asset names
- Implemented small image showing Chrome logo for better context
- Created dynamic templates for status messages
- Enhanced status formatting for better readability

### 4. Bridge-Extension Communication Enhancements

- Added reconnection logic with exponential backoff
- Implemented persistent connection handling
- Added error recovery for Discord connection drops
- Improved message passing protocol

### 5. Enhanced Settings UI

- Complete UI redesign with tabbed interface
- Added dark mode toggle
- Implemented domain blacklist management
- Created custom template editor for power users
- Added browsing statistics dashboard

### 6. Advanced Features

- Added idle detection via Chrome idle API and activity monitoring
- Implemented browsing time tracking per domain
- Added session statistics
- Created multi-browser support (Chrome, Edge, Brave)
- Added error handling and graceful fallbacks

## Version 1.0.0 - Initial Release

- Basic Chrome extension with Discord Rich Presence integration
- Shows current website domain and page title
- Displays time spent on website
- Simple on/off toggle
- Native messaging bridge to Discord 