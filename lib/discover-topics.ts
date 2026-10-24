import type { PublicCommunityCatalogItem } from "./community-catalog";

type Topic = {
  slug: string; title: string; description: string; introduction: string;
  keywords: readonly string[]; types: readonly string[]; country?: "Italy";
};
export const DISCOVER_TOPICS: readonly Topic[] = [
  {slug:"gaming",title:"Gaming Communities",description:"Find gaming Communities on Gubify, meet players and share tips and ideas.",introduction:"Explore spaces for people who play, discuss games and look for gaming friends.",keywords:["gaming","gamer","video game","videogame","esport","co-op","multiplayer"],types:["Gaming"]},
  {slug:"anime",title:"Anime Communities",description:"Discover anime and manga Communities on Gubify and join discussions with fellow fans.",introduction:"Talk about anime series, manga and the stories you love with like-minded fans.",keywords:["anime","manga","otaku"],types:[]},
  {slug:"technology",title:"Technology Communities",description:"Find tech Communities on Gubify for coding, software, electronics and new ideas.",introduction:"Connect with people interested in development, programming and technology.",keywords:["tech","technology","coding","programming","developer","flutter","software","electronics"],types:["Technology"]},
  {slug:"music",title:"Music Communities",description:"Browse Gubify Communities for music fans, artists and listeners.",introduction:"Find people to discuss songs, genres, concerts and making music.",keywords:["music","musician","songs","concert","band"],types:["Music"]},
  {slug:"travel",title:"Travel Communities",description:"Explore public travel Communities on Gubify and connect with fellow travelers.",introduction:"Share travel ideas, destinations and advice with people who love exploring.",keywords:["travel","traveler","travelling","trip","backpacking"],types:["Travel"]},
  {slug:"fitness",title:"Fitness Communities",description:"Find Gubify Communities about training, fitness and staying active.",introduction:"Meet people interested in workouts, exercise and healthy activities.",keywords:["fitness","workout","exercise","gym","running","training"],types:["Fitness & Wellness"]},
  {slug:"gaming-in-italy",title:"Gaming Communities in Italy",description:"Discover gaming Communities on Gubify with an explicit connection to Italy.",introduction:"Explore public gaming Communities whose descriptions mention Italy or an Italian location.",keywords:["gaming","gamer","video game","videogame","esport","co-op","multiplayer"],types:["Gaming"],country:"Italy"},
];
const COUNTRY_RE=/\b(italy|italia|italian-based|based in italy|based in italia|roma|rome|milano|milan|napoli|naples|torino|turin|bologna|firenze|florence|palermo|calabria|sicilia|sicily|lombardia)\b/i;
export function findDiscoverTopic(slug: string) { return DISCOVER_TOPICS.find(x=>x.slug===slug); }
function tokenMatch(text: string, token: string) {
 const escaped=token.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
 return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`,"i").test(text);
}
export function getDiscoverMatches(communities: readonly PublicCommunityCatalogItem[], slug: string): PublicCommunityCatalogItem[] {
 const topic=findDiscoverTopic(slug);
 if(!topic)return [];
 return communities.filter(c=>{
  const text=`${c.name} ${c.description}`;
  const themed=(!!c.type&&topic.types.includes(c.type))||topic.keywords.some(word=>tokenMatch(text,word));
  return themed && (!topic.country||COUNTRY_RE.test(text));
 }).sort((a,b)=>(b.memberCount??0)-(a.memberCount??0)||a.name.localeCompare(b.name));
}
export function getAvailableDiscoverTopics(communities: readonly PublicCommunityCatalogItem[]) {
 return DISCOVER_TOPICS.filter(topic=>getDiscoverMatches(communities,topic.slug).length>0);
}
