const config = require('./config.json')
const fs = require('fs')
const axios = require('axios');
const baseUrl = config.baseUrl

const getUrlType = (url) => {
  // if it's a file, a local path, or a url 
  if (url.includes('http')) return 'url'
  if (typeof File !== 'undefined' && source instanceof File) return 'file'
  return 'path'
}

class VideoSummarySDK {
  constructor(apiKey, _baseUrl = null) {
    this.apiKey = apiKey;
    this.baseUrl = _baseUrl || baseUrl;
  }

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
  }

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