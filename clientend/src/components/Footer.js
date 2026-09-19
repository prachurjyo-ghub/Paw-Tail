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
        className="text-base font-semibold text-white/75 transition-colors duration-300 hover:text-white"
      >
        {item.label}
      </Link>
    </li>
  ));

export default function Footer() {
  return (
    <footer className="bg-main text-white">
      <Container>
        <div className="grid gap-12 py-16 lg:grid-cols-[1.25fr_1fr_1fr_1.35fr]">
          <div className="max-w-md">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-sm font-black text-white shadow-md shadow-accent/20">
                🐾
              </span>
              <span className="text-2xl font-black text-white">PawTail</span>
            </Link>

            <p className="mt-7 max-w-sm text-base font-semibold leading-8 text-white/75">
              Your trusted partner for all pet care needs in Bangladesh. We provide quality
              products, expert nutrition advice, and fast nationwide delivery.
            </p>

            <div className="mt-6 flex items-center gap-4">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20"
                >
                  <Icon className="text-base" />
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black">Quick Links</h3>
            <ul className="mt-7 space-y-4">{renderLinks(quickLinks)}</ul>
          </div>

          <div>
            <h3 className="text-xl font-black">Policies</h3>
            <ul className="mt-7 space-y-4">{renderLinks(policyLinks)}</ul>
          </div>

          <div>
            <h3 className="text-xl font-black">Contact Us</h3>
            <ul className="mt-7 space-y-5 text-base font-semibold text-white/75">
              <li className="flex items-start gap-4">
                <HiMapPin className="mt-1 shrink-0 text-lg text-accent" />
                <span>House 18, Road 113, Gulshan-2, Dhaka-1212, Bangladesh</span>
              </li>
              <li className="flex items-center gap-4">
                <HiPhone className="shrink-0 text-lg text-accent" />
                <a href="tel:+8809612729824" className="hover:text-white transition-colors">
                  +880 9612-729824
                </a>
              </li>
              <li className="flex items-center gap-4">
                <HiEnvelope className="shrink-0 text-lg text-accent" />
                <a href="mailto:care@pawtail.com.bd" className="hover:text-white transition-colors">
                  care@pawtail.com.bd
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 py-7 text-sm font-semibold text-white/75 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 PawTail. All rights reserved.</p>
          <p>
            Powered by <span className="font-black text-white">PetTech Solutions</span>
          </p>
        </div>
      </Container>
    </footer>
  );
}
