import LegalFooter from "./legal-footer";
import SiteHeader from "./site-header";
import AskXpSection from "./home/ask-xp-section";
import CommunitiesSection from "./home/communities-section";
import FinalCta from "./home/final-cta";
import Hero from "./home/hero";
import LeaderboardSection from "./home/leaderboard-section";
import PrivateGubsSection from "./home/private-gubs-section";
import TwoWaysSection from "./home/two-ways-section";
import styles from "./home/home.module.css";
import shellStyles from "./home/home-shell.module.css";

export default function Home() {
  return (
    <div className={`${styles.site} ${shellStyles.shell}`} id="top">
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <SiteHeader />
      <main className={styles.main} id="main-content">
        <Hero />
        <TwoWaysSection />
        <PrivateGubsSection />
        <CommunitiesSection />
        <AskXpSection />
        <LeaderboardSection />
        <FinalCta />
      </main>
      <LegalFooter />
    </div>
  );
}
