import type { Metadata } from "next";
import Link from "next/link";
import LegalFooter from "../legal-footer";
import SiteHeader from "../site-header";
import CommunityCards from "./community-cards";
import styles from "./discover.module.css";
import { fetchPublicCommunityCatalog } from "../../lib/community-catalog";
import { getAvailableDiscoverTopics, getDiscoverMatches } from "../../lib/discover-topics";
export const metadata: Metadata={title:"Discover Communities by Interest | Gubify",description:"Explore public Gubify Communities by topic, from gaming and anime to tech, music, travel and fitness. Only real public Communities are featured.",alternates:{canonical:"/discover"}};
export default async function DiscoverPage(){
 const communities=await fetchPublicCommunityCatalog();
 const topics=getAvailableDiscoverTopics(communities);
 return <><SiteHeader/><main className={styles.page}><div className={styles.container}><header className={styles.hero}><span className={styles.eyebrow}>Gubify Discover</span><h1>Discover your next Community</h1><p>Find people who share your interests. Browse real public Gubify Communities by topic and continue to their public profiles to learn how to join.</p></header>
 {topics.length>0?<><nav className={styles.links} aria-label="Explore interests">{topics.map(t=><Link key={t.slug} href={`/discover/${t.slug}`}>{t.title}</Link>)}</nav>
 <section aria-labelledby="topics-title"><div className={styles.sectionHead}><h2 id="topics-title">Explore by interest</h2></div><div className={styles.grid}>{topics.map(t=><Link className={`${styles.card} ${styles.topicCard}`} key={t.slug} href={`/discover/${t.slug}`}><strong>{t.title}</strong><p>{t.introduction}</p><span>{getDiscoverMatches(communities,t.slug).length} matching Communities →</span></Link>)}</div></section>
 <section aria-labelledby="featured-title"><div className={styles.sectionHead}><h2 id="featured-title">Public Communities to explore</h2><Link href="/communities">View all Communities →</Link></div><CommunityCards communities={communities.slice(0,9)}/></section></>:<div className={styles.notice}>There are no public topic matches yet. <Link href="/communities">Browse the full Community directory</Link> instead.</div>}
 <p className={styles.notice}>This directory uses public Community information. Results are not endorsements or a ranking. Join requests and conversations happen in the Gubify app.</p></div></main><LegalFooter/></>;
}