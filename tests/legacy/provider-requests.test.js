// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  anthropicRequest,
  endpointUrl,
  openaiRequest,
} from '../fixtures/legacy-provider-requests.mjs';

const PROMPT = 'Rank these six sculptures.';
const IMAGE_B64 = 'ZmFrZWltYWdl';

describe('legacy AI provider request bodies', () => {
  it('normalizes Anthropic and OpenAI endpoint URLs', () => {
    expect(endpointUrl('https://api.anthropic.com', 'anthropic')).toBe(
      'https://api.anthropic.com/v1/messages',
    );
    expect(endpointUrl('https://api.anthropic.com/v1', 'anthropic')).toBe(
      'https://api.anthropic.com/v1/messages',
    );
    expect(endpointUrl('https://proxy.example/v1/messages', 'anthropic')).toBe(
      'https://proxy.example/v1/messages',
    );
    expect(endpointUrl('https://api.openai.com/v1/', 'openai')).toBe(
      'https://api.openai.com/v1/chat/completions',
    );
    expect(endpointUrl('https://local.test/chat/completions', 'openai')).toBe(
      'https://local.test/chat/completions',
    );
  });

  it('builds the Anthropic Messages body with image first and browser header', () => {
    const { url, headers, body } = anthropicRequest(
      {
        model: 'claude-sonnet-5-5',
        effort: 'high',
        endpoint: 'https://api.anthropic.com',
        key: 'sk-ant-test',
      },
      PROMPT,
      IMAGE_B64,
    );
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(headers).toEqual({
      'content-type': 'application/json',
      'x-api-key': 'sk-ant-test',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    });
    expect(body).toEqual({
      model: 'claude-sonnet-5-5',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: IMAGE_B64 },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
      output_config: { effort: 'high' },
    });
  });

  it('omits output_config when effort is empty and maps max_tokens by tier', () => {
    const low = anthropicRequest(
      { model: 'm', effort: 'low', endpoint: 'https://api.anthropic.com', key: 'k' },
      PROMPT,
      null,
    );
    expect(low.body.max_tokens).toBe(8000);
    expect(low.body.output_config).toEqual({ effort: 'low' });
    expect(low.body.messages[0].content).toEqual([{ type: 'text', text: PROMPT }]);

    const xhigh = anthropicRequest(
      { model: 'm', effort: 'xhigh', endpoint: 'https://api.anthropic.com', key: 'k' },
      PROMPT,
      null,
    );
    expect(xhigh.body.max_tokens).toBe(32000);
    expect(xhigh.body.output_config).toEqual({ effort: 'xhigh' });

    const defaultEffort = anthropicRequest(
      { model: 'm', effort: '', endpoint: 'https://api.anthropic.com', key: 'k' },
      PROMPT,
      null,
    );
    expect(defaultEffort.body.max_tokens).toBe(16000);
    expect(defaultEffort.body.output_config).toBeUndefined();
  });

  it('builds OpenAI-compatible chat completions with optional auth and image', () => {
    const withImage = openaiRequest(
      {
        model: 'gpt-test',
        effort: 'medium',
        endpoint: 'https://api.openai.com/v1',
        key: 'secret',
      },
      PROMPT,
      IMAGE_B64,
      true,
    );
    expect(withImage.url).toBe('https://api.openai.com/v1/chat/completions');
    expect(withImage.headers).toEqual({
      'content-type': 'application/json',
      authorization: 'Bearer secret',
    });
    expect(withImage.body).toEqual({
      model: 'gpt-test',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + IMAGE_B64 } },
          ],
        },
      ],
      reasoning_effort: 'medium',
    });

    const textOnly = openaiRequest(
      { model: 'local', effort: '', endpoint: 'http://127.0.0.1:11434/v1', key: '' },
      PROMPT,
      IMAGE_B64,
      false,
    );
    expect(textOnly.headers).toEqual({ 'content-type': 'application/json' });
    expect(textOnly.body).toEqual({
      model: 'local',
      messages: [{ role: 'user', content: PROMPT }],
    });
  });
});
