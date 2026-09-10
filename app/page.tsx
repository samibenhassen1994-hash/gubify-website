import LegalFooter from "./legal-footer";
import SiteHeader from "./site-header";
import AskBestAnswerSection from "./home-interactive/ask-best-answer-section";
import CommunitiesSection from "./home-interactive/communities-section";
import FinalCta from "./home-interactive/final-cta";
import Hero from "./home-interactive/hero";
import LeaderboardSection from "./home-interactive/leaderboard-section";
import PrivateGubsSection from "./home-interactive/private-gubs-section";
import WorldBackground from "./home-interactive/world-background";
import styles from "./home-interactive/home.module.css";

export default function Home() {
  return (
    <div className={styles.site} id="top">
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <SiteHeader />
      <main className={styles.world} id="main-content">
        <WorldBackground />
        <Hero />
        <PrivateGubsSection />
        <CommunitiesSection />
        <AskBestAnswerSection />
        <LeaderboardSection />
        <FinalCta />
      </main>
      <LegalFooter />
    </div>
  );
}
