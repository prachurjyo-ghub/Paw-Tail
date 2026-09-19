"use client";

import {
  LuDog,
  LuCat,
  LuBird,
  LuFish,
  LuRabbit,
  LuTurtle,
  LuPawPrint,
  LuBone,
  LuCookie,
  LuFlower,
  LuFlower2,
  LuLeaf,
  LuSprout,
  LuHeart,
  LuStethoscope,
  LuSparkles,
  LuBath,
  LuDroplets,
  LuToyBrick,
  LuTag,
  LuShieldCheck,
  LuFeather,
  LuHouse,
  LuShoppingBag,
  LuPackage,
  LuTrophy,
  LuBug,
} from "react-icons/lu";

// Custom Minimal Vector Icon for Hamster / Small Pet
function SmallPetIcon({ className = "w-8 h-8", strokeWidth = 1.8 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6.5 5.5C5 5.5 4 6.8 4 8.5c0 1.2.6 2.2 1.5 2.7" />
      <path d="M17.5 5.5C19 5.5 20 6.8 20 8.5c0 1.2-.6 2.2-1.5 2.7" />
      <path d="M4.5 13C4.5 8.5 7.5 6.5 12 6.5s7.5 2 7.5 6.5c0 4-2.8 6.5-7.5 6.5S4.5 17 4.5 13Z" />
      <circle cx="9" cy="12" r="0.9" fill="currentColor" />
      <circle cx="15" cy="12" r="0.9" fill="currentColor" />
      <path d="M11.2 14.5h1.6" />
      <path d="M12 14.5v1.2c-.6.8-1.2.8-1.5.8" />
      <path d="M12 15.7c.6 0 1.2 0 1.5-.8" />
      <path d="M6 14.5H4" />
      <path d="M20 14.5h-2" />
    </svg>
  );
}

// Custom Minimal Vector Icon for Camellia / Botanical
function CamelliaIcon({ className = "w-8 h-8", strokeWidth = 1.8 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5" />
      <path d="M12 7.5V3" />
      <path d="M7.5 12H3" />
      <path d="M16.5 12H21" />
      <path d="M12 16.5V21" />
    </svg>
  );
}

export const ICON_MAP = {
  // Animals
  dog: LuDog,
  cat: LuCat,
  bird: LuBird,
  fish: LuFish,
  rabbit: LuRabbit,
  "small-pets": SmallPetIcon,
  reptile: LuTurtle,
  turtle: LuTurtle,
  horse: LuPawPrint,
  bug: LuBug,
  paw: LuPawPrint,

  // Botanical & Flowers
  camellia: CamelliaIcon,
  flower: LuFlower2,
  flower2: LuFlower,
  plant: LuSprout,
  sprout: LuSprout,
  leaf: LuLeaf,
  feather: LuFeather,

  // Food & Nutrition
  bone: LuBone,
  cookie: LuCookie,
  treat: LuCookie,

  // Care & Wellness
  heart: LuHeart,
  health: LuHeart,
  stethoscope: LuStethoscope,
  vet: LuStethoscope,
  sparkles: LuSparkles,
  grooming: LuSparkles,
  bath: LuBath,
  wash: LuBath,
  droplets: LuDroplets,
  shield: LuShieldCheck,

  // Supplies & Habitat
  toy: LuToyBrick,
  tag: LuTag,
  collar: LuTag,
  house: LuHouse,
  cage: LuHouse,
  "shopping-bag": LuShoppingBag,
  package: LuPackage,
  trophy: LuTrophy,
};

