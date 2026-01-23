# GrechoAI

AI-powered Greek transcription app built with Next.js 16, TypeScript, and Google Gemini 2.5 Flash. Upload audio/video files and get accurate Greek transcriptions with speaker identification.

## Features

- 🎙️ **Audio & Video Transcription** - Support for MP3, WAV, MP4, and MOV files
- 🇬🇷 **Greek Language Support** - Optimized for Greek transcription with high accuracy
- 👥 **Speaker Identification** - Automatically identifies and labels different speakers
- 📚 **Transcription Library** - View, manage, and organize all your transcriptions
- 💾 **Local Storage** - All transcriptions saved locally in your browser
- 📱 **Responsive Design** - Beautiful UI that works on desktop, tablet, and mobile
- ⚡ **Fast & Efficient** - Powered by Google Gemini 2.5 Flash for quick results
- 🚀 **Parallel Processing** - Process long audio files faster with concurrent chunk processing

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **AI Provider**: Google Gemini 2.5 Flash (with OpenAI Whisper fallback)
- **Icons**: Lucide React
- **Storage**: Browser localStorage

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- A Google Gemini API key (get one at [ai.google.dev](https://ai.google.dev))

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd grechoai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.local.example` to `.env.local` (or create a new `.env.local` file)
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Transcribe a File

1. Navigate to the home page
2. Click "Upload File" or drag and drop your audio/video file
3. Wait for the AI to process your file
4. View and manage your transcription

### Manage Your Library

1. Click "Library" in the navigation menu
2. View all your saved transcriptions in a grid layout
3. Click any transcription card to view full details
4. Use the action buttons to copy, download, or delete transcriptions

## Project Structure

```
grechoai/
├── app/
│   ├── api/
│   │   └── transcribe/      # Transcription API endpoint
│   ├── library/
│   │   ├── [id]/            # Individual transcription detail page
│   │   └── page.tsx         # Library grid view
│   ├── layout.tsx           # Root layout with Header/Footer
│   └── page.tsx             # Home page (transcribe)
├── components/
│   ├── Header.tsx           # Navigation header
│   ├── Footer.tsx           # Footer component
│   ├── InputSection.tsx     # File upload interface
│   ├── TranscriptView.tsx   # Transcription result display
│   ├── TranscriptionCard.tsx # Library card component
│   └── TranscriptionHistory.tsx
├── lib/
│   ├── ai/                  # AI provider abstraction
│   │   ├── factory.ts
│   │   ├── gemini.ts
│   │   └── openai.ts
│   └── storage.ts           # localStorage management
└── types.ts                 # TypeScript type definitions
```

## Configuration

### AI Providers

The app supports multiple AI providers with automatic fallback:

1. **Google Gemini** (Primary) - Requires `GEMINI_API_KEY`
2. **OpenAI Whisper** (Fallback) - Requires `OPENAI_API_KEY`

Add your API keys to `.env.local`:

```env
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key  # Optional fallback
```

### Default Transcription Settings

Located in [app/api/transcribe/route.ts](app/api/transcribe/route.ts):

- **Target Language**: Greek (`el`)
- **Speaker Diarization**: Enabled
- **Timestamps**: Enabled

### Audio Processing for Long Files

For audio files longer than 10 minutes, the app can automatically use intelligent chunking when enabled:

- **Smart Chunk Sizing**: Automatically calculates optimal chunk size (5-30 minutes) based on file duration
- **Overlap**: 10 seconds between chunks for better accuracy
- **Parallel Processing**: Up to 3 chunks processed concurrently

You can configure chunking in `.env.local`:

```env
# Enable automatic chunking for long files (default: true)
ENABLE_CHUNKING=true

# Max concurrent chunks (default: 3)
# 0 or 1 = sequential (slowest, safest)
# 2-5 = limited parallel (balanced)
# 6-10 = aggressive parallel (faster, riskier)
# -1 = UNLIMITED (MAXIMUM SPEED - process all chunks at once!)
MAX_CONCURRENT_CHUNKS=3
```

**How Smart Chunk Sizing Works:**

The app automatically determines the best chunk size based on your file duration:

| File Duration | Chunk Size |
|--------------|------------|
| < 15 minutes | 5 minutes |
| 15-60 minutes | 10 minutes |
| 1-2 hours | 15 minutes |
| 2-3 hours | 20 minutes |
| 3+ hours | 30 minutes |

**Performance Modes:**

| Mode | Setting | Speed | API Usage | Best For |
|------|---------|-------|-----------|----------|
| Sequential | `0` or `1` | Slowest | Minimal | Strict rate limits |
| Balanced | `3` (default) | 3x faster | Moderate | Most use cases |
| Aggressive | `6-10` | 6-10x faster | High | Generous rate limits |
| **MAXIMUM** | `-1` | **FASTEST** | **Very High** | **No rate limits** |

**Example:** A 90-minute audio file = 9 chunks of 10 minutes each
- Sequential (`1`): ~90 minutes total
- Balanced (`3`): ~30 minutes total (3x speedup)
- **Maximum (`-1`)**: ~10 minutes total (9x speedup - all chunks processed simultaneously)

**Benefits of parallel processing:**
- ⚡ **Dramatically faster transcription** - Up to N× speedup where N = number of chunks
- 🎯 **Configurable concurrency** - Control based on your API rate limits
- 🧠 **Smart chunk sizing** - Automatically adapts to file length
- 🔄 **Automatic deduplication** - Overlapping regions are intelligently merged
- 🛡️ **Error resilience** - Failed chunks don't break the entire transcription

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add your environment variables in the Vercel dashboard
4. Deploy!

### Other Platforms

This is a standard Next.js app and can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS Amplify
- Google Cloud Run

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[Your chosen license]

## Author

Made with ❤️ by [Nikos Spiropoulos](https://www.linkedin.com/in/nikos-spiropoulos-813167181/)

## Acknowledgments

- Powered by Google Gemini 2.5 Flash
- Built with Next.js and Tailwind CSS
