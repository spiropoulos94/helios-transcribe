# Model Pricing Comparison

## Base Transcription Costs (Without Enhancements)

| Model / Method | 10 Minutes | 30 Minutes | 1 Hour | Best For... |
|----------------|------------|------------|---------|-------------|
| Gemini 2.5 Flash | $0.02 | $0.06 | $0.11 | High speed & lowest cost |
| Gemini 2.5 Pro | $0.04 | $0.13 | $0.26 | Good quality & low cost |
| **Gemini 3 Pro Preview** | **$0.07** | **$0.22** | **$0.44** | **⭐ RECOMMENDED** - Best Greek quality |
| **ElevenLabs Scribe v2** | **$0.10** | **$0.27** | **$0.54** | **Best Greek accuracy & speaker differentiation** (1,250 credits/30min @ $6.50/30k credits) |
| OpenAI Whisper + GPT-5 | $0.06 | $0.18 | $0.36 | High-accuracy transcription |
| GPT-4o (Audio API) | $0.29 | $0.87 | $1.75 | Understanding tone/emotion |
| GPT-4o (Realtime) | $1.50 | $4.50 | $9.00 | Live, human-like voice interaction |

---

## Enhanced Pipeline Costs (WITH Keyterm Extraction + Corrections)

The **recommended production setup** for Greek transcriptions includes:
- **Pre-processing**: AI-powered keyterm extraction (Gemini Flash)
- **Main transcription**: ElevenLabs Scribe v2 or Gemini
- **Post-processing**: Context-aware error correction (Gemini Flash)

### Total Cost Breakdown (ElevenLabs Scribe v2 + Enhancements)

| Duration | Base Scribe | + Keyterms | + Corrections | **TOTAL** |
|----------|-------------|------------|---------------|-----------|
| **10 min** | $0.10 | +$0.01 | +$0.01 | **$0.12** |
| **30 min** | $0.27 | +$0.02 | +$0.02 | **$0.31** |
| **1 hour** | $0.54 | +$0.04 | +$0.04 | **$0.62** |

### Per-Step Cost Analysis (1 hour audio, 3 chunks)

| Step | Model | Task | Cost |
|------|-------|------|------|
| 1. Keyterm Extraction | Gemini 2.5 Flash | Extract ~50 terms per chunk | ~$0.04 |
| 2. Transcription | ElevenLabs Scribe v2 | Main transcription with keyterms | $0.54 |
| 3. Error Correction | Gemini 2.5 Flash | Fix non-existent words, accents, proper nouns | ~$0.04 |
| **TOTAL** | - | **Full pipeline** | **~$0.62/hour** |

---

## What Each Enhancement Does

### 1. Keyterm Extraction (Pre-processing)
**Purpose**: Improve transcription accuracy for proper nouns and technical terms

**How it works**:
1. Gemini 2.5 Flash analyzes audio chunks
2. Extracts up to 100 important terms per chunk:
   - Proper nouns (names, places, organizations)
   - Technical terms and jargon
   - Acronyms (e.g., "ΔΕΥΑ", "ΠΕΔ")
   - Greek village/city names
3. Provides keyterms to transcription model for better recognition

**Cost**: ~$0.01 per 10min (~$0.0003 per chunk)

**When to use**:
- ✅ News broadcasts with names/places
- ✅ Government meetings (municipalities, organizations)
- ✅ Technical discussions with specialized vocabulary
- ✅ Interviews with proper nouns
- ❌ Skip for: General conversation without specific terminology

---

### 2. Post-Processing Correction
**Purpose**: Fix transcription errors using Greek language knowledge and context

**What it fixes**:
- ❌ "ήμο" → ✅ "Δήμο" (non-existent words)
- ❌ "Αρρωδιά" → ✅ "Ροδιά" (phonetic errors in place names)
- ❌ "νερο" → ✅ "νερό" (missing Greek accents - τόνοι)
- ❌ "Δημος" → ✅ "Δήμος" (missing diacritics)
- Context-aware corrections based on domain (government, sports, education, etc.)

**How it works**:
1. Gemini 2.5 Flash reads the transcription per chunk
2. Identifies context/domain (municipal, academic, sports, etc.)
3. Aggressively fixes non-existent Greek words
4. Adds missing accents (mandatory in Greek)
5. Corrects proper nouns using context

**Cost**: ~$0.01 per 10min (~$0.0003 per chunk)

**When to use**:
- ✅ **ALWAYS** for Greek transcriptions (accents are mandatory)
- ✅ When proper nouns must be spelled correctly
- ✅ When transcription quality is critical
- ❌ Skip for: Cost-sensitive bulk processing where minor errors are acceptable

---

## Recommended Configurations

### Maximum Quality (Government, Legal, News)
```
Model: ElevenLabs Scribe v2
Keyterms: ✅ Enabled
Corrections: ✅ Enabled
Cost: ~$0.62/hour
Quality: Highest - proper nouns, accents, context-aware
```

### Balanced (Business, Interviews)
```
Model: ElevenLabs Scribe v2
Keyterms: ✅ Enabled
Corrections: ✅ Enabled
Cost: ~$0.62/hour
Quality: High - good for most professional use cases
```

### Budget (General Content)
```
Model: Gemini 2.5 Flash
Keyterms: ❌ Disabled
Corrections: ✅ Enabled (still recommended for Greek accents)
Cost: ~$0.03/hour
Quality: Good - acceptable for casual use
```
