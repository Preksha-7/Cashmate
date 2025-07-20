// backend/src/utils/categorization.js

/**
 * Simple transaction categorization based on description
 * @param {string} description - Transaction description or vendor name
 * @returns {string} Suggested Category
 */
export const categorizeTransaction = (description) => {
  const desc = (description || "").toLowerCase();

  const categories = {
    "Food & Dining": [
      "restaurant",
      "food",
      "cafe",
      "pizza",
      "burger",
      "meal",
      "deli",
      "swiggy",
      "zomato",
      "kfc",
      "dominos",
    ],
    Transportation: [
      "uber",
      "taxi",
      "bus",
      "train",
      "petrol",
      "gas",
      "parking",
      "fuel",
      "auto",
      "ola",
    ],
    Shopping: [
      "amazon",
      "flipkart",
      "mall",
      "store",
      "shop",
      "purchase",
      "retail",
      "myntra",
      "reliance digital",
    ],
    Entertainment: [
      "movie",
      "cinema",
      "netflix",
      "spotify",
      "game",
      "ticket",
      "concert",
      "pvr",
      "inox",
    ],
    "Bills & Utilities": [
      "electricity",
      "water",
      "gas",
      "phone",
      "internet",
      "utility",
      "bill",
      "rent",
      "broadband",
      "jio",
      "airtel",
    ],
    Healthcare: [
      "hospital",
      "doctor",
      "pharmacy",
      "medical",
      "health",
      "clinic",
      "apollo pharmacy",
      "diagnostics",
    ],
    Education: [
      "school",
      "college",
      "fees",
      "books",
      "tuition",
      "course",
      "education",
      "academy",
    ],
    Travel: [
      "flight",
      "hotel",
      "travel",
      "airline",
      "trip",
      "makemytrip",
      "goibibo",
    ],
    "Personal Care": ["salon", "spa", "gym", "haircut", "cosmetics", "beauty"],
    "Home & Garden": [
      "home",
      "garden",
      "hardware",
      "furniture",
      "appliances",
      "ikea",
      "housing",
    ],
    Groceries: [
      "supermarket",
      "kirana",
      "grocery",
      "d-mart",
      "reliance fresh",
      "big bazaar",
      "more",
      "spencer's",
    ],
    Salary: ["salary", "wage", "payroll", "income", "paycheck"],
    "Freelance Income": [
      "freelance",
      "consulting",
      "project payment",
      "client payment",
    ],
    Investment: ["investment", "stocks", "mutual fund", "brokerage", "demat"],
    "Business Expenses": [
      "business",
      "office supply",
      "marketing",
      "software subscription",
    ],
    "Gift Received": ["gift", "present"],
    "Other Income": ["other income", "miscellaneous income", "rental income"],
    "Cash Withdrawal": ["atm", "cash", "withdrawal"],
    "Bank Fees": [
      "fee",
      "charge",
      "penalty",
      "interest",
      "bank charge",
      "service charge",
    ],
    Transfers: [
      "transfer",
      "sent to",
      "received from",
      "upi",
      "imps",
      "neft",
      "rtgs",
    ],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((keyword) => desc.includes(keyword))) {
      return category;
    }
  }

  return "Miscellaneous"; // Default category if none match
};
