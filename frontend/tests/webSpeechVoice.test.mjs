import test from 'node:test';
import assert from 'node:assert/strict';

// Import our TypeScript webSpeechVoice module directly
import {
  checkSpeechCapabilities,
  WebSpeechVoiceSession,
} from '../src/utils/webSpeechVoice.ts';

/**
 * Helper to build mock browser window environment
 */
function createMockWindowEnvironment(options = {}) {
  const {
    hasRecognition = true,
    recognitionType = 'webkitSpeechRecognition',
    hasSynthesis = true,
    getUserMediaRejects = null,
  } = options;

  let activeUtterance = null;
  let recognitionInstance = null;

  class MockSpeechRecognition {
    constructor() {
      recognitionInstance = this;
      this.continuous = false;
      this.interimResults = false;
      this.lang = 'en-US';
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      this.started = false;
      this.aborted = false;
    }
    start() {
      this.started = true;
      this.aborted = false;
    }
    abort() {
      this.aborted = true;
      this.started = false;
      if (this.onend) this.onend();
    }
    stop() {
      this.started = false;
      if (this.onend) this.onend();
    }
  }

  const mockSynthesis = {
    speaking: false,
    cancelCalled: false,
    speak(utterance) {
      activeUtterance = utterance;
      mockSynthesis.speaking = true;
    },
    cancel() {
      mockSynthesis.cancelCalled = true;
      mockSynthesis.speaking = false;
      if (activeUtterance && activeUtterance.onerror) {
        // synthesis cancelled
      }
    },
    getVoices() {
      return [
        { name: 'Google US English Natural', lang: 'en-US' },
        { name: 'Microsoft Jenny Online', lang: 'en-US' },
      ];
    },
  };

  class MockSpeechSynthesisUtterance {
    constructor(text) {
      this.text = text;
      this.lang = 'en-US';
      this.rate = 1.0;
      this.pitch = 1.0;
      this.voice = null;
      this.onend = null;
      this.onerror = null;
    }
  }

  const mockMediaDevices = {
    async getUserMedia() {
      if (getUserMediaRejects) {
        throw getUserMediaRejects;
      }
      return {
        getTracks() {
          return [{ stop: () => {} }];
        },
      };
    },
  };

  const globalScope = {
    navigator: { mediaDevices: mockMediaDevices },
    speechSynthesis: hasSynthesis ? mockSynthesis : undefined,
    SpeechSynthesisUtterance: hasSynthesis ? MockSpeechSynthesisUtterance : undefined,
  };

  if (hasRecognition) {
    if (recognitionType === 'SpeechRecognition') {
      globalScope.SpeechRecognition = MockSpeechRecognition;
    } else {
      globalScope.webkitSpeechRecognition = MockSpeechRecognition;
    }
  }

  return {
    globalScope,
    getRecognitionInstance: () => recognitionInstance,
    getSynthesis: () => mockSynthesis,
    getActiveUtterance: () => activeUtterance,
  };
}

function setMockGlobals(env) {
  global.window = env.globalScope;
  try {
    Object.defineProperty(global, 'navigator', {
      value: env.globalScope.navigator,
      configurable: true,
      writable: true,
    });
  } catch {
    // ignore
  }
  global.speechSynthesis = env.globalScope.speechSynthesis;
  global.SpeechSynthesisUtterance = env.globalScope.SpeechSynthesisUtterance;
}

test('checkSpeechCapabilities detects capabilities accurately', () => {
  // Test when window is missing
  const prevWindow = global.window;
  delete global.window;
  const missingCaps = checkSpeechCapabilities();
  assert.equal(missingCaps.hasSpeechRecognition, false);
  assert.equal(missingCaps.hasSpeechSynthesis, false);

  // Test when webkitSpeechRecognition is available
  const env = createMockWindowEnvironment({
    hasRecognition: true,
    recognitionType: 'webkitSpeechRecognition',
    hasSynthesis: true,
  });
  setMockGlobals(env);

  const validCaps = checkSpeechCapabilities();
  assert.equal(validCaps.hasSpeechRecognition, true);
  assert.equal(validCaps.hasSpeechSynthesis, true);
  assert.equal(validCaps.recognitionEngine, 'webkitSpeechRecognition');

  // Restore
  global.window = prevWindow;
});

