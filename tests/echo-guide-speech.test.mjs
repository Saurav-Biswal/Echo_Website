import test from 'node:test';
import assert from 'node:assert/strict';
import { EchoSpeechSession } from '../lib/echo-guide-speech.mjs';

function speechResult(transcript, isFinal = false) {
  return Object.assign([{ transcript }], { isFinal });
}

class FakeRecognition {
  static instances = [];
  constructor() {
    this.constructor.instances.push(this);
    this.started = false;
    this.stopped = false;
    this.aborted = false;
  }
  start() { this.started = true; }
  stop() { this.stopped = true; }
  abort() { this.aborted = true; }
  result(...results) { this.onresult?.({ results }); }
  end() { this.onend?.(); }
  error(error) { this.onerror?.({ error }); }
}

function fakeTimer() {
  let nextId = 0;
  const jobs = new Map();
  return {
    schedule(callback, delay) { const id = ++nextId; jobs.set(id, { callback, delay }); return id; },
    cancel(id) { jobs.delete(id); },
    runNext() { const [id, job] = jobs.entries().next().value ?? []; if (!job) return false; jobs.delete(id); job.callback(); return true; },
    get count() { return jobs.size; },
    get delays() { return [...jobs.values()].map((job) => job.delay); },
  };
}

function createSession(options = {}) {
  FakeRecognition.instances = [];
  const timer = fakeTimer();
  const transcripts = [];
  const statuses = [];
  const errors = [];
  const session = new EchoSpeechSession(FakeRecognition, {
    schedule: timer.schedule,
    cancelSchedule: timer.cancel,
    restartDelayMs: 350,
    ...options,
    onTranscript: (text) => transcripts.push(text),
    onStatus: (phase, text) => statuses.push([phase, text]),
    onError: (error) => errors.push(error),
  });
  return { session, timer, transcripts, statuses, errors };
}

test('speech session uses continuous interim recognition and displays partial then final text', () => {
  const { session, transcripts, statuses } = createSession();
  assert.equal(session.start(), true);
  const recognition = FakeRecognition.instances[0];
  assert.equal(recognition.continuous, true);
  assert.equal(recognition.interimResults, true);
  assert.equal(recognition.lang, 'en-IN');
  recognition.result(speechResult('I saved the video'));
  assert.equal(transcripts.at(-1), 'I saved the video');
  assert.equal(session.active, true);
  recognition.result(speechResult('I saved the video', true));
  assert.equal(transcripts.at(-1), 'I saved the video');
  assert.equal(statuses.at(-1)[0], 'listening');
});

test('transcript snapshots accumulate final results across events without duplicating prior segments', () => {
  const { session, transcripts } = createSession({ initialTranscript: 'Existing text' });
  session.start();
  const recognition = FakeRecognition.instances[0];
  recognition.result(speechResult('Where did I save'));
  assert.equal(transcripts.at(-1), 'Existing text Where did I save');
  recognition.result(speechResult('Where did I save', true), speechResult('that recipe'));
  assert.equal(transcripts.at(-1), 'Existing text Where did I save that recipe');
  recognition.result(speechResult('Where did I save', true), speechResult('that recipe', true));
  assert.equal(transcripts.at(-1), 'Existing text Where did I save that recipe');
});

test('a premature end resumes after a cooldown and carries finalized text into the next recognizer', () => {
  const { session, timer, transcripts } = createSession();
  session.start();
  const first = FakeRecognition.instances[0];
  first.result(speechResult('I saved a place', true));
  first.end();
  assert.equal(FakeRecognition.instances.length, 1);
  assert.equal(first.onend, null);
  assert.deepEqual(timer.delays, [350]);
  timer.runNext();
  const second = FakeRecognition.instances[1];
  assert.equal(second.continuous, true);
  second.result(speechResult('near the river', true));
  assert.equal(transcripts.at(-1), 'I saved a place near the river');
  second.end();
  assert.equal(session.active, true);
});

