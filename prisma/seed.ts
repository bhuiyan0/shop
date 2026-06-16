import { PrismaClient, Role } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { toPoisha } from "../src/lib/money";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

// Must match the "salt:hash" format expected by src/lib/crypto.ts verifyPassword.
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

// Topical placeholder photos; `lock` keeps them stable across reseeds.
const img = (keyword: string, lock: number) =>
  `https://loremflickr.com/600/600/${keyword}?lock=${lock}`;

type Variant = {
  sku: string;
  nameEn: string;
  nameBn: string;
  priceTk: number;
  stock: number;
};
type SeedProduct = {
  slug: string;
  nameEn: string;
  nameBn: string;
  descriptionEn: string;
  descriptionBn: string;
  comparePriceTk?: number;
  categorySlug: string;
  keyword: string;
  lock: number;
  variants: Variant[];
};

// Top-level parent categories (no products attach directly — products live on
// the leaf subcategories below).
const parents = [
  { slug: "food-staples", nameEn: "Food & Staples", nameBn: "খাদ্য ও মুদিপণ্য", keyword: "groceries", lock: 90 },
  { slug: "fresh-food", nameEn: "Fresh Food", nameBn: "তাজা খাবার", keyword: "vegetables,fresh", lock: 91 },
  { slug: "snacks-beverages", nameEn: "Snacks & Beverages", nameBn: "স্ন্যাকস ও পানীয়", keyword: "snacks", lock: 92 },
  { slug: "frozen-bakery", nameEn: "Frozen & Bakery", nameBn: "ফ্রোজেন ও বেকারি", keyword: "bakery", lock: 93 },
  { slug: "home-care", nameEn: "Home & Care", nameBn: "গৃহ ও যত্ন", keyword: "cleaning", lock: 94 },
];

// Subcategory → parent slug.
const parentOf: Record<string, string> = {
  "rice-grains": "food-staples",
  "cooking-oil": "food-staples",
  "lentils-pulses": "food-staples",
  "spices-masala": "food-staples",
  "sugar-sweeteners": "food-staples",
  "noodles-pasta": "food-staples",
  "sauces-condiments": "food-staples",
  "fresh-produce": "fresh-food",
  "meat-fish": "fresh-food",
  "dairy-eggs": "fresh-food",
  "snacks-biscuits": "snacks-beverages",
  beverages: "snacks-beverages",
  "breakfast-cereal": "snacks-beverages",
  "nuts-dry-fruits": "snacks-beverages",
  "frozen-foods": "frozen-bakery",
  bakery: "frozen-bakery",
  "household-cleaning": "home-care",
  "personal-care": "home-care",
  "baby-care": "home-care",
};

const categories = [
  { slug: "rice-grains", nameEn: "Rice & Grains", nameBn: "চাল ও দানাশস্য", keyword: "rice", lock: 101 },
  { slug: "cooking-oil", nameEn: "Cooking Oil", nameBn: "রান্নার তেল", keyword: "oil", lock: 102 },
  { slug: "lentils-pulses", nameEn: "Lentils & Pulses", nameBn: "ডাল", keyword: "lentils", lock: 103 },
  { slug: "spices-masala", nameEn: "Spices & Masala", nameBn: "মসলা", keyword: "spices", lock: 104 },
  { slug: "snacks-biscuits", nameEn: "Snacks & Biscuits", nameBn: "স্ন্যাকস ও বিস্কুট", keyword: "biscuits", lock: 105 },
  { slug: "beverages", nameEn: "Beverages", nameBn: "পানীয়", keyword: "tea", lock: 106 },
  { slug: "dairy-eggs", nameEn: "Dairy & Eggs", nameBn: "দুধ ও ডিম", keyword: "milk", lock: 107 },
  { slug: "fresh-produce", nameEn: "Fresh Produce", nameBn: "তাজা সবজি", keyword: "vegetables", lock: 108 },
  { slug: "household-cleaning", nameEn: "Household & Cleaning", nameBn: "গৃহস্থালি ও পরিষ্কার", keyword: "cleaning", lock: 109 },
  { slug: "bakery", nameEn: "Bakery", nameBn: "বেকারি", keyword: "bread", lock: 110 },
  { slug: "breakfast-cereal", nameEn: "Breakfast & Cereal", nameBn: "ব্রেকফাস্ট ও সিরিয়াল", keyword: "cereal", lock: 111 },
  { slug: "meat-fish", nameEn: "Meat & Fish", nameBn: "মাংস ও মাছ", keyword: "meat", lock: 112 },
  { slug: "frozen-foods", nameEn: "Frozen Foods", nameBn: "ফ্রোজেন খাবার", keyword: "frozen", lock: 113 },
  { slug: "sauces-condiments", nameEn: "Sauces & Condiments", nameBn: "সস ও কন্ডিমেন্ট", keyword: "sauce", lock: 114 },
  { slug: "sugar-sweeteners", nameEn: "Sugar & Sweeteners", nameBn: "চিনি ও মিষ্টিকারক", keyword: "sugar", lock: 115 },
  { slug: "noodles-pasta", nameEn: "Noodles & Pasta", nameBn: "নুডলস ও পাস্তা", keyword: "noodles", lock: 116 },
  { slug: "baby-care", nameEn: "Baby Care", nameBn: "শিশু পণ্য", keyword: "baby", lock: 117 },
  { slug: "personal-care", nameEn: "Personal Care", nameBn: "ব্যক্তিগত যত্ন", keyword: "soap", lock: 118 },
  { slug: "nuts-dry-fruits", nameEn: "Nuts & Dry Fruits", nameBn: "বাদাম ও শুকনা ফল", keyword: "nuts", lock: 119 },
];

