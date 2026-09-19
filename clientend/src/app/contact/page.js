"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import "./contact.css";

const STORES = [
  {
    id: "gulshan",
    name: "Gulshan Flagship",
    blurb: "House 42, Road 53, Gulshan 2, Dhaka 1212",
    hours: "10:00 – 21:00",
    phone: "01713-456701",
    tags: ["Nutrition desk", "Parking"],
    img: "/assets/store-gulshan.jpg",
    alt: "Interior of the Gulshan PawTail shop with forest-green shelves and a golden retriever",
    lat: 23.7947,
    lng: 90.4143,
    maps: "https://www.google.com/maps/dir/?api=1&destination=23.7947,90.4143",
  },
  {
    id: "dhanmondi",
    name: "Dhanmondi Studio",
    blurb: "House 15, Road 6, Dhanmondi, Dhaka 1205",
    hours: "10:00 – 21:00",
    phone: "01713-456702",
    tags: ["Grooming bar", "Click & collect"],
    img: "/assets/store-dhanmondi.jpg",
    alt: "PawTail Dhanmondi brick storefront with plants and an orange awning",
    lat: 23.7455,
    lng: 90.3748,
    maps: "https://www.google.com/maps/dir/?api=1&destination=23.7455,90.3748",
  },
  {
    id: "uttara",
    name: "Uttara Aqua & Avian",
    blurb: "Plot 7, Road 12, Sector 7, Uttara, Dhaka 1230",
    hours: "10:00 – 20:30",
    phone: "01713-456703",
    tags: ["Live plants", "Birds"],
    img: "/assets/store-uttara.jpg",
    alt: "Uttara PawTail studio with planted aquariums and hanging greenery",
    lat: 23.874,
    lng: 90.39,
    maps: "https://www.google.com/maps/dir/?api=1&destination=23.874,90.390",
  },
];

const FAQS = [
  {
    q: "How fast is delivery across Bangladesh?",
    a: "Dhaka and Gazipur usually arrive the next day; Chattogram, Sylhet, Rajshahi and Khulna in 2–3 days. Orders over ৳3500 ship free. Place before 4pm for same-day inside Dhaka (selected SKUs).",
  },
  {
    q: "Can I get nutrition advice before I buy?",
    a: "Yes — WhatsApp a photo of your pet and their current food. Store consults in Gulshan are free and take about 20 minutes. We never push a brand your animal doesn’t need.",
  },
  {
    q: "What is the return policy on food and accessories?",
    a: "Unopened food and sealed accessories can come back within 7 days with the invoice. Opened food is only exchangeable if we sent the wrong SKU. Toys with tags on are always welcome back.",
  },
  {
    q: "Do I need an appointment to visit a store?",
    a: "Walk-ins are welcome. Book ahead only if you want a nutrition consult or to try a specific prescription diet so we can hold stock. Dogs on lead and cats in carriers are both fine.",
  },
  {
    id: "track",
    q: "How do I track an order?",
    a: "Use Track Order in the top bar with your mobile number, or text the order ID to our WhatsApp. You’ll get a Pathao / Steadfast link as soon as a rider is assigned.",
  },
  {
    q: "Do you keep aquarium and bird supplies in every shop?",
    a: "Uttara is our Aqua & Avian studio — live plants, cycling kits, cages and cuttlebone. Gulshan and Dhanmondi keep a core fish-care and bird-food range; we can move stock between stores the same day.",
  },
];

const PETS = ["Dog", "Cat", "Fish", "Bird", "Small pet"];

