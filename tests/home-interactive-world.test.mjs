import assert from "node:assert/strict";
import test from "node:test";

import {
  createInitialPhoneState,
  phoneReducer,
} from "../app/home-interactive/interactive-phone-state.ts";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

const baseEnv = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
  IMAGES: {
    input() {
      throw new Error("Image processing is not expected in this test");
    },
  },
};

const executionContext = {
  waitUntil() {},
  passThroughOnException() {},
};

test("interactive phone state follows the approved demo flow", () => {
  const initial = createInitialPhoneState();
  assert.equal(initial.mode, "private");
  assert.equal(initial.privateScreen, "dashboard");
  assert.equal(initial.communityScreen, "explorer");
  assert.equal(initial.xp, 620);
  assert.equal(initial.levelProgress, 62);

  const community = phoneReducer(initial, {
    type: "switchMode",
    mode: "community",
  });
  assert.equal(community.mode, "community");
  assert.equal(community.communityScreen, "explorer");

  const privateChat = phoneReducer(initial, {
    type: "privateScreen",
    screen: "chat",
  });
  assert.equal(privateChat.privateScreen, "chat");

  const taskResult = phoneReducer(privateChat, {
    type: "convertMessage",
    action: "task",
  });
  assert.equal(taskResult.privateScreen, "actionResult");
  assert.equal(taskResult.privateAction, "task");

  const ask = phoneReducer(community, {
    type: "communityScreen",
    screen: "ask",
  });
  const resolved = phoneReducer(ask, {
    type: "selectBestAnswer",
    answerId: "answer-2",
  });
  assert.equal(resolved.bestAnswerId, "answer-2");
  assert.equal(resolved.xp, 760);
  assert.equal(resolved.levelProgress, 76);
});

test("home renders the interactive Gubify world contract", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    baseEnv,
    executionContext,
  );
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Build your world[\s\S]*together\./i);
  assert.match(html, /Your private space\.[\s\S]*More than a chat\./i);
  assert.match(html, /Find people who[\s\S]*love what you love\./i);
  assert.match(html, /Ask\. Help\.[\s\S]*Level up\./i);
  assert.match(html, /Become one of the[\s\S]*most valuable members\./i);
  assert.match(html, /href=["']\/communities["']/i);
  assert.match(html, /id=["']private-gubs["']/i);
  assert.match(html, /id=["']communities["']/i);
  assert.match(html, /id=["']ask-best-answer["']/i);
  assert.match(html, /id=["']leaderboard["']/i);
  assert.match(html, /Private Gub/i);
  assert.match(html, /Community/i);
  assert.match(html, /Explore Communities/i);
  assert.match(html, /Task/i);
  assert.match(html, /Shared Budget/i);
  assert.match(html, /Best Answer/i);
  assert.match(html, /Leaderboard/i);

  const phoneModeSwitches = html.match(/Choose Gubify demo mode/g) ?? [];
  assert.equal(phoneModeSwitches.length, 1, "homepage should render exactly one interactive phone");

  assert.match(html, /Private Gubs or Communities\?/i);
  assert.match(html, /Inside a Private Gub/i);
  assert.match(html, /Inside a Community/i);
  assert.match(html, /How Best Answer works/i);
  assert.match(html, /How members stand out/i);
  assert.match(html, /Choose your path/i);

  assert.doesNotMatch(html, /Launching 15 September 2026/i);
  assert.doesNotMatch(html, /launch countdown/i);
  assert.doesNotMatch(html, /Group Goals/i);
});