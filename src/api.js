const RESPONSE_SNIPPET_LIMIT = 160;

function safeSnippet(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, RESPONSE_SNIPPET_LIMIT);
}

function httpMessage(response, data, text) {
  if (data && typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }

  const snippet = safeSnippet(text);
  if (snippet) {
    return `Server returned HTTP ${response.status}: ${snippet}`;
  }

  return `Server returned HTTP ${response.status}.`;
}

export async function requestJson(url, options = {}) {
  if (!url) {
    return {
      success: false,
      message: "Request URL is not configured."
    };
  }

  let response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    if (error?.name === "AbortError") {
      return {
        success: false,
        aborted: true,
        message: "Request was cancelled."
      };
    }

    return {
      success: false,
      message: "Could not connect.",
      networkError: true
    };
  }

  let text;
  try {
    text = await response.text();
  } catch (error) {
    if (error?.name === "AbortError") {
      return {
        success: false,
        aborted: true,
        message: "Request was cancelled."
      };
    }

    return {
      success: false,
      message: "Server response could not be read.",
      httpStatus: response.status
    };
  }
  const hasBody = text.trim().length > 0;
  let data = {};

  if (hasBody) {
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        message: response.ok
          ? "Server returned an unreadable response."
          : httpMessage(response, null, text),
        httpStatus: response.status
      };
    }

    if (data === null || (typeof data !== "object" && !Array.isArray(data))) {
      return {
        success: false,
        message: "Server returned an unexpected response.",
        httpStatus: response.status
      };
    }
  }

  if (!response.ok) {
    return {
      ...(data && typeof data === "object" ? data : {}),
      success: false,
      message: httpMessage(response, data, text),
      httpStatus: response.status
    };
  }

  return data;
}
