# Video Summary SDK

Elevate your video processing capabilities with the `Video Summary SDK`. This Node.js SDK provides a seamless way to transcribe, summarize, and extract chapter information from videos. Whether it's a local file or a hosted URL, `Video Summary SDK` handles it all with ease.

## Key Features

- **Transcription**: Convert speech in your videos into accurate text.
- **Summarization**: Get concise summaries of video content.
- **Chapter Extraction**: Identify and extract distinct chapters from videos.
- **Support for Various Sources**: Works with local files, URLs, and S3 buckets.

## Installation

Install the package with npm:

```bash
npm install video-summary
```

## Getting Started 


- Grab your api key for free at [https://videosummary.io](https://videosummary.io?utm_source=github) then follow the instructions below.

```js
const VideoSummarySDK = require('video-summary')
const VideoSummary = new VideoSummarySDK('your api key')

setTimeout(async () => {
  try {
    // local file works, s3 url works, signed s3 url works
    const path = './your/local/file.mp4'
    const res = await VideoSummary.summarize(path)
    console.log("video summary res:", res)
  } catch (e) {
    console.error('video summary sdk e', e)
  }
})
```

## API Methods

The SDK offers several methods to interact with your videos:

#### Note 
The id and callbackUrl are optional. the id field can be used for your own reference if you have as asset id already. the callbackUrl is used to send a webhook when the video is processed and sends the id back to you.

If you don't provide a callback url, the call will be synchronous and wait for the processing to complete.

### `summarize(url, [id], [callbackUrl])`
Summarizes the video content. Provide the URL of the video, and optionally, an ID and a callback URL for asynchronous processing. 

### `transcribe(url, [id], [callbackUrl])`
Transcribes the audio content of the video into text. Pass the video URL, and if needed, an ID and a callback URL.

### `chapter(url, [id], [callbackUrl])`
Extracts chapters from the video for easy navigation and understanding. Requires the video URL, with optional ID and callback URL.

### `summarizeAndChapter(url, [id], [callbackUrl])`
Performs both summarization and chapter extraction on the video. Input the video URL, and optionally, an ID and a callback URL.

Each method returns a promise that resolves to an object with relevant data about the video processing, including transcripts, summaries, chapters, and file IDs.


## output
```json 
{
  "transcript": {
    "speakers": [
      {
      "speaker": "SPEAKER_00",
      "text": " video",
      "timestamp": [10,10.26],
      "start": 10,
      "end": 10.26
    },
    {
      "speaker": "SPEAKER_00",
      "text": " products.",
      "timestamp": [10.26,10.9],
      "start": 10.26,
      "end": 10.9
    }
    ],
    "chunks": [
      { "text": " video", "timestamp": [Array] },
      { "text": " products", "timestamp": [Array] },
    ],
    "text": "..."
  },
  "chapters": [
    {
      "start": 0,
      "end": 10.9,
      "title": "Introduction to VideoSummary.io",
      "text": "Introducing videosummary.io. a simple api to transcribe, chapter and summarize audio and video files."
    }
  ],
  "summary": "Developers, check this out. You need VideoSummary.io in your life. It lets you build video products much easier with features like video summarization and video chaptering. Grab it now and start building game-changing video products.",
  "fileId": "xxx-xxx-4ffc-a2a5-13d3cee085dd"
}
```