export const AVAILABLE_ICONS = [
  // Animals
  { id: "dog", label: "Dog", category: "animals", keywords: ["dog", "puppy", "canine", "hound", "bark"] },
  { id: "cat", label: "Cat", category: "animals", keywords: ["cat", "kitten", "feline", "kitty", "meow"] },
  { id: "bird", label: "Bird", category: "animals", keywords: ["bird", "parrot", "avian", "fly", "feather"] },
  { id: "fish", label: "Fish", category: "animals", keywords: ["fish", "aquarium", "aquatic", "swimming", "goldfish"] },
  { id: "rabbit", label: "Rabbit", category: "animals", keywords: ["rabbit", "bunny", "hare"] },
  { id: "small-pets", label: "Small Pets", category: "animals", keywords: ["smallpet", "hamster", "guineapig", "ferret", "rodent", "mouse"] },
  { id: "reptile", label: "Reptile / Turtle", category: "animals", keywords: ["reptile", "turtle", "lizard", "tortoise", "snake"] },
  { id: "horse", label: "Horse", category: "animals", keywords: ["horse", "pony", "equine", "stallion"] },
  { id: "bug", label: "Insects & Feed", category: "animals", keywords: ["bug", "insect", "worm", "cricket", "feed"] },
  { id: "paw", label: "Paw Print", category: "animals", keywords: ["paw", "pet", "animal", "print", "footprint"] },

  // Botanical & Nature
  { id: "camellia", label: "Camellia", category: "botanical", keywords: ["camellia", "flower", "floral", "bloom", "tea"] },
  { id: "flower", label: "Flower", category: "botanical", keywords: ["flower", "rose", "blossom", "flora"] },
  { id: "plant", label: "Plant / Sprout", category: "botanical", keywords: ["plant", "sprout", "seedling", "garden", "grow"] },
  { id: "leaf", label: "Leaf", category: "botanical", keywords: ["leaf", "nature", "organic", "natural", "herbal"] },
  { id: "feather", label: "Feather", category: "botanical", keywords: ["feather", "light", "wing", "plume"] },

  // Food & Nutrition
  { id: "bone", label: "Bone / Chew", category: "food", keywords: ["bone", "treat", "chew", "dogfood"] },
  { id: "cookie", label: "Treats / Biscuit", category: "food", keywords: ["cookie", "biscuit", "treat", "snack", "crunch"] },

  // Care & Wellness
  { id: "heart", label: "Health & Care", category: "care", keywords: ["heart", "health", "care", "wellness", "love"] },
  { id: "stethoscope", label: "Veterinary", category: "care", keywords: ["stethoscope", "vet", "medical", "clinic", "doctor", "health"] },
  { id: "sparkles", label: "Grooming & Spa", category: "care", keywords: ["sparkles", "groom", "grooming", "clean", "shine", "spa"] },
  { id: "bath", label: "Bath & Wash", category: "care", keywords: ["bath", "wash", "shampoo", "soap", "clean"] },
  { id: "droplets", label: "Drops & Care", category: "care", keywords: ["droplets", "water", "drops", "liquid", "oil", "lotion"] },
  { id: "shield", label: "Protection", category: "care", keywords: ["shield", "flea", "tick", "protect", "defense"] },

  // Supplies & Habitat
  { id: "toy", label: "Toys & Play", category: "supplies", keywords: ["toy", "play", "game", "brick", "ball"] },
  { id: "tag", label: "Collars & Tags", category: "supplies", keywords: ["tag", "collar", "leash", "accessory", "badge"] },
  { id: "house", label: "Habitat / Cage", category: "supplies", keywords: ["house", "cage", "habitat", "bed", "kennel", "home"] },
  { id: "shopping-bag", label: "Supplies & Gear", category: "supplies", keywords: ["shopping-bag", "bag", "store", "supplies", "shop"] },
  { id: "package", label: "Packages & Packs", category: "supplies", keywords: ["package", "box", "pack", "bundle"] },
  { id: "trophy", label: "Premium / Award", category: "supplies", keywords: ["trophy", "premium", "award", "best", "winner"] },
];

export const findIconMatch = (text = "") => {
  const query = String(text || "").toLowerCase().trim().replace(/[-_\s]+/g, "");
  if (!query) return null;

  for (const item of AVAILABLE_ICONS) {
    if (item.id === query || item.label.toLowerCase().replace(/[-_\s]+/g, "") === query) {
      return item.id;
    }
    if (item.keywords.some((k) => query.includes(k) || k.includes(query))) {
      return item.id;
    }
  }
  return null;
};

const normalizeKey = (key = "") => {
  const clean = String(key || "").toLowerCase().trim().replace(/[-_\s]+/g, "");
  if (clean.endsWith("s") && clean.length > 3 && !clean.endsWith("ss")) {
    return clean.slice(0, -1);
  }
  return clean;
};

export default function CategoryIcon({
  icon,
  slug,
  name,
  className = "w-8 h-8",
  strokeWidth = 1.8,
}) {
  const explicitKey = String(icon || "").toLowerCase().trim();
  const matchedKey = explicitKey && explicitKey !== "🐾" && ICON_MAP[explicitKey] ? explicitKey : null;

  const key = normalizeKey(matchedKey || slug || name);
  const autoMatch = !matchedKey ? findIconMatch(slug || name) : null;
  const effectiveKey = matchedKey || autoMatch || key;

  const IconComponent = ICON_MAP[effectiveKey] || LuPawPrint;

  return <IconComponent className={className} strokeWidth={strokeWidth} />;
}
