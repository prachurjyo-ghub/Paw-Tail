"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { saveCheckoutPrefs, readCheckoutPrefs } from "@/lib/checkoutStorage";
import {
  checkCheckoutPromoCode,
  fetchPromoDeals,
} from "@/lib/promoDealApi";
import { PromoDealsSkeleton } from "@/components/skeletons/StorefrontSkeletons";
import styles from "./PromoDealsSection.module.css";

function pad(n) {
  return (n < 10 ? "0" : "") + n;
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5 15V5h10" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" />
      <path d="M14 6v3M14 10.5v3M14 15v3" />
    </svg>
  );
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      /* fall through */
    }
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch {
    /* ignore */
  }
  document.body.removeChild(ta);
}

function CodeButton({ code, className = "", onCopied }) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    await copyText(code);
    setCopied(true);
    onCopied?.(code);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      className={`${styles.code} ${className} ${copied ? styles.copied : ""}`}
      onClick={handleClick}
      aria-label={`Copy code ${code}`}
    >
      <span>{copied ? "Copied!" : code}</span>
      <CopyIcon />
    </button>
  );
}

function useCountdown(endsAt) {
  const [time, setTime] = useState({ d: "00", h: "00", m: "00", s: "00" });

  useEffect(() => {
    if (!endsAt) return undefined;
    const end = new Date(endsAt).getTime();
    if (Number.isNaN(end)) return undefined;

    const tick = () => {
      const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setTime({
        d: pad(Math.floor(s / 86400)),
        h: pad(Math.floor((s % 86400) / 3600)),
        m: pad(Math.floor((s % 3600) / 60)),
        s: pad(s % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return time;
}

function TicketCard({ card, variant, delay, onCopied }) {
  const time = useCountdown(card.showCountdown ? card.endsAt : null);
  const isA = variant === "A";
  const ringId = isA ? "ptCirDealA" : "ptCirDealB";

  return (
    <div
      className={`${styles.tw} ${isA ? styles.wTicket1 : styles.wTicket2} ${styles.reveal}`}
      style={{ "--pt-d": delay }}
    >
      <div className={`${styles.ticket} ${isA ? styles.t1 : styles.t2}`}>
        <div className={styles.main}>
          <span className={styles.kick}>
            <i />
            {card.kicker}
          </span>
          <h3>{card.title}</h3>
          {!isA && (card.amountLabel || card.amountSuffix) ? (
            <div className={styles.big}>
              {card.amountLabel}{" "}
              {card.amountSuffix ? <em>{card.amountSuffix}</em> : null}
            </div>
          ) : null}
          <p>{card.description}</p>
          {card.showCountdown && card.endsAt ? (
            <div className={styles.cd} aria-label="Offer ends in">
              <span className={styles.u}>
                <b>{time.d}</b>
                <span>days</span>
              </span>
              <span className={styles.u}>
                <b>{time.h}</b>
                <span>hrs</span>
              </span>
              <span className={styles.u}>
                <b>{time.m}</b>
                <span>min</span>
              </span>
              <span className={styles.u}>
                <b>{time.s}</b>
                <span>sec</span>
              </span>
            </div>
          ) : (
            <div className={styles.spacer} />
          )}
          <Link
            href={card.buttonHref || "/categories"}
            className={`${styles.btn} ${isA ? styles.btnO : styles.btnG}`}
          >
            {card.buttonLabel || "Shop now"}
            <ArrowIcon />
          </Link>
        </div>
        <div className={styles.stub}>
          <span className={styles.stubL}>Tap to copy</span>
          {card.code ? <CodeButton code={card.code} onCopied={onCopied} /> : null}
          <div className={styles.barcode} aria-hidden="true" />
          <span className={styles.barcodeL}>{card.barcodeLabel || card.code}</span>
        </div>
        <i className={styles.tear} aria-hidden="true" />
      </div>
      <i className={`${styles.notch} ${styles.nt}`} />
      <i className={`${styles.notch} ${styles.nb}`} />
      <div className={styles.stamp} aria-hidden="true">
        <svg className={styles.ring} viewBox="0 0 120 120">
          <defs>
            <path
              id={ringId}
              d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0"
            />
          </defs>
          <text>
            <textPath href={`#${ringId}`}>
              {card.stampRingText || "PAWTAIL DEAL • PAWTAIL DEAL •"}
            </textPath>
          </text>
        </svg>
        <b>{card.amountLabel || (isA ? "DEAL" : "FREE")}</b>
      </div>
    </div>
  );
}

export default function PromoDealsSection() {
  const rootRef = useRef(null);
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalShow, setModalShow] = useState(false);
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");
  const [shake, setShake] = useState(false);
  const [ok, setOk] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, text: "" });
  const toastTimer = useRef(null);
  const inputRef = useRef(null);

  const showToast = useCallback((text) => {
    setToast({ show: true, text });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(
      () => setToast({ show: false, text: "" }),
      1900
    );
  }, []);

  const handleCopied = useCallback(
    (code) => showToast(`${code} copied to clipboard`),
    [showToast]
  );

  useEffect(() => {
    let alive = true;
    fetchPromoDeals()
      .then((data) => {
        if (alive) setDeal(data);
      })
      .catch(() => {
        if (alive) setDeal(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
      clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !deal?.visible) return undefined;

    const nodes = root.querySelectorAll(`.${styles.reveal}`);
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((el) => el.classList.add(styles.in));
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.in);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    nodes.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [deal]);

  const closeModal = useCallback(() => {
    setModalShow(false);
    document.body.style.overflow = "";
    window.setTimeout(() => {
      setModalOpen(false);
      setOk(null);
      setMsg("");
      setInput("");
      setShake(false);
    }, 320);
  }, []);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => setModalShow(true));
    const t = setTimeout(() => inputRef.current?.focus(), 260);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [modalOpen, closeModal]);

  const activeCards = useMemo(() => deal?.activeCards || [], [deal]);
  const deskCodes = useMemo(() => deal?.deskCodes || [], [deal]);
  const single = activeCards.length === 1;

  const openModal = () => {
    setOk(null);
    setMsg("");
    setInput("");
    setShake(false);
    setModalOpen(true);
  };

  const handleRedeem = async (e) => {
    e.preventDefault();
    const code = input.trim().toUpperCase();
    if (!code) {
      setMsg("Please enter a code first.");
      setShake(false);
      requestAnimationFrame(() => setShake(true));
      return;
    }

    setSaving(true);
    setMsg("");
    try {
      const data = await checkCheckoutPromoCode(code);
      const prefs = readCheckoutPrefs();
      saveCheckoutPrefs({
        promoCode: data.promoCode?.name || code,
        deliveryZone: prefs.deliveryZone || "inside-dhaka",
      });
      setOk({
        code: data.promoCode?.name || code,
        text: `${data.discountLabel || "Discount"} saved for checkout. Open your cart to apply it.`,
      });
      showToast(`${code} ready for checkout`);
    } catch (error) {
      setMsg(
        error.message ||
          "This code is not a valid checkout promo code."
      );
      setShake(false);
      requestAnimationFrame(() => setShake(true));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PromoDealsSkeleton />;
  }

  if (!deal?.visible) {
    return null;
  }

  return (
    <>
      <section className={styles.promos} id="deals" ref={rootRef}>
        <svg
          className={`${styles.pawmark} ${styles.w1}`}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 12.5c-2.6 0-5.4 2.1-5.4 4.6 0 1.5 1.1 2.4 2.6 2.4 1.1 0 1.9-.5 2.8-.5s1.7.5 2.8.5c1.5 0 2.6-.9 2.6-2.4 0-2.5-2.8-4.6-5.4-4.6zM7.2 11c1.2 0 2.1-1.2 2.1-2.7S8.4 5.5 7.2 5.5 5 6.8 5 8.3 6 11 7.2 11zm9.6 0c1.2 0 2.2-1.2 2.2-2.7s-1-2.8-2.2-2.8-2.1 1.3-2.1 2.8.9 2.7 2.1 2.7zm-7.4-.6c1.1 0 2-1.1 2-2.5s-.9-2.6-2-2.6-2 1.2-2 2.6.9 2.5 2 2.5zm5.2 0c1.1 0 2-1.1 2-2.5s-.9-2.6-2-2.6-2 1.2-2 2.6.9 2.5 2 2.5z" />
        </svg>
        <svg
          className={`${styles.pawmark} ${styles.w2}`}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 12.5c-2.6 0-5.4 2.1-5.4 4.6 0 1.5 1.1 2.4 2.6 2.4 1.1 0 1.9-.5 2.8-.5s1.7.5 2.8.5c1.5 0 2.6-.9 2.6-2.4 0-2.5-2.8-4.6-5.4-4.6zM7.2 11c1.2 0 2.1-1.2 2.1-2.7S8.4 5.5 7.2 5.5 5 6.8 5 8.3 6 11 7.2 11zm9.6 0c1.2 0 2.2-1.2 2.2-2.7s-1-2.8-2.2-2.8-2.1 1.3-2.1 2.8.9 2.7 2.1 2.7zm-7.4-.6c1.1 0 2-1.1 2-2.5s-.9-2.6-2-2.6-2 1.2-2 2.6.9 2.5 2 2.5zm5.2 0c1.1 0 2-1.1 2-2.5s-.9-2.6-2-2.6-2 1.2-2 2.6.9 2.5 2 2.5z" />
        </svg>

        <div className={styles.wrap}>
          <div className={`${styles.head} ${styles.reveal}`}>
            <span className={styles.kicker}>{deal.sectionKicker}</span>
            <h2>{deal.sectionTitle}</h2>
            <p>{deal.sectionSubtitle}</p>
          </div>

          <div
            className={`${styles.tickets} ${single ? styles.ticketsSingle : ""}`}
          >
            {activeCards.map((card, index) => (
              <TicketCard
                key={card.key || card.code || index}
                card={card}
                variant={card.key || (index === 0 ? "A" : "B")}
                delay={index === 0 ? "0.05s" : "0.14s"}
                onCopied={handleCopied}
              />
            ))}
          </div>

          <div
            className={`${styles.deskW} ${styles.reveal}`}
            style={{ "--pt-d": "0.2s" }}
          >
            <div className={styles.desk}>
              <div className={styles.deskTxt}>
                <b>{deal.deskTitle}</b>
                <span>{deal.deskSubtitle}</span>
              </div>
              <div className={styles.deskCodes}>
                <span className={styles.hint}>This week&apos;s codes</span>
                {deskCodes.map((code) => (
                  <CodeButton
                    key={code}
                    code={code}
                    className={styles.codeS}
                    onCopied={handleCopied}
                  />
                ))}
              </div>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnO}`}
                onClick={openModal}
              >
                <TicketIcon />
                Redeem voucher
              </button>
            </div>
            <i className={styles.notch} />
            <i className={`${styles.notch} ${styles.nr}`} />
          </div>
        </div>
      </section>

      {modalOpen ? (
        <div
          className={`${styles.modal} ${modalShow ? styles.modalShow : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ptModalT"
        >
          <div className={styles.mback} onClick={closeModal} />
          <div className={styles.mtick}>
            <i className={`${styles.notch} ${styles.nt}`} />
            <i className={`${styles.notch} ${styles.nb}`} />
            <button
              type="button"
              className={styles.mx}
              onClick={closeModal}
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
            <div className={styles.mhead}>
              <span className={styles.kick}>
                <i />
                Voucher counter
              </span>
              <h3 id="ptModalT">Redeem a voucher</h3>
              <p>
                Enter a real checkout promo code. We&apos;ll save it for your
                cart and checkout.
              </p>
            </div>
            {!ok ? (
              <form className={styles.mform} onSubmit={handleRedeem}>
                <input
                  ref={inputRef}
                  className={`${styles.input} ${shake ? styles.shake : ""}`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g. PAWMON30"
                  aria-label="Voucher code"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  className={`${styles.btn} ${styles.btnO}`}
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Checking..." : "Apply"}
                </button>
              </form>
            ) : null}
            <div className={styles.mmsg} aria-live="polite">
              {msg}
            </div>
            {ok ? (
              <div className={styles.mok}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 12.5l2.6 2.6L16 9.5" />
                </svg>
                <b>{ok.code}</b>
                <span>{ok.text}</span>
                <Link href="/cart" className={`${styles.btn} ${styles.btnO}`}>
                  Go to cart
                </Link>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={closeModal}
                >
                  Done
                </button>
              </div>
            ) : null}
            <div
              className={`${styles.barcode} ${styles.mbar}`}
              aria-hidden="true"
            />
          </div>
        </div>
      ) : null}

      <div
        className={`${styles.toast} ${toast.show ? styles.toastShow : ""}`}
        role="status"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12.5l4 4L19 7" />
        </svg>
        <span>{toast.text}</span>
      </div>
    </>
  );
}
