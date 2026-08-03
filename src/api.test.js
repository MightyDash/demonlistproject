import { afterEach, describe, expect, it, vi } from "vitest";
import { requestJson } from "./api.js";

function mockResponse({ status = 200, body = "", ok = status >= 200 && status < 300, textError = null } = {}) {
  return {
    ok,
    status,
    text: vi.fn(async () => {
      if (textError) throw textError;
      return body;
    })
  };
}

describe("requestJson", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a valid JSON object for a successful response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse({ body: JSON.stringify({ name: "Bloodbath" }) })));

    await expect(requestJson("/api")).resolves.toEqual({ name: "Bloodbath" });
  });

  it("keeps success true payloads unchanged", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse({ body: JSON.stringify({ success: true, value: 1 }) })));

    await expect(requestJson("/api")).resolves.toEqual({ success: true, value: 1 });
  });

  it("keeps success false payloads unchanged on HTTP 200", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse({ body: JSON.stringify({ success: false, message: "Nope" }) })));

    await expect(requestJson("/api")).resolves.toEqual({ success: false, message: "Nope" });
  });

  it("returns an empty object for a successful empty response body", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse({ body: "" })));

    await expect(requestJson("/api")).resolves.toEqual({});
  });

  it("uses a backend message for HTTP errors with JSON bodies", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse({
      status: 500,
      body: JSON.stringify({ success: false, message: "Backend failed" })
    })));

    await expect(requestJson("/api")).resolves.toMatchObject({
      success: false,
      message: "Backend failed",
      httpStatus: 500
    });
  });

  it("uses a generic HTTP message for JSON error bodies without a backend message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse({
      status: 500,
      body: JSON.stringify({ detail: "broken" })
    })));

    await expect(requestJson("/api")).resolves.toMatchObject({
      detail: "broken",
      success: false,
      message: 'Server returned HTTP 500: {"detail":"broken"}',
      httpStatus: 500
    });
  });

  it("uses an HTML snippet for HTTP errors with non-JSON bodies", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse({
      status: 500,
      body: "<h1>Server broke</h1>"
    })));

    await expect(requestJson("/api")).resolves.toMatchObject({
      success: false,
      message: "Server returned HTTP 500: <h1>Server broke</h1>",
      httpStatus: 500
    });
  });

  it("returns a generic HTTP message for empty HTTP error bodies", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse({ status: 404, body: "" })));

    await expect(requestJson("/api")).resolves.toMatchObject({
      success: false,
      message: "Server returned HTTP 404.",
      httpStatus: 404
    });
  });

  it("rejects invalid JSON for successful responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse({ body: "not-json" })));

    await expect(requestJson("/api")).resolves.toMatchObject({
      success: false,
      message: "Server returned an unreadable response.",
      httpStatus: 200
    });
  });

  it.each([
    ["null", "null"],
    ["string", JSON.stringify("hello")],
    ["number", "123"],
    ["boolean", "true"]
  ])("rejects JSON %s responses", async (_label, body) => {
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse({ body })));

    await expect(requestJson("/api")).resolves.toMatchObject({
      success: false,
      message: "Server returned an unexpected response.",
      httpStatus: 200
    });
  });

  it("accepts arrays because public endpoints may return array responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse({ body: JSON.stringify([{ id: "1" }]) })));

    await expect(requestJson("/api")).resolves.toEqual([{ id: "1" }]);
  });

  it("returns networkError for ordinary fetch failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("offline");
    }));

    await expect(requestJson("/api")).resolves.toMatchObject({
      success: false,
      message: "Could not connect.",
      networkError: true
    });
  });

  it("returns aborted without networkError for AbortError failures", async () => {
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw abortError;
    }));

    await expect(requestJson("/api")).resolves.toEqual({
      success: false,
      aborted: true,
      message: "Request was cancelled."
    });
  });

  it("returns aborted when reading the response body is aborted", async () => {
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse({ textError: abortError })));

    await expect(requestJson("/api")).resolves.toEqual({
      success: false,
      aborted: true,
      message: "Request was cancelled."
    });
  });

  it("returns an HTTP read error when the response body cannot be read", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse({ status: 502, textError: new Error("read failed") })));

    await expect(requestJson("/api")).resolves.toEqual({
      success: false,
      message: "Server response could not be read.",
      httpStatus: 502
    });
  });

  it("returns a configuration error for missing or empty URLs", async () => {
    await expect(requestJson("")).resolves.toEqual({
      success: false,
      message: "Request URL is not configured."
    });
  });

  it("preserves passed fetch options", async () => {
    const signal = new AbortController().signal;
    const options = {
      method: "POST",
      body: JSON.stringify({ id: 1 }),
      headers: { "Content-Type": "application/json" },
      signal
    };
    const fetchMock = vi.fn(async () => mockResponse({ body: "{}" }));
    vi.stubGlobal("fetch", fetchMock);

    await requestJson("/api", options);

    expect(fetchMock).toHaveBeenCalledWith("/api", options);
  });
});
