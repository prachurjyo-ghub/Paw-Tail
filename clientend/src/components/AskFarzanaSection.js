import Link from "next/link";

import Container from "@/components/Container";
import styles from "./AskFarzanaSection.module.css";

export default function AskFarzanaSection() {
  return (
    <section className={styles.section} aria-labelledby="ask-farzana-heading">
      <Container>
        <div className={styles.card}>
          <div
            className={styles.media}
            role="img"
            aria-label="PawTail nutritionist kneeling with a ginger cat and a small white dog"
          />
          <div className={styles.copy}>
            <p className={styles.eyebrow}>24/7 pet expert help</p>
            <h2 id="ask-farzana-heading">
              Not sure what to feed them? Ask Farzana.
            </h2>
            <p>
              Our in-house nutritionists help with puppy plans, kidney diets,
              aquarium cycling, and “my cat won’t eat this” moments. Share a
              photo — you’ll hear back from a real person, not a bot.
            </p>
            <div className={styles.actions}>
              <Link href="/contact" className={styles.cta}>
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