test('duplicate starts are rejected and ended recognition instances never overlap', () => {
  const { session, timer } = createSession();
  assert.equal(session.start(), true);
  assert.equal(session.start(), false);
  assert.equal(FakeRecognition.instances.length, 1);
  const first = FakeRecognition.instances[0];
  first.end();
  assert.equal(session.start(), false);
  assert.equal(FakeRecognition.instances.length, 1);
  timer.runNext();
  assert.equal(FakeRecognition.instances.length, 2);
  assert.equal(FakeRecognition.instances.filter((item) => item.started && item.onend !== null).length, 1);
});

test('deliberate Stop accepts the final result, cleans handlers, and does not restart', () => {
  const { session, timer, transcripts, statuses } = createSession();
  session.start();
  const recognition = FakeRecognition.instances[0];
  recognition.result(speechResult('Tell me about Echo'));
  session.stop();
  assert.equal(recognition.stopped, true);
  recognition.result(speechResult('Tell me about Echo please', true));
  recognition.end();
  assert.equal(transcripts.at(-1), 'Tell me about Echo please');
  assert.equal(statuses.at(-1)[0], 'idle');
  assert.equal(recognition.onresult, null);
  assert.equal(recognition.onerror, null);
  assert.equal(recognition.onend, null);
  assert.equal(timer.count, 0);
});

test('a browser that omits its end event is aborted after the Stop fallback timeout', () => {
  const { session, timer, statuses } = createSession();
  session.start();
  const recognition = FakeRecognition.instances[0];
  session.stop();
  assert.equal(timer.count, 1);
  timer.runNext();
  assert.equal(session.active, false);
  assert.equal(recognition.aborted, true);
  assert.equal(recognition.onresult, null);
  assert.equal(recognition.onerror, null);
  assert.equal(recognition.onend, null);
  assert.equal(statuses.at(-1)[0], 'idle');
});

test('no-speech is recoverable while network and permission errors terminate and clean up', () => {
  const recoverable = createSession();
  recoverable.session.start();
  const first = FakeRecognition.instances[0];
  first.error('no-speech');
  assert.equal(recoverable.errors.at(-1).category, 'no-speech');
  assert.equal(recoverable.session.active, true);
  first.end();
  assert.equal(recoverable.timer.count, 1);

  const terminal = createSession();
  terminal.session.start();
  const recognition = FakeRecognition.instances[0];
  recognition.error('network');
  assert.equal(terminal.errors.at(-1).category, 'network');
  assert.equal(terminal.session.active, false);
  assert.equal(recognition.aborted, true);
  assert.equal(recognition.onresult, null);
  assert.equal(recognition.onerror, null);
  assert.equal(recognition.onend, null);
  assert.equal(terminal.timer.count, 0);
});

test('repeated empty browser endings are rate-limited and eventually stop listening', () => {
  const { session, timer, statuses } = createSession({ maxRestarts: 2 });
  session.start();
  FakeRecognition.instances[0].end();
  timer.runNext();
  FakeRecognition.instances[1].end();
  timer.runNext();
  FakeRecognition.instances[2].end();
  assert.equal(session.active, false);
  assert.equal(FakeRecognition.instances.length, 3);
  assert.equal(statuses.at(-1)[0], 'exhausted');
});

test('close aborts recognition, detaches handlers, and cancels a pending restart', () => {
  const { session, timer } = createSession();
  session.start();
  const recognition = FakeRecognition.instances[0];
  recognition.end();
  assert.equal(timer.count, 1);
  session.abort();
  assert.equal(timer.count, 0);
  assert.equal(session.active, false);
  timer.runNext();
  assert.equal(FakeRecognition.instances.length, 1);
});

test('a browser permission exception is classified without exposing exception text', () => {
  class DeniedRecognition extends FakeRecognition {
    start() { throw new globalThis.DOMException('private browser detail', 'NotAllowedError'); }
  }
  const { session, errors, statuses } = createSession();
  session.Recognition = DeniedRecognition;
  session.start();
  assert.equal(session.active, false);
  assert.equal(errors.at(-1).category, 'not-allowed');
  assert.doesNotMatch(JSON.stringify(errors), /private browser detail/);
  assert.equal(statuses.at(-1)[0], 'idle');
});