const products: SeedProduct[] = [
  // --- Rice & Grains ---
  {
    slug: "miniket-rice", nameEn: "Miniket Rice", nameBn: "মিনিকেট চাল",
    descriptionEn: "Premium fine-grain miniket rice, cleaned and ready to cook.",
    descriptionBn: "প্রিমিয়াম সরু দানার মিনিকেট চাল, পরিষ্কার ও রান্নার জন্য প্রস্তুত।",
    comparePriceTk: 410, categorySlug: "rice-grains", keyword: "rice", lock: 201,
    variants: [
      { sku: "RICE-MIN-1", nameEn: "1 kg", nameBn: "১ কেজি", priceTk: 80, stock: 120 },
      { sku: "RICE-MIN-5", nameEn: "5 kg", nameBn: "৫ কেজি", priceTk: 385, stock: 60 },
      { sku: "RICE-MIN-25", nameEn: "25 kg", nameBn: "২৫ কেজি", priceTk: 1850, stock: 20 },
    ],
  },
  {
    slug: "najirshail-rice", nameEn: "Najirshail Rice", nameBn: "নাজিরশাইল চাল",
    descriptionEn: "Aromatic najirshail rice, ideal for everyday meals.",
    descriptionBn: "সুগন্ধি নাজিরশাইল চাল, প্রতিদিনের খাবারের জন্য উপযুক্ত।",
    categorySlug: "rice-grains", keyword: "rice,grain", lock: 203,
    variants: [
      { sku: "RICE-NAZ-5", nameEn: "5 kg", nameBn: "৫ কেজি", priceTk: 420, stock: 50 },
      { sku: "RICE-NAZ-25", nameEn: "25 kg", nameBn: "২৫ কেজি", priceTk: 2050, stock: 15 },
    ],
  },
  {
    slug: "atta-flour", nameEn: "Whole Wheat Atta", nameBn: "আটা",
    descriptionEn: "Stone-ground whole wheat flour for soft rutis and parathas.",
    descriptionBn: "নরম রুটি ও পরোটার জন্য পাথরে ভাঙা আটা।",
    categorySlug: "rice-grains", keyword: "flour,wheat", lock: 205,
    variants: [
      { sku: "ATTA-1", nameEn: "1 kg", nameBn: "১ কেজি", priceTk: 60, stock: 90 },
      { sku: "ATTA-2", nameEn: "2 kg", nameBn: "২ কেজি", priceTk: 115, stock: 70 },
    ],
  },

  // --- Cooking Oil ---
  {
    slug: "soybean-oil", nameEn: "Soybean Oil", nameBn: "সয়াবিন তেল",
    descriptionEn: "Refined soybean oil, fortified with vitamins A & D.",
    descriptionBn: "পরিশোধিত সয়াবিন তেল, ভিটামিন এ ও ডি সমৃদ্ধ।",
    comparePriceTk: 850, categorySlug: "cooking-oil", keyword: "oil,bottle", lock: 207,
    variants: [
      { sku: "OIL-SOY-1", nameEn: "1 L", nameBn: "১ লিটার", priceTk: 165, stock: 100 },
      { sku: "OIL-SOY-5", nameEn: "5 L", nameBn: "৫ লিটার", priceTk: 810, stock: 40 },
    ],
  },
  {
    slug: "mustard-oil", nameEn: "Mustard Oil", nameBn: "সরিষার তেল",
    descriptionEn: "Pungent cold-pressed mustard oil for authentic flavour.",
    descriptionBn: "ঝাঁঝালো কোল্ড-প্রেসড সরিষার তেল, খাঁটি স্বাদের জন্য।",
    categorySlug: "cooking-oil", keyword: "oil", lock: 209,
    variants: [
      { sku: "OIL-MUS-500", nameEn: "500 ml", nameBn: "৫০০ মিলি", priceTk: 140, stock: 80 },
      { sku: "OIL-MUS-1", nameEn: "1 L", nameBn: "১ লিটার", priceTk: 265, stock: 55 },
    ],
  },

  // --- Lentils & Pulses ---
  {
    slug: "masoor-dal", nameEn: "Masoor Dal (Red Lentil)", nameBn: "মসুর ডাল",
    descriptionEn: "Premium red lentils, quick-cooking and protein-rich.",
    descriptionBn: "প্রিমিয়াম মসুর ডাল, দ্রুত সিদ্ধ ও প্রোটিন সমৃদ্ধ।",
    categorySlug: "lentils-pulses", keyword: "lentils,red", lock: 211,
    variants: [
      { sku: "DAL-MAS-500", nameEn: "500 g", nameBn: "৫০০ গ্রাম", priceTk: 70, stock: 100 },
      { sku: "DAL-MAS-1", nameEn: "1 kg", nameBn: "১ কেজি", priceTk: 135, stock: 80 },
    ],
  },
  {
    slug: "mug-dal", nameEn: "Mug Dal", nameBn: "মুগ ডাল",
    descriptionEn: "Roasted moong dal, perfect for khichuri and soups.",
    descriptionBn: "ভাজা মুগ ডাল, খিচুড়ি ও স্যুপের জন্য উপযুক্ত।",
    categorySlug: "lentils-pulses", keyword: "lentils,beans", lock: 213,
    variants: [
      { sku: "DAL-MUG-500", nameEn: "500 g", nameBn: "৫০০ গ্রাম", priceTk: 95, stock: 70 },
      { sku: "DAL-MUG-1", nameEn: "1 kg", nameBn: "১ কেজি", priceTk: 185, stock: 45 },
    ],
  },
  {
    slug: "chola-dal", nameEn: "Chola Dal (Split Chickpea)", nameBn: "ছোলার ডাল",
    descriptionEn: "Split chickpea lentils for curries and festive dishes.",
    descriptionBn: "তরকারি ও উৎসবের পদের জন্য ছোলার ডাল।",
    categorySlug: "lentils-pulses", keyword: "chickpea,lentils", lock: 215,
    variants: [
      { sku: "DAL-CHO-1", nameEn: "1 kg", nameBn: "১ কেজি", priceTk: 120, stock: 60 },
    ],
  },

  // --- Spices & Masala ---
  {
    slug: "turmeric-powder", nameEn: "Turmeric Powder", nameBn: "হলুদ গুঁড়া",
    descriptionEn: "Pure ground turmeric with rich colour and aroma.",
    descriptionBn: "উজ্জ্বল রঙ ও সুগন্ধযুক্ত খাঁটি হলুদ গুঁড়া।",
    categorySlug: "spices-masala", keyword: "turmeric,spice", lock: 217,
    variants: [
      { sku: "SPC-TUR-200", nameEn: "200 g", nameBn: "২০০ গ্রাম", priceTk: 55, stock: 90 },
      { sku: "SPC-TUR-500", nameEn: "500 g", nameBn: "৫০০ গ্রাম", priceTk: 125, stock: 50 },
    ],
  },
  {
    slug: "chili-powder", nameEn: "Red Chili Powder", nameBn: "মরিচ গুঁড়া",
    descriptionEn: "Hot red chili powder, freshly ground.",
    descriptionBn: "ঝাল লাল মরিচ গুঁড়া, সদ্য ভাঙা।",
    categorySlug: "spices-masala", keyword: "chili,spice", lock: 219,
    variants: [
      { sku: "SPC-CHI-200", nameEn: "200 g", nameBn: "২০০ গ্রাম", priceTk: 70, stock: 85 },
      { sku: "SPC-CHI-500", nameEn: "500 g", nameBn: "৫০০ গ্রাম", priceTk: 160, stock: 45 },
    ],
  },
  {
    slug: "cumin-powder", nameEn: "Cumin Powder", nameBn: "জিরা গুঁড়া",
    descriptionEn: "Aromatic roasted cumin powder.",
    descriptionBn: "সুগন্ধি ভাজা জিরা গুঁড়া।",
    categorySlug: "spices-masala", keyword: "cumin,spice", lock: 221,
    variants: [
      { sku: "SPC-CUM-100", nameEn: "100 g", nameBn: "১০০ গ্রাম", priceTk: 85, stock: 60 },
    ],
  },
  {
    slug: "garam-masala", nameEn: "Garam Masala", nameBn: "গরম মসলা",
    descriptionEn: "Hand-blended garam masala for rich curries.",
    descriptionBn: "সমৃদ্ধ তরকারির জন্য হাতে মেশানো গরম মসলা।",
    categorySlug: "spices-masala", keyword: "spices,masala", lock: 223,
    variants: [
      { sku: "SPC-GAR-100", nameEn: "100 g", nameBn: "১০০ গ্রাম", priceTk: 95, stock: 50 },
    ],
  },

  // --- Snacks & Biscuits ---
  {
    slug: "marie-biscuit", nameEn: "Marie Biscuit", nameBn: "মেরি বিস্কুট",
    descriptionEn: "Light, crisp tea-time biscuits.",
    descriptionBn: "হালকা, মুচমুচে চায়ের সাথের বিস্কুট।",
    categorySlug: "snacks-biscuits", keyword: "biscuit", lock: 225,
    variants: [
      { sku: "SNK-MAR-1", nameEn: "Pack", nameBn: "প্যাক", priceTk: 35, stock: 150 },
    ],
  },
  {
    slug: "chanachur", nameEn: "Spicy Chanachur", nameBn: "ঝাল চানাচুর",
    descriptionEn: "Crunchy spicy chanachur mix.",
    descriptionBn: "মুচমুচে ঝাল চানাচুর মিক্স।",
    comparePriceTk: 90, categorySlug: "snacks-biscuits", keyword: "snack", lock: 227,
    variants: [
      { sku: "SNK-CHA-300", nameEn: "300 g", nameBn: "৩০০ গ্রাম", priceTk: 75, stock: 90 },
    ],
  },
  {
    slug: "potato-chips", nameEn: "Potato Chips", nameBn: "আলুর চিপস",
    descriptionEn: "Salted potato chips, crispy and fresh.",
    descriptionBn: "লবণাক্ত আলুর চিপস, মুচমুচে ও তাজা।",
    categorySlug: "snacks-biscuits", keyword: "chips", lock: 229,
    variants: [
      { sku: "SNK-CHP-100", nameEn: "100 g", nameBn: "১০০ গ্রাম", priceTk: 40, stock: 120 },
    ],
  },

  // --- Beverages ---
  {
    slug: "black-tea", nameEn: "Premium Black Tea", nameBn: "প্রিমিয়াম কালো চা",
    descriptionEn: "Strong, aromatic black tea leaves.",
    descriptionBn: "কড়া, সুগন্ধি কালো চা পাতা।",
    categorySlug: "beverages", keyword: "tea", lock: 231,
    variants: [
      { sku: "BEV-TEA-200", nameEn: "200 g", nameBn: "২০০ গ্রাম", priceTk: 120, stock: 80 },
      { sku: "BEV-TEA-500", nameEn: "500 g", nameBn: "৫০০ গ্রাম", priceTk: 280, stock: 40 },
    ],
  },
  {
    slug: "instant-coffee", nameEn: "Instant Coffee", nameBn: "ইনস্ট্যান্ট কফি",
    descriptionEn: "Smooth instant coffee granules.",
    descriptionBn: "মসৃণ ইনস্ট্যান্ট কফি দানা।",
    categorySlug: "beverages", keyword: "coffee", lock: 233,
    variants: [
      { sku: "BEV-COF-100", nameEn: "100 g", nameBn: "১০০ গ্রাম", priceTk: 330, stock: 50 },
    ],
  },
  {
    slug: "mango-juice", nameEn: "Mango Juice", nameBn: "আমের জুস",
    descriptionEn: "Refreshing mango juice, no added preservatives.",
    descriptionBn: "সতেজ আমের জুস, প্রিজারভেটিভ ছাড়া।",
    categorySlug: "beverages", keyword: "juice", lock: 235,
    variants: [
      { sku: "BEV-MNG-1", nameEn: "1 L", nameBn: "১ লিটার", priceTk: 110, stock: 70 },
    ],
  },

  // --- Dairy & Eggs ---
  {
    slug: "powder-milk", nameEn: "Full Cream Milk Powder", nameBn: "ফুল ক্রিম গুঁড়া দুধ",
    descriptionEn: "Rich full-cream milk powder for the whole family.",
    descriptionBn: "পুরো পরিবারের জন্য সমৃদ্ধ ফুল ক্রিম গুঁড়া দুধ।",
    comparePriceTk: 880, categorySlug: "dairy-eggs", keyword: "milk,powder", lock: 237,
    variants: [
      { sku: "DRY-MLK-500", nameEn: "500 g", nameBn: "৫০০ গ্রাম", priceTk: 420, stock: 60 },
      { sku: "DRY-MLK-1", nameEn: "1 kg", nameBn: "১ কেজি", priceTk: 820, stock: 35 },
    ],
  },
  {
    slug: "pure-ghee", nameEn: "Pure Ghee", nameBn: "খাঁটি ঘি",
    descriptionEn: "Aromatic pure cow ghee.",
    descriptionBn: "সুগন্ধি খাঁটি গাওয়া ঘি।",
    categorySlug: "dairy-eggs", keyword: "ghee,butter", lock: 239,
    variants: [
      { sku: "DRY-GHE-500", nameEn: "500 g", nameBn: "৫০০ গ্রাম", priceTk: 650, stock: 40 },
      { sku: "DRY-GHE-1", nameEn: "1 kg", nameBn: "১ কেজি", priceTk: 1250, stock: 20 },
    ],
  },
  {
    slug: "farm-eggs", nameEn: "Farm Eggs", nameBn: "ফার্মের ডিম",
    descriptionEn: "Fresh farm eggs, carefully packed.",
    descriptionBn: "তাজা ফার্মের ডিম, যত্নসহকারে প্যাক করা।",
    categorySlug: "dairy-eggs", keyword: "eggs", lock: 241,
    variants: [
      { sku: "DRY-EGG-12", nameEn: "Dozen", nameBn: "ডজন", priceTk: 140, stock: 100 },
      { sku: "DRY-EGG-30", nameEn: "Tray (30)", nameBn: "ট্রে (৩০)", priceTk: 330, stock: 50 },
    ],
  },

  // --- Fresh Produce ---
  {
    slug: "potato", nameEn: "Potato", nameBn: "আলু",
    descriptionEn: "Fresh, firm potatoes.",
    descriptionBn: "তাজা, শক্ত আলু।",
    categorySlug: "fresh-produce", keyword: "potato", lock: 243,
    variants: [
      { sku: "VEG-POT-1", nameEn: "1 kg", nameBn: "১ কেজি", priceTk: 35, stock: 200 },
      { sku: "VEG-POT-5", nameEn: "5 kg", nameBn: "৫ কেজি", priceTk: 160, stock: 80 },
    ],
  },
  {
    slug: "onion", nameEn: "Onion", nameBn: "পেঁয়াজ",
    descriptionEn: "Fresh red onions.",
    descriptionBn: "তাজা লাল পেঁয়াজ।",
    comparePriceTk: 70, categorySlug: "fresh-produce", keyword: "onion", lock: 245,
    variants: [
      { sku: "VEG-ONI-1", nameEn: "1 kg", nameBn: "১ কেজি", priceTk: 60, stock: 150 },
      { sku: "VEG-ONI-5", nameEn: "5 kg", nameBn: "৫ কেজি", priceTk: 285, stock: 60 },
    ],
  },
  {
    slug: "garlic", nameEn: "Garlic", nameBn: "রসুন",
    descriptionEn: "Aromatic fresh garlic.",
    descriptionBn: "সুগন্ধি তাজা রসুন।",
    categorySlug: "fresh-produce", keyword: "garlic", lock: 247,
    variants: [
      { sku: "VEG-GAR-250", nameEn: "250 g", nameBn: "২৫০ গ্রাম", priceTk: 75, stock: 90 },
      { sku: "VEG-GAR-500", nameEn: "500 g", nameBn: "৫০০ গ্রাম", priceTk: 140, stock: 60 },
    ],
  },

  // --- Household & Cleaning ---
  {
    slug: "detergent-powder", nameEn: "Detergent Powder", nameBn: "ডিটারজেন্ট পাউডার",
    descriptionEn: "Powerful detergent for bright, clean clothes.",
    descriptionBn: "উজ্জ্বল, পরিষ্কার কাপড়ের জন্য শক্তিশালী ডিটারজেন্ট।",
    comparePriceTk: 165, categorySlug: "household-cleaning", keyword: "detergent", lock: 249,
    variants: [
      { sku: "HH-DET-500", nameEn: "500 g", nameBn: "৫০০ গ্রাম", priceTk: 75, stock: 100 },
      { sku: "HH-DET-1", nameEn: "1 kg", nameBn: "১ কেজি", priceTk: 140, stock: 70 },
    ],
  },
  {
    slug: "dishwashing-liquid", nameEn: "Dishwashing Liquid", nameBn: "থালা ধোয়ার লিকুইড",
    descriptionEn: "Tough on grease, gentle on hands.",
    descriptionBn: "তেল-চর্বিতে কড়া, হাতে কোমল।",
    categorySlug: "household-cleaning", keyword: "soap,cleaning", lock: 251,
    variants: [
      { sku: "HH-DSH-500", nameEn: "500 ml", nameBn: "৫০০ মিলি", priceTk: 110, stock: 80 },
    ],
  },
  {
    slug: "toilet-tissue", nameEn: "Toilet Tissue (4 rolls)", nameBn: "টয়লেট টিস্যু (৪ রোল)",
    descriptionEn: "Soft, strong 2-ply toilet tissue.",
    descriptionBn: "নরম, মজবুত ২-প্লাই টয়লেট টিস্যু।",
    categorySlug: "household-cleaning", keyword: "tissue,paper", lock: 253,
    variants: [
      { sku: "HH-TIS-4", nameEn: "4 rolls", nameBn: "৪ রোল", priceTk: 120, stock: 90 },
    ],
  },

  // --- Bakery ---
  {
    slug: "sliced-bread", nameEn: "Sliced Bread", nameBn: "পাউরুটি",
    descriptionEn: "Soft sliced milk bread, baked fresh daily.",
    descriptionBn: "প্রতিদিন তৈরি নরম মিল্ক পাউরুটি।",
    categorySlug: "bakery", keyword: "bread", lock: 255,
    variants: [{ sku: "BAK-BRD-1", nameEn: "Loaf", nameBn: "লোফ", priceTk: 55, stock: 80 }],
  },
  {
    slug: "bun", nameEn: "Bun (6 pcs)", nameBn: "বান (৬ পিস)",
    descriptionEn: "Fluffy buns, great for breakfast.",
    descriptionBn: "নরম তুলতুলে বান, নাস্তার জন্য দারুণ।",
    categorySlug: "bakery", keyword: "bun,bread", lock: 257,
    variants: [{ sku: "BAK-BUN-6", nameEn: "6 pcs", nameBn: "৬ পিস", priceTk: 45, stock: 70 }],
  },
  {
    slug: "rusk-toast", nameEn: "Rusk Toast", nameBn: "টোস্ট বিস্কুট",
    descriptionEn: "Crunchy baked rusk toast for tea.",
    descriptionBn: "চায়ের সাথে মুচমুচে টোস্ট বিস্কুট।",
    categorySlug: "bakery", keyword: "toast,rusk", lock: 259,
    variants: [{ sku: "BAK-RSK-300", nameEn: "300 g", nameBn: "৩০০ গ্রাম", priceTk: 80, stock: 60 }],
  },

  // --- Breakfast & Cereal ---
  {
    slug: "corn-flakes", nameEn: "Corn Flakes", nameBn: "কর্নফ্লেক্স",
    descriptionEn: "Crispy corn flakes for a quick breakfast.",
    descriptionBn: "দ্রুত নাস্তার জন্য মুচমুচে কর্নফ্লেক্স।",
    categorySlug: "breakfast-cereal", keyword: "cornflakes,cereal", lock: 261,
    variants: [{ sku: "BRK-CRN-500", nameEn: "500 g", nameBn: "৫০০ গ্রাম", priceTk: 330, stock: 50 }],
  },
  {
    slug: "rolled-oats", nameEn: "Rolled Oats", nameBn: "ওটস",
    descriptionEn: "Wholegrain rolled oats, high in fibre.",
    descriptionBn: "ফাইবার সমৃদ্ধ হোলগ্রেইন ওটস।",
    categorySlug: "breakfast-cereal", keyword: "oats", lock: 263,
    variants: [
      { sku: "BRK-OAT-500", nameEn: "500 g", nameBn: "৫০০ গ্রাম", priceTk: 220, stock: 60 },
      { sku: "BRK-OAT-1", nameEn: "1 kg", nameBn: "১ কেজি", priceTk: 400, stock: 35 },
    ],
  },
  {
    slug: "pure-honey", nameEn: "Pure Honey", nameBn: "খাঁটি মধু",
    descriptionEn: "Natural pure honey, unprocessed.",
    descriptionBn: "প্রাকৃতিক খাঁটি মধু, প্রক্রিয়াবিহীন।",
    comparePriceTk: 580, categorySlug: "breakfast-cereal", keyword: "honey", lock: 265,
    variants: [{ sku: "BRK-HNY-500", nameEn: "500 g", nameBn: "৫০০ গ্রাম", priceTk: 520, stock: 40 }],
  },

  // --- Meat & Fish ---
  {
    slug: "broiler-chicken", nameEn: "Broiler Chicken", nameBn: "ব্রয়লার মুরগি",
    descriptionEn: "Fresh broiler chicken, cleaned and cut.",
    descriptionBn: "তাজা ব্রয়লার মুরগি, পরিষ্কার ও কাটা।",
    categorySlug: "meat-fish", keyword: "chicken", lock: 267,
    variants: [{ sku: "MF-CHK-1", nameEn: "1 kg", nameBn: "১ কেজি", priceTk: 190, stock: 60 }],
  },
  {
    slug: "rui-fish", nameEn: "Rui Fish", nameBn: "রুই মাছ",
    descriptionEn: "Fresh rui fish, cut to order.",
    descriptionBn: "তাজা রুই মাছ, চাহিদামতো কাটা।",
    comparePriceTk: 360, categorySlug: "meat-fish", keyword: "fish", lock: 269,
    variants: [{ sku: "MF-RUI-1", nameEn: "1 kg", nameBn: "১ কেজি", priceTk: 320, stock: 40 }],
  },
  {
    slug: "beef", nameEn: "Beef", nameBn: "গরুর মাংস",
    descriptionEn: "Fresh beef, bone-in.",
    descriptionBn: "তাজা গরুর মাংস, হাড়সহ।",
    categorySlug: "meat-fish", keyword: "beef,meat", lock: 271,
    variants: [{ sku: "MF-BEF-1", nameEn: "1 kg", nameBn: "১ কেজি", priceTk: 780, stock: 30 }],
  },

  // --- Frozen Foods ---
  {
    slug: "frozen-paratha", nameEn: "Frozen Paratha (5 pcs)", nameBn: "ফ্রোজেন পরোটা (৫ পিস)",
    descriptionEn: "Ready-to-fry frozen parathas.",
    descriptionBn: "ভাজার জন্য প্রস্তুত ফ্রোজেন পরোটা।",
    categorySlug: "frozen-foods", keyword: "paratha,frozen", lock: 273,
    variants: [{ sku: "FRZ-PAR-5", nameEn: "5 pcs", nameBn: "৫ পিস", priceTk: 150, stock: 70 }],
  },
  {
    slug: "chicken-nuggets", nameEn: "Chicken Nuggets", nameBn: "চিকেন নাগেট",
    descriptionEn: "Crispy frozen chicken nuggets.",
    descriptionBn: "মুচমুচে ফ্রোজেন চিকেন নাগেট।",
    categorySlug: "frozen-foods", keyword: "nuggets,frozen", lock: 275,
    variants: [{ sku: "FRZ-NUG-250", nameEn: "250 g", nameBn: "২৫০ গ্রাম", priceTk: 220, stock: 50 }],
  },
  {
    slug: "frozen-mixed-veg", nameEn: "Frozen Mixed Vegetables", nameBn: "ফ্রোজেন মিক্সড সবজি",
    descriptionEn: "Convenient frozen mixed vegetables.",
    descriptionBn: "সুবিধাজনক ফ্রোজেন মিক্সড সবজি।",
    categorySlug: "frozen-foods", keyword: "vegetables,frozen", lock: 277,
    variants: [{ sku: "FRZ-VEG-400", nameEn: "400 g", nameBn: "৪০০ গ্রাম", priceTk: 160, stock: 55 }],
  },

  // --- Sauces & Condiments ---
  {
    slug: "tomato-ketchup", nameEn: "Tomato Ketchup", nameBn: "টমেটো কেচাপ",
    descriptionEn: "Rich tomato ketchup.",
    descriptionBn: "ঘন টমেটো কেচাপ।",
    categorySlug: "sauces-condiments", keyword: "ketchup,sauce", lock: 279,
    variants: [{ sku: "SAU-KET-500", nameEn: "500 g", nameBn: "৫০০ গ্রাম", priceTk: 130, stock: 70 }],
  },
  {
    slug: "soy-sauce", nameEn: "Soy Sauce", nameBn: "সয়া সস",
    descriptionEn: "Savoury soy sauce for stir-fries.",
    descriptionBn: "স্টার-ফ্রাইয়ের জন্য সয়া সস।",
    categorySlug: "sauces-condiments", keyword: "sauce", lock: 281,
    variants: [{ sku: "SAU-SOY-200", nameEn: "200 ml", nameBn: "২০০ মিলি", priceTk: 95, stock: 60 }],
  },
  {
    slug: "chili-sauce", nameEn: "Chili Sauce", nameBn: "চিলি সস",
    descriptionEn: "Hot and tangy chili sauce.",
    descriptionBn: "ঝাল ও টক চিলি সস।",
    categorySlug: "sauces-condiments", keyword: "chili,sauce", lock: 283,
    variants: [{ sku: "SAU-CHI-300", nameEn: "300 g", nameBn: "৩০০ গ্রাম", priceTk: 115, stock: 55 }],
  },

  // --- Sugar & Sweeteners ---
  {
    slug: "white-sugar", nameEn: "White Sugar", nameBn: "সাদা চিনি",
    descriptionEn: "Fine white granulated sugar.",
    descriptionBn: "মিহি সাদা দানা চিনি।",
    categorySlug: "sugar-sweeteners", keyword: "sugar", lock: 285,
    variants: [
      { sku: "SUG-WHT-1", nameEn: "1 kg", nameBn: "১ কেজি", priceTk: 120, stock: 100 },
      { sku: "SUG-WHT-5", nameEn: "5 kg", nameBn: "৫ কেজি", priceTk: 580, stock: 40 },
    ],
  },
  {
    slug: "brown-sugar", nameEn: "Brown Sugar", nameBn: "ব্রাউন সুগার",
    descriptionEn: "Natural brown sugar.",
    descriptionBn: "প্রাকৃতিক ব্রাউন সুগার।",
    categorySlug: "sugar-sweeteners", keyword: "sugar,brown", lock: 287,
    variants: [{ sku: "SUG-BRN-1", nameEn: "1 kg", nameBn: "১ কেজি", priceTk: 150, stock: 50 }],
  },
  {
    slug: "date-molasses", nameEn: "Date Molasses (Khejur Gur)", nameBn: "খেজুরের গুড়",
    descriptionEn: "Traditional winter date molasses.",
    descriptionBn: "ঐতিহ্যবাহী শীতের খেজুরের গুড়।",
    categorySlug: "sugar-sweeteners", keyword: "molasses,jaggery", lock: 289,
    variants: [{ sku: "SUG-GUR-500", nameEn: "500 g", nameBn: "৫০০ গ্রাম", priceTk: 220, stock: 45 }],
  },

  // --- Noodles & Pasta ---
  {
    slug: "instant-noodles", nameEn: "Instant Noodles (8 pack)", nameBn: "ইনস্ট্যান্ট নুডলস (৮ প্যাক)",
    descriptionEn: "Quick instant noodles, masala flavour.",
    descriptionBn: "দ্রুত ইনস্ট্যান্ট নুডলস, মসলা ফ্লেভার।",
    comparePriceTk: 140, categorySlug: "noodles-pasta", keyword: "noodles", lock: 291,
    variants: [{ sku: "NDL-INS-8", nameEn: "8 pack", nameBn: "৮ প্যাক", priceTk: 120, stock: 90 }],
  },
  {
    slug: "pasta", nameEn: "Pasta", nameBn: "পাস্তা",
    descriptionEn: "Durum wheat pasta.",
    descriptionBn: "ডুরাম গমের পাস্তা।",
    categorySlug: "noodles-pasta", keyword: "pasta", lock: 293,
    variants: [{ sku: "NDL-PAS-500", nameEn: "500 g", nameBn: "৫০০ গ্রাম", priceTk: 140, stock: 60 }],
  },
  {
    slug: "vermicelli", nameEn: "Vermicelli (Semai)", nameBn: "সেমাই",
    descriptionEn: "Fine roasted vermicelli for desserts.",
    descriptionBn: "মিষ্টান্নের জন্য মিহি ভাজা সেমাই।",
    categorySlug: "noodles-pasta", keyword: "vermicelli,noodles", lock: 295,
    variants: [{ sku: "NDL-VER-200", nameEn: "200 g", nameBn: "২০০ গ্রাম", priceTk: 60, stock: 70 }],
  },

  // --- Baby Care ---
  {
    slug: "baby-diapers", nameEn: "Baby Diapers (M, 30 pcs)", nameBn: "বেবি ডায়াপার (M, ৩০ পিস)",
    descriptionEn: "Soft, absorbent diapers, medium size.",
    descriptionBn: "নরম, শোষণক্ষম ডায়াপার, মিডিয়াম সাইজ।",
    comparePriceTk: 750, categorySlug: "baby-care", keyword: "diapers,baby", lock: 297,
    variants: [{ sku: "BBY-DIP-M", nameEn: "30 pcs", nameBn: "৩০ পিস", priceTk: 680, stock: 40 }],
  },
  {
    slug: "baby-food-cereal", nameEn: "Baby Food Cereal", nameBn: "বেবি ফুড সিরিয়াল",
    descriptionEn: "Nutritious cereal for infants 6m+.",
    descriptionBn: "৬ মাস+ শিশুদের জন্য পুষ্টিকর সিরিয়াল।",
    categorySlug: "baby-care", keyword: "babyfood", lock: 299,
    variants: [{ sku: "BBY-FOO-400", nameEn: "400 g", nameBn: "৪০০ গ্রাম", priceTk: 420, stock: 45 }],
  },
  {
    slug: "baby-wipes", nameEn: "Baby Wipes", nameBn: "বেবি ওয়াইপস",
    descriptionEn: "Gentle baby wipes, alcohol-free.",
    descriptionBn: "কোমল বেবি ওয়াইপস, অ্যালকোহল-মুক্ত।",
    categorySlug: "baby-care", keyword: "wipes,baby", lock: 301,
    variants: [{ sku: "BBY-WIP-1", nameEn: "Pack", nameBn: "প্যাক", priceTk: 180, stock: 60 }],
  },

  // --- Personal Care ---
  {
    slug: "bath-soap", nameEn: "Bath Soap (4 pack)", nameBn: "গোসলের সাবান (৪ প্যাক)",
    descriptionEn: "Moisturising bath soap, value pack.",
    descriptionBn: "ময়েশ্চারাইজিং গোসলের সাবান, ভ্যালু প্যাক।",
    categorySlug: "personal-care", keyword: "soap", lock: 303,
    variants: [{ sku: "PC-SOAP-4", nameEn: "4 pack", nameBn: "৪ প্যাক", priceTk: 180, stock: 80 }],
  },
  {
    slug: "shampoo", nameEn: "Anti-Dandruff Shampoo", nameBn: "অ্যান্টি-ড্যান্ড্রাফ শ্যাম্পু",
    descriptionEn: "Anti-dandruff shampoo for healthy scalp.",
    descriptionBn: "সুস্থ মাথার ত্বকের জন্য অ্যান্টি-ড্যান্ড্রাফ শ্যাম্পু।",
    categorySlug: "personal-care", keyword: "shampoo", lock: 305,
    variants: [{ sku: "PC-SHM-200", nameEn: "200 ml", nameBn: "২০০ মিলি", priceTk: 210, stock: 55 }],
  },
  {
    slug: "toothpaste", nameEn: "Toothpaste", nameBn: "টুথপেস্ট",
    descriptionEn: "Fluoride toothpaste for cavity protection.",
    descriptionBn: "ক্যাভিটি প্রতিরোধে ফ্লোরাইড টুথপেস্ট।",
    categorySlug: "personal-care", keyword: "toothpaste", lock: 307,
    variants: [{ sku: "PC-TPS-140", nameEn: "140 g", nameBn: "১৪০ গ্রাম", priceTk: 110, stock: 75 }],
  },

  // --- Nuts & Dry Fruits ---
  {
    slug: "almonds", nameEn: "Almonds", nameBn: "কাঠবাদাম",
    descriptionEn: "Premium whole almonds.",
    descriptionBn: "প্রিমিয়াম আস্ত কাঠবাদাম।",
    categorySlug: "nuts-dry-fruits", keyword: "almonds,nuts", lock: 309,
    variants: [
      { sku: "NDF-ALM-250", nameEn: "250 g", nameBn: "২৫০ গ্রাম", priceTk: 320, stock: 50 },
      { sku: "NDF-ALM-500", nameEn: "500 g", nameBn: "৫০০ গ্রাম", priceTk: 600, stock: 30 },
    ],
  },
  {
    slug: "cashew-nuts", nameEn: "Cashew Nuts", nameBn: "কাজু বাদাম",
    descriptionEn: "Crunchy premium cashew nuts.",
    descriptionBn: "মুচমুচে প্রিমিয়াম কাজু বাদাম।",
    categorySlug: "nuts-dry-fruits", keyword: "cashew,nuts", lock: 311,
    variants: [{ sku: "NDF-CSH-250", nameEn: "250 g", nameBn: "২৫০ গ্রাম", priceTk: 380, stock: 40 }],
  },
  {
    slug: "raisins", nameEn: "Raisins", nameBn: "কিশমিশ",
    descriptionEn: "Sweet seedless raisins.",
    descriptionBn: "মিষ্টি বীজহীন কিশমিশ।",
    categorySlug: "nuts-dry-fruits", keyword: "raisins", lock: 313,
    variants: [{ sku: "NDF-RSN-250", nameEn: "250 g", nameBn: "২৫০ গ্রাম", priceTk: 160, stock: 60 }],
  },
  {
    slug: "premium-dates", nameEn: "Premium Dates", nameBn: "প্রিমিয়াম খেজুর",
    descriptionEn: "Soft, sweet premium dates.",
    descriptionBn: "নরম, মিষ্টি প্রিমিয়াম খেজুর।",
    comparePriceTk: 500, categorySlug: "nuts-dry-fruits", keyword: "dates", lock: 315,
    variants: [{ sku: "NDF-DAT-500", nameEn: "500 g", nameBn: "৫০০ গ্রাম", priceTk: 450, stock: 45 }],
  },
];

