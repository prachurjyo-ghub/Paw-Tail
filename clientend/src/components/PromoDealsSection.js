"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./PromoDealsSection.module.css";

const VOUCHER_CODES = {
  PAWMON30: "30% off applied to your cart — happy monsoon!",
  FREESHIP: "Free delivery unlocked for this weekend.",
  NEWPAW500: "৳500 off your first box — welcome aboard!",
};

const END_OFFSET_MS = ((2 * 24 + 14) * 3600 + 36 * 60 + 52) * 1000;

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

export default function PromoDealsSection() {
  const rootRef = useRef(null);
  const [time, setTime] = useState({ d: "02", h: "14", m: "36", s: "52" });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalShow, setModalShow] = useState(false);
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");
  const [shake, setShake] = useState(false);
  const [ok, setOk] = useState(null);
  const [toast, setToast] = useState({ show: false, text: "" });
  const toastTimer = useRef(null);
  const endRef = useRef(0);
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
    return () => {
      document.body.style.overflow = "";
      clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    endRef.current = Date.now() + END_OFFSET_MS;
    const tick = () => {
      const s = Math.max(0, Math.floor((endRef.current - Date.now()) / 1000));
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
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

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
  }, []);

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

  const openModal = () => {
    setOk(null);
    setMsg("");
    setInput("");
    setShake(false);
    setModalOpen(true);
  };

  const handleRedeem = (e) => {
    e.preventDefault();
    const code = input.trim().toUpperCase();
    if (VOUCHER_CODES[code]) {
      setOk({ code, text: VOUCHER_CODES[code] });
      setMsg("");
      showToast(`${code} redeemed successfully`);
      return;
    }
    setMsg(
      code
        ? `Hmm, “${code}” isn't wagging any tails. Try PAWMON30.`
        : "Please enter a code first."
    );
    setShake(false);
    requestAnimationFrame(() => setShake(true));
  };

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
            <span className={styles.kicker}>Deals &amp; vouchers</span>
            <h2>Paw-some deals this week</h2>
            <p>
              Two limited-time treats and a voucher counter — tap a code to copy
              it, or redeem your own at the desk below.
            </p>
          </div>

          <div className={styles.tickets}>
            <div
              className={`${styles.tw} ${styles.wTicket1} ${styles.reveal}`}
              style={{ "--pt-d": "0.05s" }}
            >
              <div className={`${styles.ticket} ${styles.t1}`}>
                <div className={styles.main}>
                  <span className={styles.kick}>
                    <i />
                    Limited time · Monsoon deal
                  </span>
                  <h3>Monsoon Pet Fest</h3>
                  <p>
                    Rainy-day beds, flea care &amp; fishy favourites — up to{" "}
                    <b>30% off</b> storewide while the clouds play.
                  </p>
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
                  <Link
                    href="/categories"
                    className={`${styles.btn} ${styles.btnO}`}
                  >
                    Shop the sale
                    <ArrowIcon />
                  </Link>
                </div>
                <div className={styles.stub}>
                  <span className={styles.stubL}>Tap to copy</span>
                  <CodeButton code="PAWMON30" onCopied={handleCopied} />
                  <div className={styles.barcode} aria-hidden="true" />
                  <span className={styles.barcodeL}>PAW·MON·30</span>
                </div>
                <i className={styles.tear} aria-hidden="true" />
              </div>
              <i className={`${styles.notch} ${styles.nt}`} />
              <i className={`${styles.notch} ${styles.nb}`} />
              <div className={styles.stamp} aria-hidden="true">
                <svg className={styles.ring} viewBox="0 0 120 120">
                  <defs>
                    <path
                      id="ptCir1"
                      d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0"
                    />
                  </defs>
                  <text>
                    <textPath href="#ptCir1">
                      PAWTAIL DEAL • MONSOON FEST • PAWTAIL DEAL •
                    </textPath>
                  </text>
                </svg>
                <b>30%</b>
              </div>
            </div>

            <div
              className={`${styles.tw} ${styles.wTicket2} ${styles.reveal}`}
              style={{ "--pt-d": "0.14s" }}
            >
              <div className={`${styles.ticket} ${styles.t2}`}>
                <div className={styles.main}>
                  <span className={styles.kick}>
                    <i />
                    Weekend only
                  </span>
                  <h3>Free Shipping Weekend</h3>
                  <div className={styles.big}>
                    ৳0 <em>delivery</em>
                  </div>
                  <p>
                    Every order, every district — no minimum spend, Friday to
                    Sunday.
                  </p>
                  <div className={styles.spacer} />
                  <Link
                    href="/categories"
                    className={`${styles.btn} ${styles.btnG}`}
                  >
                    Order now
                    <ArrowIcon />
                  </Link>
                </div>
                <div className={styles.stub}>
                  <span className={styles.stubL}>Tap to copy</span>
                  <CodeButton code="FREESHIP" onCopied={handleCopied} />
                  <div className={styles.barcode} aria-hidden="true" />
                  <span className={styles.barcodeL}>PAW·SHIP·00</span>
                </div>
                <i className={styles.tear} aria-hidden="true" />
              </div>
              <i className={`${styles.notch} ${styles.nt}`} />
              <i className={`${styles.notch} ${styles.nb}`} />
              <div className={styles.stamp} aria-hidden="true">
                <svg className={styles.ring} viewBox="0 0 120 120">
                  <defs>
                    <path
                      id="ptCir2"
                      d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0"
                    />
                  </defs>
                  <text>
                    <textPath href="#ptCir2">
                      FREE DELIVERY • FRI–SUN • FREE DELIVERY •
                    </textPath>
                  </text>
                </svg>
                <b>FREE</b>
              </div>
            </div>
          </div>

          <div
            className={`${styles.deskW} ${styles.reveal}`}
            style={{ "--pt-d": "0.2s" }}
          >
            <div className={styles.desk}>
              <div className={styles.deskTxt}>
                <b>Have a voucher code?</b>
                <span>
                  Redeem it at the counter — discounts stack with sale prices.
                </span>
              </div>
              <div className={styles.deskCodes}>
                <span className={styles.hint}>This week&apos;s codes</span>
                <CodeButton
                  code="PAWMON30"
                  className={styles.codeS}
                  onCopied={handleCopied}
                />
                <CodeButton
                  code="FREESHIP"
                  className={styles.codeS}
                  onCopied={handleCopied}
                />
                <CodeButton
                  code="NEWPAW500"
                  className={styles.codeS}
                  onCopied={handleCopied}
                />
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
                Punch in your code — we&apos;ll wag-check it instantly and attach
                it to your cart.
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
                <button className={`${styles.btn} ${styles.btnO}`} type="submit">
                  Apply
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
