export default function BrandLogo({ size = "md", showText = true, className = "" }) {
  const sizes = {
    xs: {
      iconWrap: "h-8 w-8 rounded-[9px]",
      icon: "h-5 w-5",
      text: "text-[17px]",
    },
    sm: {
      iconWrap: "h-11 w-11 rounded-2xl",
      icon: "h-8 w-8",
      text: "text-lg",
    },
    md: {
      iconWrap: "h-12 w-12 rounded-2xl",
      icon: "h-9 w-9",
      text: "text-[1.65rem]",
    },
    lg: {
      iconWrap: "h-12 w-12 rounded-2xl",
      icon: "h-9 w-9",
      text: "text-[2rem]",
    },
  };

  const config = sizes[size] || sizes.md;

  return (
    <div className={`flex items-center gap-3 text-main ${className}`}>
      <span
        className={`flex shrink-0 items-center justify-center bg-accentSoft ${config.iconWrap}`}
      >
        <svg
          className={`${config.icon} text-main`}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="7.2" cy="8" r="2.4" />
          <circle cx="12" cy="5.8" r="2.5" />
          <circle cx="16.8" cy="8" r="2.4" />
          <circle cx="18.4" cy="13.1" r="2.1" />
          <circle cx="5.6" cy="13.1" r="2.1" />
          <path d="M7.2 18.2c0-3.3 2.2-6 4.8-6s4.8 2.7 4.8 6c0 1.6-1.1 2.4-2.5 2.4-.8 0-1.5-.3-2.3-.3s-1.5.3-2.3.3c-1.4 0-2.5-.8-2.5-2.4Z" />
        </svg>
      </span>
      {showText ? (
        <div className="leading-none">
          <span className={`font-black tracking-[-0.04em] text-main ${config.text}`}>
            Paw
          </span>
          <span className={`font-black tracking-[-0.04em] text-accent ${config.text}`}>
            Tail
          </span>
        </div>
      ) : null}
    </div>
  );
}