test('WebSpeechVoiceSession handles unsupported browsers with clean error message', async () => {
  const env = createMockWindowEnvironment({ hasRecognition: false });
  setMockGlobals(env);

  let errorReported = null;
  let statusReported = null;

  const session = new WebSpeechVoiceSession(
    'sess-unsupported-test',
    1,
    'Explain binary search',
    'Algorithms',
    {
      onStatusChange: (status) => {
        statusReported = status;
      },
      onTranscriptUpdate: () => {},
      onError: (err) => {
        errorReported = err;
      },
    }
  );

  await session.start();
  assert.equal(statusReported, 'error');
  assert.match(errorReported, /does not support/);
  session.cleanup();
});

test('WebSpeechVoiceSession handles microphone permission denial gracefully', async () => {
  const permError = new Error('Permission denied');
  permError.name = 'NotAllowedError';

  const env = createMockWindowEnvironment({
    hasRecognition: true,
    hasSynthesis: true,
    getUserMediaRejects: permError,
  });
  setMockGlobals(env);

  let errorReported = null;
  let statusReported = null;

  const session = new WebSpeechVoiceSession(
    'sess-mic-denied-test',
    1,
    'Explain quicksort',
    'Sorting',
    {
      onStatusChange: (status) => {
        statusReported = status;
      },
      onTranscriptUpdate: () => {},
      onError: (err) => {
        errorReported = err;
      },
    }
  );

  await session.start();
  assert.equal(statusReported, 'error');
  assert.match(errorReported, /Microphone permission was denied/i);
  session.cleanup();
});

test('WebSpeechVoiceSession processes interim recognition and completes thought after pause', async () => {
  const env = createMockWindowEnvironment({
    hasRecognition: true,
    hasSynthesis: true,
  });
  setMockGlobals(env);

  let currentTranscripts = [];
  let thoughtCompletedText = null;
  let lastStatus = null;

  const session = new WebSpeechVoiceSession(
    'sess-interim-test',
    1,
    'Explain React Fiber',
    'Architecture',
    {
      onStatusChange: (status) => {
        lastStatus = status;
      },
      onTranscriptUpdate: (t) => {
        currentTranscripts = t;
      },
      onError: () => {},
      onThoughtComplete: (text) => {
        thoughtCompletedText = text;
      },
    }
  );

  await session.start();

  // Emulate interviewer greeting ending
  const utterance = env.getActiveUtterance();
  assert.ok(utterance, 'Initial interviewer utterance was synthesized');
  utterance.onend();

  const rec = env.getRecognitionInstance();
  assert.ok(rec, 'Speech recognition instance initialized');

  // 1. Candidate speaks partial interim speech: "I will implement a"
  rec.onresult({
    resultIndex: 0,
    results: [
      {
        0: { transcript: 'I will implement a' },
        isFinal: false,
        length: 1,
      },
    ],
  });

  assert.equal(currentTranscripts.length, 2); // 1 interviewer, 1 candidate
  const candItem1 = currentTranscripts[1];
  assert.equal(candItem1.speaker, 'candidate');
  assert.equal(candItem1.text, 'I will implement a');
  assert.equal(candItem1.isFinal, false);
  assert.equal(candItem1.thoughtCompleted, false);

  // 2. Candidate completes substantive thought: "I will implement a hash table with linked list buckets for collision resolution."
  const substantiveExplanation =
    'I will implement a hash table with linked list buckets for collision resolution.';
  rec.onresult({
    resultIndex: 0,
    results: [
      {
        0: { transcript: substantiveExplanation },
        isFinal: true,
        length: 1,
      },
    ],
  });

  const candItem2 = currentTranscripts[1];
  assert.equal(candItem2.text, substantiveExplanation);
  assert.equal(candItem2.isFinal, true);

  // Fast forward debounce timer (2200ms)
  await new Promise((resolve) => setTimeout(resolve, 2300));

  assert.equal(currentTranscripts[1].thoughtCompleted, true);
  assert.equal(thoughtCompletedText, substantiveExplanation);
  assert.match(lastStatus, /ready/);

  session.cleanup();
});

test('WebSpeechVoiceSession enforces half-duplex echo suppression: discards recognition during synthesis', async () => {
  const env = createMockWindowEnvironment({
    hasRecognition: true,
    hasSynthesis: true,
  });
  setMockGlobals(env);

  let currentTranscripts = [];

  const session = new WebSpeechVoiceSession(
    'sess-echo-test',
    1,
    'Explain LRU cache',
    'Data Structures',
    {
      onStatusChange: () => {},
      onTranscriptUpdate: (t) => {
        currentTranscripts = t;
      },
      onError: () => {},
    }
  );

  await session.start();
  const rec = env.getRecognitionInstance();

  // Interviewer is currently speaking (initial utterance active)
  assert.equal(session['isSpeaking'], true);

  // Stale recognition receives audio picked up from the laptop speakers:
  rec.onresult({
    resultIndex: 0,
    results: [
      {
        0: { transcript: 'Echo feedback from speakers' },
        isFinal: true,
        length: 1,
      },
    ],
  });

  // Candidate transcripts must NOT contain the echo!
  const candidateTranscripts = currentTranscripts.filter((t) => t.speaker === 'candidate');
  assert.equal(candidateTranscripts.length, 0, 'Acoustic echo was successfully discarded!');

  session.cleanup();
});

