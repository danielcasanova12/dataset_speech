# API Endpoints for Recordings

This document provides a detailed description of the API endpoints available for managing audio recordings. All endpoints are prefixed with `/api/v1`.

**Authentication**: All endpoints listed here require authentication via a JWT Bearer token provided in the `Authorization` header.

---

## 1. Create a New Recording

Creates a new audio recording entry, saves the associated audio file locally, and uploads it to configured cloud storage services (Google Drive, AWS S3).

- **URL**: `/recordings`
- **Method**: `POST`
- **Request Type**: `multipart/form-data`

### Form Fields:

| Field               | Type         | Required | Default | Description                                            |
| ------------------- | ------------ | -------- | ------- | ------------------------------------------------------ |
| `audio_file`        | `file`       | Yes      | -       | The audio file to be uploaded.                         |
| `session_id`        | `integer`    | Yes      | -       | The ID of the session this recording belongs to.       |
| `dataset_id`        | `integer`    | Yes      | -       | The ID of the dataset this recording belongs to.       |
| `bloco_id`          | `integer`    | Yes      | -       | The ID of the `bloco` (block) this recording is for.   |
| `frase_id`          | `integer`    | No       | `null`  | The ID of the `frase` (phrase) being recorded.         |
| `duration`          | `float`      | Yes      | -       | The duration of the audio in seconds.                  |
| `format`            | `string`     | Yes      | -       | The audio format (e.g., "wav", "webm").                |
| `sample_rate`       | `integer`    | Yes      | -       | The sample rate of the audio in Hz (e.g., 44100).      |
| `frase_content`     | `string`     | No       | `null`  | The transcribed text of the recording, if available.   |
| `room_tone_start`   | `float`      | No       | `null`  | Timestamp for the start of the room tone.              |
| `room_tone_end`     | `float`      | No       | `null`  | Timestamp for the end of the room tone.                |
| `is_test`           | `boolean`    | No       | `False` | Flags if the recording is a test recording.            |

### Success Response:

- **Code**: `201 Created`
- **Content**: A JSON object representing the newly created recording, matching the `RecordingRead` schema.

**Example Response Body:**
```json
{
  "id_recordings": 1,
  "session_id": 10,
  "dataset_id": 1,
  "bloco_id": 5,
  "frase_id": 101,
  "path_local": "uploads/2026/02/08/10_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.webm",
  "audio_url_drive": "https://drive.google.com/file/d/...",
  "audio_url_s3": "https://your-bucket.s3.amazonaws.com/...",
  "is_test": false,
  "duration": 5.12,
  "format": "webm",
  "sample_rate": 48000,
  "frase_content": "Esta é uma frase de exemplo.",
  "room_tone_start": 0.5,
  "room_tone_end": 1.0,
  "created_at": "2026-02-08T12:00:00.000Z"
}
```

### Error Responses:

- **Code**: `404 Not Found`
  - **Reason**: The specified `session_id` or `bloco_id` does not exist, or the session does not belong to the authenticated user.
- **Code**: `400 Bad Request`
  - **Reason**: An attempt was made to add a recording to a session that is already marked as finished.

---

## 2. Get a Specific Recording

Retrieves the metadata for a single audio recording by its ID. The user must be the owner of the recording.

- **URL**: `/recordings/{recording_id}`
- **Method**: `GET`

### Path Parameters:

| Parameter       | Type      | Description                               |
| --------------- | --------- | ----------------------------------------- |
| `recording_id`  | `integer` | The unique identifier for the recording. |

### Success Response:

- **Code**: `200 OK`
- **Content**: A JSON object with the recording's details, matching the `RecordingRead` schema (same as the create response).

### Error Response:

- **Code**: `404 Not Found`
  - **Reason**: The recording with the specified ID does not exist or does not belong to the authenticated user.

---

## 3. Delete All Recordings for a User

Deletes all recordings associated with the currently authenticated user. This action removes the records from the database and deletes the audio files from the local server filesystem.

**Warning**: This action is irreversible.

- **URL**: `/recordings/delete_my_recordings`
- **Method**: `DELETE`

### Success Response:

- **Code**: `204 No Content`
- **Content**: No content is returned in the response body.

### Notes:

- **Remote Storage**: This endpoint currently **only deletes local files and database records**. The corresponding files in Google Drive and AWS S3 are **not** deleted. This functionality is marked as a TODO for future implementation.