export default function ContactPage() {
  const [selectedPet, setSelectedPet] = useState("Dog");
  const [activeStoreId, setActiveStoreId] = useState("gulshan");
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const mapContainerRef = useRef(null);

  // Initialize and update Leaflet Map
  const initMap = () => {
    if (typeof window === "undefined" || !window.L || !mapContainerRef.current) {
      return;
    }

    if (mapInstanceRef.current) return;

    try {
      const L = window.L;
      const map = L.map(mapContainerRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
      }).setView([23.8, 90.4], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      const customIcon = L.divIcon({
        className: "",
        html: `<div style="width:34px;height:34px;background:#173f31;border:3px solid #ee9322;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 6px 14px rgba(23,63,49,.25)"></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -28],
      });

      STORES.forEach((s) => {
        markersRef.current[s.id] = L.marker([s.lat, s.lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(
            `<strong>${s.name}</strong><br>${s.blurb}<br><a href="${s.maps}" target="_blank" rel="noopener">Get directions</a>`
          );
      });

      mapInstanceRef.current = map;

      if (markersRef.current.gulshan) {
        markersRef.current.gulshan.openPopup();
      }
    } catch (err) {
      console.warn("Leaflet init error:", err);
    }
  };

  useEffect(() => {
    if (window.L) {
      initMap();
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleStoreSelect = (storeId) => {
    setActiveStoreId(storeId);
    const store = STORES.find((s) => s.id === storeId);
    if (mapInstanceRef.current && store) {
      mapInstanceRef.current.flyTo([store.lat, store.lng], 15, {
        duration: 0.8,
      });
      if (markersRef.current[storeId]) {
        markersRef.current[storeId].openPopup();
      }
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2600);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    setIsSubmitted(true);
  };

  return (
    <div className="contact-page-root">
      {/* Leaflet CSS Link */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      {/* Leaflet Script */}
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        strategy="afterInteractive"
        onLoad={initMap}
      />

      <main id="top">
        {/* Hero Section */}
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <p className="eyebrow">Customer Care · Bangladesh</p>
              <h1>Get in touch</h1>
              <p className="lede">
                Have questions about your order, need nutritional advice for your
                pet, or want to visit our stores in Dhaka and beyond? We&apos;re
                here to help.
              </p>
            </div>
            <div className="hero-photo">
              <img
                src="/assets/hero-pets.jpg"
                alt="A golden retriever and a grey cat resting together on a cream sofa"
                width={500}
                height={340}
              />
              <div className="float-card">
                <span className="dot" aria-hidden="true"></span>
                <div>
                  Care team is online
                  <span>Typical reply in 12 minutes</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reach Cards */}
        <section className="reach" aria-label="Ways to reach us">
          <div className="wrap reach-grid">
            <a className="reach-card" href="tel:+8809606729825">
              <span className="reach-ico" aria-hidden="true">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M6.5 3.5h3l1.2 4-2 1.2a12 12 0 0 0 6.6 6.6l1.2-2 4 1.2v3A2 2 0 0 1 18.5 19 15 15 0 0 1 3.5 4a2 2 0 0 1 3-0.5z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <h3>Call the care desk</h3>
              <p>Order status, payments, and same-day Dhaka queries.</p>
              <strong>09606-729825</strong>
            </a>

            <a
              className="reach-card wa"
              href="https://wa.me/8801713456789"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="reach-ico" aria-hidden="true">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M5 19l1.2-4A8 8 0 1 1 8 19.2L5 19z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M9 10c.2 2.4 3.6 5.8 6 6"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <h3>WhatsApp a pet expert</h3>
              <p>
                Send a photo of the food bag, rash, or tank — we reply day and
                night.
              </p>
              <strong>+880 1713-456789</strong>
            </a>

            <a className="reach-card" href="mailto:care@pawtail.com">
              <span className="reach-ico" aria-hidden="true">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <rect
                    x="3.5"
                    y="5.5"
                    width="17"
                    height="13"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M4 7l8 6 8-6"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                </svg>
              </span>
              <h3>Email customer care</h3>
              <p>Best for invoices, wholesale, and written nutrition plans.</p>
              <strong>care@pawtail.com</strong>
            </a>

            <a className="reach-card" href="#stores">
              <span className="reach-ico" aria-hidden="true">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M4 10.5L12 4l8 6.5V20H4v-9.5z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 20v-6h4v6"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                </svg>
              </span>
              <h3>Visit a Dhaka store</h3>
              <p>Gulshan, Dhanmondi and Uttara — walk-ins welcome every day.</p>
              <strong>3 studios · open today</strong>
            </a>
          </div>
        </section>

        {/* Main Contact Block */}
        <section className="contact-block" id="message">
          <div className="wrap contact-grid">
            <div className="panel">
              <h2>Send us a message</h2>
              <p className="sub">
                Tell us about your pet and we will route you to orders, nutrition,
                or the nearest store team.
              </p>

              {!isSubmitted ? (
                <form id="contactForm" noValidate onSubmit={handleFormSubmit}>
                  <div className="form-row">
                    <div className="field">
                      <label htmlFor="name">Your name</label>
                      <input
                        id="name"
                        name="name"
                        autoComplete="name"
                        required
                        placeholder="Nusrat Rahman"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="phone">Mobile number</label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                        placeholder="01XXXXXXXXX"
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="email">
                      Email{" "}
                      <span style={{ fontWeight: 500, color: "var(--muted)" }}>
                        (optional)
                      </span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@email.com"
                    />
                  </div>
                  <div className="field">
                    <label>Your pet</label>
                    <div className="chips" id="petChips">
                      {PETS.map((pet) => (
                        <label
                          key={pet}
                          className={`chip ${selectedPet === pet ? "active" : ""}`}
                        >
                          <input
                            type="radio"
                            name="pet"
                            value={pet}
                            checked={selectedPet === pet}
                            onChange={() => setSelectedPet(pet)}
                          />
                          {pet}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="topic">How can we help?</label>
                    <select id="topic" name="topic" required defaultValue="">
                      <option value="" disabled>
                        Choose a topic
                      </option>
                      <option>Order & delivery</option>
                      <option>Nutrition advice</option>
                      <option>Product question</option>
                      <option>Visit a store</option>
                      <option>Returns & refunds</option>
                      <option>Wholesale / bulk</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="messageField">Message</label>
                    <textarea
                      id="messageField"
                      name="message"
                      required
                      placeholder="Share your order number, your pet's age and diet, or the store you'd like to visit…"
                    ></textarea>
                  </div>
                  <button className="submit" type="submit">
                    Send message
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M5 12h14M13 6l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <p className="fineprint">
                    We never share your details. Replies usually land within 2
                    hours, 8am–11pm. Urgent pet questions go straight to
                    WhatsApp.
                  </p>
                </form>
              ) : (
                <div className="form-success show" id="formSuccess">
                  <div className="check" aria-hidden="true">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M5 12.5l4.2 4.2L19 7.5"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h2>Message received</h2>
                  <p className="sub" style={{ marginBottom: 0 }}>
                    A PawTail care specialist will write back shortly. For
                    anything time-sensitive, WhatsApp us — our pet experts are on
                    24/7.
                  </p>
                </div>
              )}
            </div>

            <aside className="side-stack">
              <div className="hours">
                <h3>When we&apos;re around</h3>
                <div className="hours-row">
                  <span>Customer care</span>
                  <b>8:00 – 23:00, daily</b>
                </div>
                <div className="hours-row">
                  <span>Pet experts (WhatsApp)</span>
                  <b>24 hours</b>
                </div>
                <div className="hours-row">
                  <span>Gulshan & Dhanmondi</span>
                  <b>10:00 – 21:00</b>
                </div>
                <div className="hours-row">
                  <span>Uttara Aqua & Avian</span>
                  <b>10:00 – 20:30</b>
                </div>
                <div className="hours-row">
                  <span>Friday & Saturday</span>
                  <b>Stores till 22:00</b>
                </div>
                <div className="hours-note">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="8.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M12 8v5M12 16.2h.01"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>
                    During Eid we post shortened hours on WhatsApp status and
                    in-store. Same-day Dhaka delivery still runs until 6pm.
                  </span>
                </div>
              </div>

              <div className="hq">
                <img
                  src="/assets/store-dhanmondi.jpg"
                  alt="PawTail Dhanmondi storefront with an orange awning and bicycle out front"
                  width={400}
                  height={168}
                />
                <div className="hq-body">
                  <p className="eyebrow" style={{ marginBottom: 6 }}>
                    Head office
                  </p>
                  <h3>PawTail, Gulshan 2</h3>
                  <p>
                    House 42, Road 53, Gulshan 2, Dhaka 1212. Correspondence,
                    wholesale buying, and press sit with the flagship team.
                  </p>
                  <div className="hq-meta">
                    <span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                      </svg>
                      Next to Gulshan-2 circle, Level 1
                    </span>
                    <span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M4 6h16v12H4zM4 6l8 6 8-6"
                          stroke="currentColor"
                          strokeWidth="1.7"
                        />
                      </svg>
                      press@pawtail.com
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* Stores Section */}
        <section className="stores" id="stores">
          <div className="wrap">
            <div className="section-head">
              <div>
                <p className="eyebrow">Visit us</p>
                <h2>Three studios in Dhaka</h2>
              </div>
              <p>
                Pick up a trial bag, meet a nutritionist, or just let your dog
                choose a toy. Parking at every location.
              </p>
            </div>

            <div className="stores-layout">
              <div className="store-list" id="storeList">
                {STORES.map((s) => (
                  <button
                    key={s.id}
                    className={`store-card ${activeStoreId === s.id ? "active" : ""}`}
                    type="button"
                    onClick={() => handleStoreSelect(s.id)}
                  >
                    <img src={s.img} alt={s.alt} width={148} height={148} />
                    <div className="info">
                      <h3>{s.name}</h3>
                      <p>{s.blurb}</p>
                      <p style={{ marginTop: 6 }}>
                        {s.hours} · {s.phone}
                      </p>
                      <div className="meta">
                        {s.tags.map((t) => (
                          <span key={t} className="tag">
                            {t}
                          </span>
                        ))}
                        <a
                          className="tag"
                          href={s.maps}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Directions
                        </a>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="map-wrap">
                <div
                  id="map"
                  ref={mapContainerRef}
                  role="region"
                  aria-label="Map of PawTail stores in Dhaka"
                ></div>
                <div className="map-fallback" id="mapFallback">
                  Map needs a network connection. Use the store cards for
                  addresses and directions.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Expert Section */}
        <section className="expert" id="expert">
          <div className="wrap">
            <div className="expert-card">
              <div
                className="expert-media"
                role="img"
                aria-label="PawTail nutritionist kneeling with a ginger cat and a small white dog"
              />
              <div className="expert-copy">
                <p className="eyebrow">24/7 pet expert help</p>
                <h2>Not sure what to feed them? Ask Farzana.</h2>
                <p>
                  Our in-house nutritionists help with puppy plans, kidney diets,
                  aquarium cycling, and “my cat won’t eat this” moments. Share a
                  photo — you’ll hear back from a real person, not a bot.
                </p>
                <div className="expert-actions">
                  <a
                    className="btn-orange"
                    href="https://wa.me/8801713456789?text=Hi%20PawTail%2C%20I%20need%20nutrition%20advice%20for%20my%20pet."
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Chat on WhatsApp
                  </a>
                  <a className="btn-ghost" href="#message">
                    Book a store consult
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="faq" id="faq">
          <div className="wrap faq-grid">
            <div>
              <p className="eyebrow">Good to know</p>
              <h2 className="faq-title">Questions we hear every week</h2>
              <p className="faq-lede">
                Still stuck? Use the form or ping us on WhatsApp with your order
                number.
              </p>
            </div>
            <div>
              {FAQS.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={faq.q}
                    className={`faq-item ${isOpen ? "open" : ""}`}
                    id={faq.id}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFaqIndex(isOpen ? -1 : index)
                      }
                    >
                      {faq.q}
                      <svg
                        className="chev"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M6 9l6 6 6-6"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                    <div className="answer">{faq.a}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast show" role="status">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
