import Link from "next/link";
import type { PublicCommunityCatalogItem } from "../../lib/community-catalog";
import styles from "./discover.module.css";
export default function CommunityCards({communities}:{communities:readonly PublicCommunityCatalogItem[]}) {
 return <div className={styles.grid}>{communities.map(c=><Link key={c.slug} href={`/community/${c.slug}`} className={styles.card}>
 {c.imageUrl?<img className={styles.image} src={c.imageUrl} alt="" width={340} height={165}/>:<div className={styles.imageFallback} aria-hidden="true">✦</div>}
 <div className={styles.body}><div className={styles.badges}>{c.type&&<span>{c.type}</span>}<span>{c.language}</span><span>{c.accessMode==="open"?"Open":"Approval required"}</span></div><h3>{c.name}</h3><p>{c.description}</p>{c.memberCount!==undefined&&<small>{new Intl.NumberFormat("en").format(c.memberCount)} members</small>}</div>
 </Link>)}</div>;
}