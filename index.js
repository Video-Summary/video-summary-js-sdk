const config = require('./config.json')
const fs = require('fs')
const axios = require('axios');
const baseUrl = "https://api.videosummary.io"

const getUrlType = (url) => {
  // if it's a file, a local path, or a url 
  if (url.includes('http')) return 'url'
  if (typeof File !== 'undefined' && source instanceof File) return 'file'
  return 'path'
}

class VideoSummarySDK {
  /**
   * Constructs an instance of the VideoSummarySDK.
   * @param {string} apiKey - The API key for authentication.
   * @param {string} [baseUrl] - The base URL of the VideoSummary API.
   */
  constructor(apiKey, _baseUrl = null) {
    this.apiKey = apiKey;
    this.baseUrl = _baseUrl || baseUrl;
  }

  /**
   * Transcribes the audio content of a video into text.
   * @param {string} url - The URL of the video or the path to a local file.
   * @param {string} [id] - An optional identifier for the transcription task.
   * @param {string} [callbackUrl] - A callback URL to notify upon completion of the transcription.
   * @returns {Promise<object>} - A promise resolving to an object containing the transcription and the file ID.
   */
  async transcribe(url, id = null, callbackUrl = null) {
    if (!url) return { error: 'url is required' }
    const fileType = getUrlType(url)
    const endpoint = `${this.baseUrl}/v1/transcribe`;
    let res = null
    if (fileType === 'url') {
      res = await this._postRequest(endpoint, { url, id, callback: callbackUrl }, 'transc');
    } else if (fileType === 'file') {
      return { error: 'unimplemented file' }
    } else if (fileType === 'path') {
      const uploaded_url = await this._handle_local_file(url)
      if (uploaded_url?.error) return uploaded_url
      res = await this._postRequest(endpoint, { external_url: false, url: uploaded_url, id, callback: callbackUrl });
    }
    if (res?.file?.transcript) {
      const json = await fetch(res?.file?.transcript)
      const transcript = await json.json()
      return { transcript, fileId: res.file.id }
    }
    return { error: 'Unknown error, transcription failed' }
  }

  /**
   * Extracts chapter information from a video.
   * @param {string} url - The URL of the video or the path to a local file.
   * @param {string} [id] - An optional identifier for the chapter extraction task.
   * @param {string} [callbackUrl] - A callback URL to notify upon completion.
   * @returns {Promise<object>} - A promise resolving to an object containing the chapters, transcript, and file ID.
   */
  async chapter(url, id = null, callbackUrl = null) {
    if (!url) return { error: 'url is required' }
    const fileType = getUrlType(url)
    const endpoint = `${this.baseUrl}/v1/summary`;
    let res = null
    if (fileType === 'url') {
      res = await this._postRequest(endpoint, {
        url,
        external_url: false,
        chapter: true,
        summarize: false,
        id,
        callback: callbackUrl
      });
    } else if (fileType === 'file') {
      return { error: 'unimplemented file' }
    } else if (fileType === 'path') {
      const uploaded_url = await this._handle_local_file(url)
      if (uploaded_url?.error) return uploaded_url
      res = await this._postRequest(endpoint, {
        external_url: false,
        url: uploaded_url,
        id,
        chapter: true,
        summarize: false,
        callback: callbackUrl
      });
    }
    let transcript = null
    if (res?.file?.transcript) {
      const json = await fetch(res?.file?.transcript)
      transcript = await json.json()
    }
    let chapters = null
    if (res?.file?.chaptering) {
      chapters = res?.file?.chaptering
    }
    return { transcript, chapters, fileId: res.file.id }
  }

  /**
   * Performs both summarization and chapter extraction on a video.
   * @param {string} url - The URL of the video or the path to a local file.
   * @param {string} [id] - An optional identifier for the task.
   * @param {string} [callbackUrl] - A callback URL for completion notification.
   * @returns {Promise<object>} - A promise resolving to an object containing the chapters, summary, transcript, and file ID.
   */
  async summarizeAndChapter(url, id = null, callbackUrl = null) {
    if (!url) return { error: 'url is required' }
    const fileType = getUrlType(url)
    const endpoint = `${this.baseUrl}/v1/summary`;
    let res = null
    if (fileType === 'url') {
      res = await this._postRequest(endpoint, {
        url,
        chapter: true,
        summarize: true,
        id,
        callback: callbackUrl
      });
    } else if (fileType === 'file') {
      return { error: 'unimplemented file' }
    } else if (fileType === 'path') {
      const uploaded_url = await this._handle_local_file(url)
      if (uploaded_url?.error) return uploaded_url
      res = await this._postRequest(endpoint, {
        external_url: false,
        url: uploaded_url,
        id,
        chapter: true,
        summarize: true,
        callback: callbackUrl
      });
    }
    let transcript = null
    if (res?.file?.transcript) {
      const json = await fetch(res?.file?.transcript)
      transcript = await json.json()
    }
    let chapters = null
    if (res?.file?.chaptering) {
      chapters = res?.file?.chaptering
    }
    return { transcript, chapters, summary: res?.file?.final_summary, fileId: res.file.id }
  }

