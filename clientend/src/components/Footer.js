import Link from "next/link";
import {
  FaFacebookF,
  FaInstagram,
  FaTwitter,
  FaYoutube,
} from "react-icons/fa";
import { HiEnvelope, HiMapPin, HiPhone } from "react-icons/hi2";

import Container from "@/components/Container";

const quickLinks = [
  { label: "About Us", href: "/#about" },
  { label: "Contact Us", href: "/contact" },
  { label: "My Profile", href: "/profile" },
  { label: "Order History", href: "/profile?tab=orders" },
];

const policyLinks = [
  { label: "Privacy Policy", href: "/#privacy" },
  { label: "Terms & Conditions", href: "/#terms" },
  { label: "Return Policy", href: "/contact#faq" },
  { label: "Shipping Policy", href: "/contact#faq" },
  { label: "FAQ", href: "/contact#faq" },
];

const socialLinks = [
  { icon: FaFacebookF, href: "https://facebook.com", label: "Facebook" },
  { icon: FaInstagram, href: "https://instagram.com", label: "Instagram" },
  { icon: FaTwitter, href: "https://twitter.com", label: "Twitter" },
  { icon: FaYoutube, href: "https://youtube.com", label: "YouTube" },
];

const renderLinks = (items) =>
  items.map((item) => (
    <li key={item.label}>
      <Link
        href={item.href}
        className="text-sm font-semibold text-white/75 transition-colors duration-300 hover:text-white lg:text-base"
      >
        {item.label}
      </Link>
    </li>
  ));

export default function Footer() {
  return (
    <footer className="bg-main text-white">
      <Container>
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 py-9 lg:grid-cols-[1.25fr_1fr_1fr_1.35fr] lg:gap-12 lg:py-16">
          <div className="col-span-2 max-w-md lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-sm font-black text-white shadow-md shadow-accent/20 lg:h-12 lg:w-12">
                🐾
              </span>
              <span className="text-xl font-black text-white lg:text-2xl">PawTail</span>
            </Link>

            <p className="mt-4 max-w-sm text-sm font-semibold leading-6 text-white/75 lg:mt-7 lg:text-base lg:leading-8">
              Your trusted partner for all pet care needs in Bangladesh. We provide quality
              products, expert nutrition advice, and fast nationwide delivery.
            </p>

            <div className="mt-4 flex items-center gap-3 lg:mt-6 lg:gap-4">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 lg:h-10 lg:w-10"
                >
                  <Icon className="text-base" />
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-base font-black lg:text-xl">Quick Links</h3>
            <ul className="mt-3 space-y-2.5 lg:mt-7 lg:space-y-4">
              {renderLinks(quickLinks)}
            </ul>
          </div>

          <div>
            <h3 className="text-base font-black lg:text-xl">Policies</h3>
            <ul className="mt-3 space-y-2.5 lg:mt-7 lg:space-y-4">
              {renderLinks(policyLinks)}
            </ul>
          </div>

          <div className="col-span-2 lg:col-span-1">
            <h3 className="text-base font-black lg:text-xl">Contact Us</h3>
            <ul className="mt-3 space-y-3 text-sm font-semibold text-white/75 lg:mt-7 lg:space-y-5 lg:text-base">
              <li className="flex items-start gap-3 lg:gap-4">
                <HiMapPin className="mt-1 shrink-0 text-lg text-accent" />
                <span>House 18, Road 113, Gulshan-2, Dhaka-1212, Bangladesh</span>
              </li>
              <li className="flex items-center gap-3 lg:gap-4">
                <HiPhone className="shrink-0 text-lg text-accent" />
                <a href="tel:+8809612729824" className="hover:text-white transition-colors">
                  +880 9612-729824
                </a>
              </li>
              <li className="flex items-center gap-3 lg:gap-4">
                <HiEnvelope className="shrink-0 text-lg text-accent" />
                <a href="mailto:care@pawtail.com.bd" className="hover:text-white transition-colors">
                  care@pawtail.com.bd
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 py-4 text-xs font-semibold text-white/75 sm:flex-row sm:items-center sm:justify-between lg:gap-4 lg:py-7 lg:text-sm">
          <p>&copy; 2026 PawTail. All rights reserved.</p>
          <p>
            Crafted by{" "}
            <span className="font-black text-white">Golam Azizul Hakim Prachurjyo</span>
          </p>
        </div>
      </Container>
    </footer>
  );
}
