# 🎬 WeWatch

**WeWatch** is a real-time synchronized YouTube watching application that allows multiple users to watch videos together in perfect sync. Create a room, share the code, and enjoy movies, shows, or any YouTube content with friends and family from anywhere in the world.

![WeWatch Demo](https://via.placeholder.com/800x400/1a1a1a/ffffff?text=WeWatch+-%20Watch+Together)

## ✨ Features

- 🎥 **Synchronized Playback**: Watch YouTube videos in perfect sync with friends
- 🏠 **Room-based System**: Create or join rooms with unique codes
- ⚡ **Real-time Communication**: Instant synchronization using WebSockets
- 🎮 **Playback Controls**: Play, pause, seek, and restart videos for everyone
- 💬 **Chat System**: Communicate with other viewers (coming soon)
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🎯 **Smart URL Parsing**: Supports various YouTube URL formats
- 🔄 **Auto-sync**: Automatic correction for playback drift

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/wewatch.git
   cd wewatch
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create `.env` files in both apps:
   
   **`apps/server/.env`**
   ```env
   PORT=3001
   CORS_ORIGIN=http://localhost:3000
   ```
   
   **`apps/web/.env.local`**
   ```env
   NEXT_PUBLIC_SERVER_URL=http://localhost:3001
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start both the web app on `http://localhost:3000` and the server on `http://localhost:3001`.

## 🏗️ Architecture

WeWatch is built as a monorepo with two main applications:

```
wewatch/
├── apps/
│   ├── web/          # Next.js frontend application
│   └── server/       # Node.js backend with Socket.io
├── package.json      # Root package.json with workspace config
└── turbo.json        # Turbo configuration
```

### Frontend (`apps/web`)
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS with Radix UI components
- **Real-time**: Socket.io client for WebSocket connections
- **Video Player**: YouTube IFrame API integration
- **Type Safety**: Full TypeScript support

### Backend (`apps/server`)
- **Runtime**: Node.js with ES modules
- **Real-time**: Socket.io server for WebSocket communication
- **Storage**: In-memory room state management
- **CORS**: Configurable cross-origin support

## 📱 How to Use

1. **Create a Room**: Visit the homepage and create a new room
2. **Share Room Code**: Share the unique room code with friends
3. **Add YouTube Video**: Paste any YouTube URL or video ID
4. **Watch Together**: Enjoy synchronized playback with real-time controls

### Supported YouTube URL Formats
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- Direct video ID: `VIDEO_ID`

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start both web and server in development mode
npm run dev:web         # Start only the web application

# Building
npm run build           # Build both applications
npm run lint           # Lint all applications

# Individual app commands
npm run dev --filter=web    # Start only web app
npm run build --filter=web  # Build only web app
```

### Project Structure

```
apps/web/src/
├── app/
│   ├── page.tsx              # Homepage
│   ├── room/[code]/page.tsx  # Room page
│   └── layout.tsx            # Root layout
├── components/
│   ├── Player.tsx            # YouTube player component
│   └── ui/                   # Radix UI components
├── hooks/
│   └── useSocket.ts          # Socket.io React hook
└── lib/
    ├── youtube.ts            # YouTube URL parsing utilities
    └── utils.ts              # General utilities

apps/server/src/
└── index.js                  # Main server file with Socket.io setup
```

## 🔧 Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library with latest features
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Socket.io Client** - Real-time WebSocket communication

### Backend
- **Node.js** - JavaScript runtime
- **Socket.io** - Real-time bidirectional communication
- **ESM** - Modern JavaScript modules

### Development Tools
- **Turbo** - Monorepo build system
- **ESLint** - Code linting and formatting
- **TypeScript** - Static type checking

## 🚀 Deployment

### Server Deployment

1. **Environment Variables**:
   ```env
   PORT=3001
   CORS_ORIGIN=https://your-frontend-domain.com
   ```

2. **Build and Start**:
   ```bash
   cd apps/server
   npm start
   ```

### Web App Deployment

1. **Environment Variables**:
   ```env
   NEXT_PUBLIC_SERVER_URL=https://your-server-domain.com
   ```

2. **Build and Deploy**:
   ```bash
   npm run build --filter=web
   cd apps/web
   npm start
   ```

### Deployment Platforms
- **Frontend**: Vercel, Netlify, AWS Amplify
- **Backend**: Railway, Render, AWS EC2, DigitalOcean

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 API Reference

### Socket Events

#### Client → Server
- `join` - Join a room with username
- `control` - Send playback control commands (PLAY, PAUSE, SEEK, SET_VIDEO)
- `chat` - Send chat messages

#### Server → Client
- `SNAPSHOT` - Current room state
- `PLAY` - Video play event
- `PAUSE` - Video pause event  
- `SEEK` - Video seek event
- `SET_VIDEO` - Video change event
- `CHAT` - Chat message
- `PRESENCE` - User join/leave events

## 🐛 Troubleshooting

### Common Issues

**Connection Issues**:
- Ensure server is running on the correct port
- Check CORS configuration
- Verify environment variables

**Video Playback Issues**:
- YouTube video must be embeddable
- Check for ad blockers
- Ensure stable internet connection

**Sync Issues**:
- Refresh the page to rejoin the room
- Check if all users are in the same room code

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- YouTube IFrame API for video playback
- Socket.io for real-time communication
- Radix UI for accessible components
- Tailwind CSS for styling system

---

**Made with ❤️ for watching together**

For support, email support@wewatch.com or join our Discord community.