  /**
   * Get a list of files uploaded by the user.
   * @param {integer} [limit] - The URL of the video or the path to a local file.
   * @param {integer} [offset] - An optional identifier for the summarization task.
   * @returns {Promise<object>} - A promise resolving to an object with the total count and the list of files
   */
  async getFiles(limit = 10, offset = 0) {
    const endpoint = `${this.baseUrl}/v1/auto/files?limit=${limit}&offset=${offset}`;
    const res = await this._postRequest(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
    });
    return { totalCount: res.total_count, files: res.files }
  }

  /**
   * Get a file by its ID.
   * @param {string} fileId - The ID of the file.
   * @returns {Promise<object>} - A promise resolving to an object with the file details.
   * @example
   * const file = await sdk.getFile('file UUID');
   * console.log(file);
   * // {
   * //   id: 'fileId',
   * //   url: 'https://api.videosummary.io/v1/auto/file/fileId',
   * //   complete: true,
   * //   failed: false,
   * //   failed_reason: null,
   * //   callback: null,
   * //   chaptering: null,
   * //   final_summary: 'This is a summary of the video content.',
   * //   transcript: 'https://api.videosummary.io/v1/auto/file/fileId/transcript',
   * //   video: 'https://api.videosummary.io/v1/auto/file/fileId/video'
   * // }
   **/

  async getFile(fileId) {
    const endpoint = `${this.baseUrl}/v1/auto/file/${fileId}`;
    const res = await this._postRequest(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
    });
    return res?.file
  }



  /**
   * Generates a summary of a video's content.
   * @param {string} url - The URL of the video or the path to a local file.
   * @param {string} [id] - An optional identifier for the summarization task.
   * @param {string} [callbackUrl] - A callback URL to notify upon completion.
   * @returns {Promise<object>} - A promise resolving to an object with the summary, transcript, and file ID.
   */
  async summarize(url, id = null, callbackUrl = null) {
    if (!url) return { error: 'url is required' }
    const fileType = getUrlType(url)
    const endpoint = `${this.baseUrl}/v1/summary`;
    let res = null
    if (fileType === 'url') {
      res = await this._postRequest(endpoint, {
        url,
        chapter: false,
        summarize: true,
        id,
        callback: callbackUrl
      });
    } else if (fileType === 'file') {
      return { error: 'unimplemented file' }
    } else if (fileType === 'path') {
      const uploaded_url = await this._handle_local_file(url)
      if (uploaded_url?.error) return uploaded_url
      res = await this._postRequest(endpoint, {
        external_url: false,
        url: uploaded_url,
        id,
        chapter: false,
        summarize: true,
        callback: callbackUrl
      });
    }
    let transcript = null
    if (res?.file?.transcript) {
      const json = await fetch(res?.file?.transcript)
      transcript = await json.json()
    }
    return { transcript, summary: res?.file?.final_summary, fileId: res.file.id }
  }

  async _postRequest(endpoint, data) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseData = await response.json();
    if (responseData?.file?.callback) {
      return responseData; // Asynchronous request, return initial response
    } else {
      return this._pollForResult(responseData.file.id); // Synchronous request, poll for result
    }
  }


  async _pollForResult(fileId) {
    const pollEndpoint = `${this.baseUrl}/v1/auto/file/${fileId}?id=${fileId}`;
    let result;
    do {
      const pollResponse = await fetch(pollEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
      });
      if (!pollResponse.ok) {
        throw new Error(`HTTP error! Status: ${pollResponse.status}`);
      }
      result = await pollResponse.json();
      if (result.error) {
        return result;
      }
      if (result?.file?.failed_reason) {
        return { error: result.file.error };
      }
      if (!result?.file?.complete) {
        // Assuming the API returns a 'file' property when done. Adjust as per actual API response.
        await new Promise(resolve => setTimeout(resolve, 3000)); // Poll every 3 seconds
      }
    } while (!result.file?.complete && !result?.file?.failed);

    return result;
  }

  async _handle_local_file(path) {
    if (!fs.existsSync(path)) return { error: 'file does not exist' }
    // load the file 
    let mime = path.split('.').pop()
    // remove any ? query params
    // console.log('mime', mime);
    const endpoint = `${this.baseUrl}/v1/auto/upload/${mime}`;
    const response = await axios.get(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
    });
    if (response?.data?.error) {
      // if error includes Authorization error, it's probably an invalid api key
      if (response.data.error.includes('Authorization')) {
        return { error: 'invalid api key. head over to https://app.videosummary.io/dashboard and double check!' }
      }
      return { error: response.data.error }
    }
    if (!response?.data?.upload?.upload) {
      return { error: 'upload failed' }
    }
    const uploadURL = response.data.upload.upload;

    // upload the file to the url. it's a signed s3 url 
    const f = fs.createReadStream(path)
    const uploadResponse = await axios.put(uploadURL, f, {
      headers: {
        'Content-Type': mime
      }
    });
    if (uploadResponse.status !== 200) {
      return { error: 'upload failed' }
    }
    return response.data.upload.url
  }
}

module.exports = VideoSummarySDK;