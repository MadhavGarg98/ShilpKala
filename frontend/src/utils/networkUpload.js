/**
 * Real React Native multipart/form-data upload using React Native's built-in
 * network stack (XMLHttpRequest).
 *
 * NOTE: Do NOT use expo/fetch or window.fetch for FormData uploads containing
 * React Native { uri, name, type } file parts — Expo's WinterCG fetch implementation
 * rejects them with `TypeError: Unsupported FormDataPart implementation`.
 *
 * React Native's native XMLHttpRequest layer natively handles { uri, name, type }
 * file parts and streams them directly from device storage (file:// or content://).
 */
export function rnMultipartUpload(url, formData, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    console.log(`[networkUpload] Initiating POST request to: ${url}`);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.timeout = 45000; // 45s timeout for AI image enhancement / rembg operations

    // Attach headers (Accept, Authorization, etc.)
    // CRITICAL: NEVER set Content-Type so React Native generates the correct multipart boundary
    if (customHeaders) {
      Object.entries(customHeaders).forEach(([key, val]) => {
        if (key.toLowerCase() !== 'content-type') {
          xhr.setRequestHeader(key, val);
        }
      });
    }

    if (xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          console.log(`[networkUpload] Upload progress: ${progress}% (${event.loaded}/${event.total} bytes)`);
        }
      };
    }

    xhr.onload = () => {
      console.log(`[networkUpload] Response received from ${url} with status: ${xhr.status}`);
      const responseText = xhr.responseText || '';
      let parsed = null;
      try {
        parsed = JSON.parse(responseText);
      } catch (e) {
        parsed = null;
      }

      const responseObj = {
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        statusText: xhr.statusText || '',
        text: async () => responseText,
        json: async () => parsed || JSON.parse(responseText),
      };

      if (responseObj.ok) {
        console.log(`[networkUpload] Upload and enhancement successful!`);
        resolve(responseObj);
      } else {
        const errorDetail = parsed?.detail || responseText || `HTTP ${xhr.status}`;
        console.error(`[networkUpload] Backend error ${xhr.status}: ${errorDetail}`);
        reject(new Error(`Server error (${xhr.status}): ${errorDetail}`));
      }
    };

    xhr.onerror = (e) => {
      console.error('[networkUpload] XHR network error:', e);
      reject(new Error(`Cannot connect to backend (${url}). Please check server connectivity or Wi-Fi IP address.`));
    };

    xhr.ontimeout = () => {
      console.error(`[networkUpload] Request timed out after 45s connecting to ${url}`);
      reject(new Error(`Backend processing timeout (45s) at ${url}. Please retry.`));
    };

    try {
      console.log(`[networkUpload] Sending FormData payload...`);
      xhr.send(formData);
    } catch (sendErr) {
      console.error('[networkUpload] XHR send exception:', sendErr);
      reject(sendErr);
    }
  });
}

export default rnMultipartUpload;
