// backend/src/utils/categorization.js

/**
 * Simple transaction categorization based on description
 * @param {string} description - Transaction description
 * @returns {string} Suggested Category
 */
export const categorizeTransaction = (description) => {
  const desc = (description || "").toLowerCase();

  // Define category keywords (can be expanded)
  const categories = {
    "Food & Dining": [
      "restaurant",
      "food",
      "cafe",
      "pizza",
      "burger",
      "meal",
      "deli",
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
    ],
    Entertainment: [
      "movie",
      "cinema",
      "netflix",
      "spotify",
      "game",
      "ticket",
      "concert",
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
    ],
    Healthcare: [
      "hospital",
      "doctor",
      "pharmacy",
      "medical",
      "health",
      "clinic",
    ],
    Education: ["school", "college", "fees", "books", "tuition", "course"],
    Travel: ["flight", "hotel", "travel", "airline", "trip"],
    "Personal Care": ["salon", "spa", "gym", "haircut", "cosmetics"],
    "Home & Garden": ["home", "garden", "hardware", "furniture", "appliances"],
    Groceries: [
      "supermarket",
      "kirana",
      "grocery",
      "d-mart",
      "reliance fresh",
      "big bazaar",
    ],
    Salary: ["salary", "wage", "payroll", "income", "paycheck"],
    Freelance: ["freelance", "consulting", "project payment"],
    Investment: ["investment", "stocks", "mutual fund", "brokerage"],
    Business: ["business", "office supply", "client payment"],
    Gift: ["gift", "present"],
    "Other Income": ["other income", "miscellaneous income"],
    Transfer: ["transfer", "sent", "received", "upi", "imps", "neft", "rtgs"],
    Withdrawal: ["atm", "cash", "withdrawal"],
    "Fees & Charges": ["fee", "charge", "penalty", "interest", "bank charge"],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((keyword) => desc.includes(keyword))) {
      return category;
    }
  }

  return "Miscellaneous"; // Default category if none match
};
