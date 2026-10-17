// SPDX-License-Identifier: Apache-2.0
/**
 * Characterization of request-building logic in legacy/app.js (viaAnthropic, viaOpenAI, endpointUrl).
 * Kept in sync with the legacy app until phase 4 extracts pure builders into src/.
 */

export function endpointUrl(base, path) {
  let u = String(base || '').trim().replace(/\/+$/, '');
  if (path === 'anthropic') {
    if (/\/messages$/.test(u)) return u;
    return /\/v1$/.test(u) ? u + '/messages' : u + '/v1/messages';
  }
  return /\/chat\/completions$/.test(u) ? u : u + '/chat/completions';
}

export function anthropicRequest(c, prompt, imageB64) {
  const content = [];
  if (imageB64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: imageB64 },
    });
  }
  content.push({ type: 'text', text: prompt });
  const body = {
    model: c.model.trim(),
    max_tokens: ({ xhigh: 32000, max: 32000, high: 16000, '': 16000 })[c.effort] || 8000,
    messages: [{ role: 'user', content }],
  };
  if (c.effort) body.output_config = { effort: c.effort };
  const headers = {
    'content-type': 'application/json',
    'x-api-key': c.key.trim(),
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  return {
    url: endpointUrl(c.endpoint, 'anthropic'),
    headers,
    body,
  };
}

export function openaiRequest(c, prompt, imageB64, withImage) {
  const content =
    withImage && imageB64
      ? [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + imageB64 } },
        ]
      : prompt;
  const body = { model: c.model.trim(), messages: [{ role: 'user', content }] };
  if (c.effort) body.reasoning_effort = c.effort;
  const headers = { 'content-type': 'application/json' };
  if (c.key.trim()) headers.authorization = 'Bearer ' + c.key.trim();
  return {
    url: endpointUrl(c.endpoint, 'openai'),
    headers,
    body,
  };
}
