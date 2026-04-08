# Playable Create Video Library
A TypeScript library for interacting with Playable APIs to upload videos to the Playable platform and fetch the HTML snippet for embedding uploaded videos

## Prerequisites
Before using this library, ensure you have the following:
- Access to a Playable account with a valid email/password
- FFmpeg installed and accessible in your system PATH (used for reading video metadata)
  
## Installation
This library is not published on npm, so include it in your workflow directly

```
git clone https://github.com/maahaahmad/playable-createVideo.git
cd playable-createVideo
npm install
```

## Configuration
The library uses environment variables for credentials and API URLs.

Create an `.env` file in your project root:

```
PLAYABLE_BASE_URL=https://api-dev.playable.video/1
PLAYABLE_USER_EMAIL=your-email@example.com
PLAYABLE_USER_PASSWORD=your-password
```


## Usage
The library exposes a main client, `PlayableClient`, which handles video uploading and snippet retrieval

See [examples/addVideo.ts](src/examples/addVideo.ts) for a full usage example.

```
import fs from "fs"
import { getVideoMetadata } from "../utils/getVideoMetadata"
import { getContentType } from "../utils/getContentType"
import PlayableClient from "../PlayableClient"
import { config } from "../config"

async function addVideo() {
    try {

        const client = new PlayableClient(
            {
                email: config.playable.userEmail!,
                password: config.playable.userPassword!
            }
        )

        if (!config.playable.userEmail || !config.playable.userPassword) {
            throw new Error("PLAYABLE_USER_EMAIL and PLAYABLE_USER_PASSWORD must be set")
        }

        const filePath = "FILE-PATH" // Replace with your local video path

        const videoStats = fs.statSync(filePath)
        const metadata = await getVideoMetadata(filePath)
        const contentType = getContentType(filePath)

        const result = await client.addVideo({
            filePath: filePath,
            title: "VIDEO TITLE",
            width: metadata.width,
            height: metadata.height,
            duration: metadata.duration,
            filesize: videoStats.size,
            contentType: contentType
        })

        console.log("Video added successfully!")
        console.log(`Video ID: ${result.videoId}`)
        console.log(`Snippet: ${result.snippetHtml}`)
    } catch (error) {
        console.error("Error adding video: ", error)
    }
}

addVideo()
```

## API
`PlayableClient.addVideo(videoSource: VideoSource): Promise<AddVideoResult>`

Uploads a video and returns its playable HTML snippet

### Parameters (VideoSource):
| Property      | Type   | Description                                  |
| ------------- | ------ | -------------------------------------------- |
| `filePath`    | string | Path to the video file                       |
| `title`       | string | Video title                                  |
| `width`       | number | Video width in pixels                        |
| `height`      | number | Video height in pixels                       |
| `duration`    | number | Video duration in seconds                    |
| `filesize`    | number | Video file size in bytes                     |
| `contentType` | string | MIME type of the video (e.g., `"video/mp4"`) |

### Returns (AddVideoResult) : 
| Property      | Type   | Description                     |
| ------------- | ------ | ------------------------------- |
| `videoId`     | string | Unique ID of the uploaded video |
| `snippetHtml` | string | HTML snippet to embed the video |


## Internal Steps 

  1. **Step 0: Login**
      - Logs in to Playable using the provided email and password
      - Retrieves:
          - `cognitoAccessToken` – used for authentication in subsequent requests
          - `propertyId` – identifies the property (account) for the video
  2. **Step 1: Create Edit**
      - Sends metadata about the video to Playable to create an "edit"
      - Retrieves:
          - `edit_id` – unique ID for this edit
          - `url_upload` – temporary S3 URL for uploading the video file
  3. **Step 2: Create Video Record**
      - Creates a placeholder video record in Playable associated with the edit
      - Retrieves:
          - `video_id` – used to fetch the final snippet and track processing
  4. **Step 3: Associate Video with Edit**
      - Updates the edit to link it to the newly created `video_id`
      - Required so Playable knows which video corresponds to the uploaded file
  5. **Step 4: Upload Video File**
      - Uploads the actual video file to the S3 presigned URL returned in Step 1
  6. **Step 5: Poll Until Ready**
      - Periodically checks the status of the edit (uploading → compiling → transcoding → ready)
      - Stops polling when status is "ready" or throws an error after a timeout or if stuck in the same status
  7. **Step 6: Fetch Snippet**
      - Retrieves the HTML snippet for embedding the video using `video_id`

## Error Handling

The library exposes several custom errors to help with debugging:

| Error                  | Occurs At Step | Description                          |
| ---------------------- | -------------- | ------------------------------------ |
| `AuthenticationError`  | Step 0         | Login failed or invalid credentials. |
| `EditCreationError`    | Step 1         | Failed to create an edit.            |
| `VideoCreationError`   | Step 2         | Failed to create a video record.     |
| `UpdateEditError`      | Step 3         | Failed to associate video with edit. |
| `UploadVideoError`     | Step 4         | Failed to upload video to S3.        |
| `VideoProcessingError` | Step 5         | Video stuck in processing.           |
| `TimeoutError`         | Step 5         | Video processing exceeded timeout.   |
| `SnippetFetchError`    | Step 6         | Failed to fetch final snippet HTML.  |
