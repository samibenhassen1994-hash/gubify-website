import assert from "node:assert/strict";
import test from "node:test";

import {
  DISCOVER_TOPICS,
  findDiscoverTopic,
  getDiscoverMatches,
  getAvailableDiscoverTopics,
} from "../lib/discover-topics.ts";

const sample = [
  { slug:"night-gamers",name:"Night Gamers",description:"Gaming nights and co-op play",type:"Gaming",language:"English",accessMode:"open",memberCount:45,imageUrl:null,createdAt:"2026-10-20T10:00:00Z" },
  { slug:"anime-lounge",name:"Anime Lounge",description:"Discuss anime, manga and new episodes",type:"Show",language:"English",accessMode:"approval",memberCount:23,imageUrl:null,createdAt:"2026-10-20T10:00:00Z" },
  { slug:"arcade-italia",name:"Arcade Italia",description:"Video games meetups based in Italia",type:"Gaming",language:"Italian",accessMode:"open",memberCount:19,imageUrl:null,createdAt:"2026-10-20T10:00:00Z" },
  { slug:"tech-builders",name:"Flutter Builders",description:"Learn Flutter and programming",type:"Technology",language:"English",accessMode:"open",memberCount:31,imageUrl:null,createdAt:"2026-10-20T10:00:00Z" },
  { slug:"sports-lombardia",name:"Italian Runners",description:"Running in Milan, Italia",type:"Sport",language:"Italian",accessMode:"open",memberCount:9,imageUrl:null,createdAt:"2026-10-20T10:00:00Z" },
];

test("Discover uses a fixed editorial taxonomy, not arbitrary SEO slugs", () => {
  assert.ok(DISCOVER_TOPICS.some((topic) => topic.slug === "anime"));
  assert.equal(findDiscoverTopic("anime")?.title, "Anime Communities");
  assert.equal(findDiscoverTopic("nonexistent"), undefined);
  assert.equal(findDiscoverTopic("../../../private"), undefined);
});

test("Discover matches real public catalog records without invented data or broad accidental matches", () => {
  assert.deepEqual(getDiscoverMatches(sample, "anime").map((x) => x.slug), ["anime-lounge"]);
  assert.deepEqual(getDiscoverMatches(sample, "technology").map((x) => x.slug), ["tech-builders"]);
  assert.deepEqual(getDiscoverMatches(sample, "gaming").map((x) => x.slug), ["night-gamers", "arcade-italia"]);
  assert.deepEqual(getDiscoverMatches(sample, "gaming-in-italy").map((x) => x.slug), ["arcade-italia"]);
  assert.deepEqual(getDiscoverMatches(sample, "fitness").map((x) => x.slug), ["sports-lombardia"]);
  assert.equal(getAvailableDiscoverTopics(sample).some((x) => x.slug === "music"), false);
  assert.equal(getAvailableDiscoverTopics(sample).some((x) => x.slug === "gaming-in-italy"), true);
  const italianByLanguageOnly = [{ ...sample[0], language:"Italian" }];
  assert.deepEqual(getDiscoverMatches(italianByLanguageOnly, "gaming-in-italy"), []);
});

const projectId = "gubify-a3e2c";
let catalog = [];
let status = 200;

function doc(item) {
  return {
    document: {
      name: `projects/${projectId}/databases/(default)/documents/communityPublic/${item.slug}`,
      fields: {
        slug:{stringValue:item.slug},name:{stringValue:item.name},description:{stringValue:item.description},
        ...(item.type?{type:{stringValue:item.type}}:{}),
        language:{stringValue:item.language},accessMode:{stringValue:item.accessMode},
        ...(item.memberCount===undefined?{}:{memberCount:{integerValue:String(item.memberCount)}}),
        createdAt:{timestampValue:item.createdAt},updatedAt:{timestampValue:item.createdAt},
        ownerEmail:{stringValue:"private@example.test"},
      },
    },
  };
}
globalThis.__cloudflareTestEnv={FIREBASE_PROJECT_ID:projectId};
globalThis.fetch=async (_input,init)=>{
  assert.equal(init?.method,"POST");
  if(status!==200)return new Response(null,{status});
  return Response.json([...catalog.map(doc),{readTime:"2026-10-20T10:00:00Z",done:true}]);
};
const worker=(await import(new URL("../dist/server/index.js",import.meta.url))).default;
const env={FIREBASE_PROJECT_ID:projectId,ASSETS:{fetch:async()=>new Response("Not found",{status:404})}};
const ctx={waitUntil(){},passThroughOnException(){}};
async function request(path) {return worker.fetch(new Request(`http://localhost${path}`,{headers:{accept:"text/html"}}),env,ctx);}
test.beforeEach(()=>{catalog=[...sample];status=200;});

test("Discover hub renders real-topic navigation and links to existing public Communities",async()=>{
  const response=await request("/discover");
  const html=await response.text();
  assert.equal(response.status,200);
  assert.match(html,/<h1[^>]*>Discover your next Community/i);
  assert.match(html,/href=["']\/discover\/anime["']/i);
  assert.match(html,/href=["']\/community\/anime-lounge["']/i);
  assert.doesNotMatch(html,/private@example\.test/);
  assert.doesNotMatch(html,/href=["']\/discover\/fitness["']/i);
});

test("topic page renders only genuinely matching public Communities and unique canonical metadata",async()=>{
  const response=await request("/discover/anime");
  const html=await response.text();
  assert.equal(response.status,200);
  assert.match(html,/<h1[^>]*>Anime Communities/i);
  assert.match(html,/href=["']\/community\/anime-lounge["']/i);
  assert.doesNotMatch(html,/href=["']\/community\/night-gamers["']/i);
  assert.match(html,/https:\/\/gubify\.com\/discover\/anime/i);
  assert.match(html,/application\/ld\+json/i);
  assert.doesNotMatch(html,/private@example\.test/);
});

test("Italy topic requires explicit geography in public descriptions",async()=>{
  const html=await (await request("/discover/gaming-in-italy")).text();
  assert.match(html,/href=["']\/community\/arcade-italia["']/i);
  assert.doesNotMatch(html,/href=["']\/community\/night-gamers["']/i);
});

test("empty and unknown topics are 404, not thin indexable pages",async()=>{
  assert.equal((await request("/discover/music")).status,404);
  assert.equal((await request("/discover/completely-made-up-topic")).status,404);
});

test("upstream failure is not silently treated as no public Communities",async()=>{
  status=503;
  await assert.rejects(request("/discover/gaming"), error => {
    assert.notEqual(error?.digest, "NEXT_NOT_FOUND");
    return true;
  });
});
