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

function TopBarTrack({ ariaHidden = false }) {
  return (
    <div
      className="flex shrink-0 items-center gap-10 sm:gap-14 pr-10 sm:pr-14"
      aria-hidden={ariaHidden || undefined}
    >
      {topBarItems.map(({ text, icon: Icon }) => (
        <span
          key={text}
          className="flex shrink-0 items-center gap-2.5 text-xs font-medium opacity-95 sm:text-sm"
        >
          <Icon className="text-base text-white/90" aria-hidden />
          {text}
        </span>
      ))}
    </div>
  );
}

export default function TopBar() {
  return (
    <div className="overflow-hidden bg-main text-white">
      <div className="flex min-h-8 items-center sm:min-h-11">
        <div className="flex w-max animate-marquee whitespace-nowrap will-change-transform">
          <TopBarTrack />
          <TopBarTrack ariaHidden />
        </div>
      </div>
    </div>
  );
}