async function main() {
  console.log("🌱 Seeding BDShop (grocery)...");

  // --- Categories (parents first, then subcategories with parentId) ---------
  const catId: Record<string, string> = {};
  for (const c of parents) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nameEn: c.nameEn, nameBn: c.nameBn, image: img(c.keyword, c.lock), parentId: null },
      create: { slug: c.slug, nameEn: c.nameEn, nameBn: c.nameBn, image: img(c.keyword, c.lock) },
    });
    catId[c.slug] = cat.id;
  }
  for (const c of categories) {
    const parentId = catId[parentOf[c.slug]];
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nameEn: c.nameEn, nameBn: c.nameBn, image: img(c.keyword, c.lock), parentId },
      create: { slug: c.slug, nameEn: c.nameEn, nameBn: c.nameBn, image: img(c.keyword, c.lock), parentId },
    });
    catId[c.slug] = cat.id;
  }
  console.log(`  ✓ ${parents.length} parent + ${categories.length} sub categories`);

  // --- Products -------------------------------------------------------------
  for (const p of products) {
    const imageRows = [img(p.keyword, p.lock), img(p.keyword, p.lock + 1)].map(
      (url, position) => ({ url, alt: p.nameEn, position }),
    );
    const variantRows = p.variants.map((v) => ({
      sku: v.sku,
      nameEn: v.nameEn,
      nameBn: v.nameBn,
      price: toPoisha(v.priceTk),
      stock: v.stock,
    }));
    const base = {
      slug: p.slug,
      nameEn: p.nameEn,
      nameBn: p.nameBn,
      descriptionEn: p.descriptionEn,
      descriptionBn: p.descriptionBn,
      basePrice: toPoisha(p.variants[0].priceTk),
      comparePrice: p.comparePriceTk ? toPoisha(p.comparePriceTk) : null,
      categoryId: catId[p.categorySlug],
    };
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: { ...base, images: { deleteMany: {}, create: imageRows } },
      create: { ...base, images: { create: imageRows }, variants: { create: variantRows } },
    });
  }
  console.log(`  ✓ ${products.length} products`);

  // --- Admin user -----------------------------------------------------------
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await hashPassword(adminPassword);
  await prisma.user.upsert({
    where: { email: "admin@bdshop.test" },
    update: { passwordHash },
    create: {
      email: "admin@bdshop.test",
      name: "Store Admin",
      role: Role.ADMIN,
      passwordHash,
    },
  });
  console.log(`  ✓ Admin: admin@bdshop.test / ${adminPassword}`);

  // --- Coupons --------------------------------------------------------------
  await prisma.coupon.upsert({
    where: { code: "FRESH50" },
    update: {},
    create: { code: "FRESH50", type: "FIXED", value: toPoisha(50), minSpend: toPoisha(500) },
  });
  await prisma.coupon.upsert({
    where: { code: "GROCERY10" },
    update: {},
    create: { code: "GROCERY10", type: "PERCENT", value: 10, minSpend: toPoisha(1000) },
  });
  console.log("  ✓ Coupons: FRESH50, GROCERY10");

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
