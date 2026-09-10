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
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.timeout = 60000; // 60s timeout for image processing pipelines

    // Attach headers (Accept, Authorization, etc.)
    // CRITICAL: NEVER set Content-Type so React Native generates the correct multipart boundary
    if (customHeaders) {
      Object.entries(customHeaders).forEach(([key, val]) => {
        if (key.toLowerCase() !== 'content-type') {
          xhr.setRequestHeader(key, val);
        }
      });
    }

    xhr.onload = () => {
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
        resolve(responseObj);
      } else {
        const errorDetail = parsed?.detail || responseText || `HTTP ${xhr.status}`;
        reject(new Error(`Server returned HTTP ${xhr.status}: ${errorDetail}`));
      }
    };

    xhr.onerror = (e) => {
      console.error('[networkUpload] XHR error event:', e);
      reject(new Error(`Network error connecting to ${url}. Please check that laptop backend is running on ${url}`));
    };

    xhr.ontimeout = () => {
      reject(new Error(`Network timeout (60s) connecting to ${url}`));
    };

    try {
      xhr.send(formData);
    } catch (sendErr) {
      console.error('[networkUpload] XHR send exception:', sendErr);
      reject(sendErr);
    }
  });
}

export default rnMultipartUpload;
