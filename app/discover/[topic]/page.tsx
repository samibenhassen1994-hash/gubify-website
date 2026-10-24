import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LegalFooter from "../../legal-footer";
import SiteHeader from "../../site-header";
import CommunityCards from "../community-cards";
import styles from "../discover.module.css";
import { fetchPublicCommunityCatalog } from "../../../lib/community-catalog";
import { findDiscoverTopic,getDiscoverMatches,getAvailableDiscoverTopics } from "../../../lib/discover-topics";
type Props={params:Promise<{topic:string}>};
async function load(slug:string){const topic=findDiscoverTopic(slug);if(!topic)return null;const all=await fetchPublicCommunityCatalog();const matches=getDiscoverMatches(all,slug);return {topic,all,matches};}
export async function generateMetadata({params}:Props):Promise<Metadata>{const {topic:slug}=await params;const data=await load(slug);if(!data||data.matches.length===0)notFound();return {title:`${data.topic.title} | Gubify Discover`,description:data.topic.description,alternates:{canonical:`/discover/${slug}`},openGraph:{title:`${data.topic.title} | Gubify Discover`,description:data.topic.description,url:`/discover/${slug}`,type:"website"}};}
export default async function TopicPage({params}:Props){const {topic:slug}=await params;const data=await load(slug);if(!data||data.matches.length===0)notFound();
 const {topic,all,matches}=data;
 const related=getAvailableDiscoverTopics(all).filter(x=>x.slug!==slug).slice(0,5);
 const jsonLd={"@context":"https://schema.org","@type":"CollectionPage",name:topic.title,description:topic.description,url:`https://gubify.com/discover/${slug}`,"mainEntity":{"@type":"ItemList",numberOfItems:matches.length,itemListElement:matches.map((c,i)=>({"@type":"ListItem",position:i+1,name:c.name,url:`https://gubify.com/community/${c.slug}`}))}};
 return <><SiteHeader/><main className={styles.page}><div className={styles.container}><Link href="/discover" className={styles.back}>← All interests</Link><header className={styles.hero}><span className={styles.eyebrow}>Gubify Discover</span><h1>{topic.title}</h1><p>{topic.introduction}</p><p className={styles.lead}>{matches.length} {matches.length===1?"public Community matches":"public Communities match"} this topic. Browse their descriptions, language and access rules.</p></header>
 <CommunityCards communities={matches}/>
 <p className={styles.notice}>Only publicly listed Gubify Communities are included. Member counts are shown only when available. This is a discovery directory, not a quality ranking.</p>
 {related.length>0&&<nav className={styles.links} aria-label="More interests">{related.map(t=><Link key={t.slug} href={`/discover/${t.slug}`}>{t.title}</Link>)}</nav>}
 <div className={styles.sectionHead}><Link href="/communities">Explore all public Communities →</Link></div>
 <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd).replace(/</g,"\\u003c")}}/>
 </div></main><LegalFooter/></>;
}