test('WebSpeechVoiceSession supports instant speech interruption (Barge-in)', async () => {
  const env = createMockWindowEnvironment({
    hasRecognition: true,
    hasSynthesis: true,
  });
  setMockGlobals(env);

  let statusTransitions = [];

  const session = new WebSpeechVoiceSession(
    'sess-bargein-test',
    1,
    'Explain LSM trees',
    'Databases',
    {
      onStatusChange: (status) => {
        statusTransitions.push(status);
      },
      onTranscriptUpdate: () => {},
      onError: () => {},
    }
  );

  await session.start();
  assert.equal(session['isSpeaking'], true);

  // Candidate clicks "Interrupt Speaking" or presses Escape
  session.cancelSpeech();

  assert.equal(session['isSpeaking'], false);
  assert.equal(env.getSynthesis().cancelCalled, true);
  assert.ok(statusTransitions.includes('listening'));

  session.cleanup();
});

test('WebSpeechVoiceSession handles recognition errors correctly', async () => {
  const env = createMockWindowEnvironment({
    hasRecognition: true,
    hasSynthesis: true,
  });
  setMockGlobals(env);

  let errorReported = null;

  const session = new WebSpeechVoiceSession(
    'sess-errors-test',
    1,
    'Explain Raft consensus',
    'Distributed Systems',
    {
      onStatusChange: () => {},
      onTranscriptUpdate: () => {},
      onError: (err) => {
        errorReported = err;
      },
    }
  );

  await session.start();
  const rec = env.getRecognitionInstance();

  // Test no-speech (silence timeout) - should NOT trigger user-facing error
  errorReported = null;
  rec.onerror({ error: 'no-speech' });
  assert.equal(errorReported, null);

  // Test aborted (deliberate interruption) - should NOT trigger user-facing error
  errorReported = null;
  rec.onerror({ error: 'aborted' });
  assert.equal(errorReported, null);

  // Test network failure
  errorReported = null;
  rec.onerror({ error: 'network' });
  assert.match(errorReported, /Network connectivity required/i);

  // Test audio-capture failure
  errorReported = null;
  rec.onerror({ error: 'audio-capture' });
  assert.match(errorReported, /No microphone detected/i);

  session.cleanup();
});

test('WebSpeechVoiceSession repeated starts and stops clean up properly without dangling state', async () => {
  const env = createMockWindowEnvironment({
    hasRecognition: true,
    hasSynthesis: true,
  });
  setMockGlobals(env);


  const session = new WebSpeechVoiceSession(
    'sess-repeat-test',
    1,
    'Explain Quickselect',
    'Algorithms',
    {
      onStatusChange: () => {},
      onTranscriptUpdate: () => {},
      onError: () => {},
    }
  );

  await session.start();
  // Second redundant start should be a no-op
  await session.start();

  session.cleanup();
  assert.equal(session['isSessionActive'], false);
  assert.equal(session['recognition'], null);

  // Calling end should be safe
  session.end();
  assert.equal(session['isSessionActive'], false);
});

test('WebSpeechVoiceSession start(true) skips greeting utterance and immediately begins listening', async () => {
  const env = createMockWindowEnvironment({
    hasRecognition: true,
    hasSynthesis: true,
  });
  setMockGlobals(env);

  let statusReported = null;
  const session = new WebSpeechVoiceSession(
    'sess-skip-greeting',
    1,
    'Explain BFS vs DFS',
    'Graph Algorithms',
    {
      onStatusChange: (status) => {
        statusReported = status;
      },
      onTranscriptUpdate: () => {},
      onError: () => {},
    }
  );

  await session.start(true);

  // Synthesis speak should NOT have been called with the greeting
  assert.equal(env.getActiveUtterance(), null);
  assert.equal(env.getSynthesis().speaking, false);
  // Recognition should be started immediately
  assert.equal(env.getRecognitionInstance()?.started, true);
  assert.equal(statusReported, 'listening');

  session.cleanup();
});
