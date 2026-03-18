# Video Wall Optimizer

Premium web app for slicing ultra-wide MP4 videos into ready-to-deploy `1920x1080` outputs for video wall displays.

## Folder Structure

```text
VideoWall/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── index.js
│   ├── tmp/
│   │   ├── outputs/
│   │   └── uploads/
│   └── package.json
├── package.json
└── README.md
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Install FFmpeg and FFprobe:

macOS with Homebrew:

```bash
brew install ffmpeg
```

Ubuntu/Debian:

```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

Windows:

- Install FFmpeg from the official build packages.
- Add `ffmpeg` and `ffprobe` to your system `PATH`.

3. Start the app:

```bash
npm run dev
```

4. Open:

```text
http://localhost:5173
```

## Environment

Optional server variables:

```bash
PORT=4000
MAX_FILE_SIZE_MB=2048
CLIENT_ORIGIN=http://localhost:5173
```

Optional client variable:

```bash
VITE_API_URL=http://localhost:4000
```

## Production

```bash
npm run build
npm start
```

If `client/dist` exists, the Express server serves the built frontend.
