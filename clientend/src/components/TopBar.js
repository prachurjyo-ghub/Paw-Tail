import Container from "@/components/Container";
import {
  HiOutlineMapPin,
  HiOutlineTruck,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCube,
} from "react-icons/hi2";

const topBarItems = [
  {
    text: "Delivering across Bangladesh",
    icon: HiOutlineMapPin,
  },
  {
    text: "Free shipping on orders over \u09F33500",
    icon: HiOutlineTruck,
  },
  {
    text: "24/7 Pet Expert Help",
    icon: HiOutlineChatBubbleLeftRight,
  },
  {
    text: "Track Order",
    icon: HiOutlineCube,
  },
];

export default function TopBar() {
  return (
    <div className="bg-main text-white overflow-hidden">
      <Container>
        <div className="flex min-h-8 sm:min-h-11 items-center gap-4 text-xs sm:text-sm font-medium whitespace-nowrap">
          <div className="flex w-full animate-marquee sm:animate-none sm:w-auto items-center gap-6 sm:gap-4 justify-start sm:justify-between">
            {topBarItems.map(({ text, icon: Icon }) => (
              <span key={text} className="flex items-center gap-2 opacity-95 shrink-0">
                <Icon className="text-base text-white/90" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}
