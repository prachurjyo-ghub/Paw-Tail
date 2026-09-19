import {
  HiBolt,
  HiCurrencyDollar,
  HiMapPin,
  HiShieldCheck,
  HiTruck,
} from "react-icons/hi2";
import { BiSupport } from "react-icons/bi";

import Container from "@/components/Container";

const benefits = [
  {
    title: "1 Day Delivery",
    description: "Fast delivery within 24 hours",
    icon: HiTruck,
    iconClassName: "text-[#173f31]",
    bgClassName: "bg-[#e6f3ec]",
  },
  {
    title: "Instant Delivery",
    description: "Same day delivery available",
    icon: HiBolt,
    iconClassName: "text-[#ee9322]",
    bgClassName: "bg-[#fdf3e6]",
  },
  {
    title: "Lower Prices",
    description: "Best prices guaranteed",
    icon: HiCurrencyDollar,
    iconClassName: "text-[#173f31]",
    bgClassName: "bg-[#e6f3ec]",
  },
  {
    title: "Outside Dhaka",
    description: "Nationwide coverage",
    icon: HiMapPin,
    iconClassName: "text-[#ee9322]",
    bgClassName: "bg-[#fdf3e6]",
  },
  {
    title: "Secure Payment",
    description: "100% secure transactions",
    icon: HiShieldCheck,
    iconClassName: "text-[#173f31]",
    bgClassName: "bg-[#e6f3ec]",
  },
  {
    title: "24/7 Support",
    description: "Always here to help you",
    icon: BiSupport,
    iconClassName: "text-[#ee9322]",
    bgClassName: "bg-[#fdf3e6]",
  },
];

export default function WhyChooseUs() {
  return (
    <section className="bg-white border-y border-neutral-100 py-6 sm:py-8 lg:py-10">
      <Container>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
          {benefits.map(
            ({
              title,
              description,
              icon: Icon,
              iconClassName,
              bgClassName,
            }) => (
              <div
                key={title}
                className="flex flex-col items-start gap-2.5 rounded-2xl bg-[#fbf7f1] p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4 transition-transform duration-300 hover:-translate-y-0.5"
              >
                <div
                  className={`flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl ${bgClassName}`}
                >
                  <Icon className={`text-lg sm:text-2xl ${iconClassName}`} />
                </div>
                <div>
                  <h3 className="text-[12px] sm:text-[14px] font-extrabold leading-tight text-[#173f31]">
                    {title}
                  </h3>
                  <p className="mt-0.5 text-[10px] sm:text-[12px] font-medium leading-snug text-[#5d6b65]">
                    {description}
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </Container>
    </section>
  );
}
