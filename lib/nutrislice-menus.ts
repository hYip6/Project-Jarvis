export const ORDER_LOCATIONS = [
  "SAC Food Court",
  "Savor",
  "Smash N' Shake",
  "Popeyes",
  "Subway",
  "East Side Dining",
  "Jasmine",
  "West Side Dining",
] as const;

export const MENU_LOCATION_IDS = new Set<string>(["Savor", "Smash N' Shake", "Popeyes", "Subway"]);

export type MenuItem = { id: string; name: string; price: number; category: string };

export const SAVOR_MENU: MenuItem[] = [
  { id: "ps", name: "Pasta Sauté", price: 11.85, category: "Pasta Sauté" },
  { id: "psc", name: "Pasta Sauté with Chicken", price: 12.95, category: "Pasta Sauté with Added Protein" },
  { id: "psp", name: "Pasta Sauté with Pork Sausage", price: 12.95, category: "Pasta Sauté with Added Protein" },
  { id: "psvm", name: "Pasta Sauté with Vegan Meatballs", price: 12.95, category: "Pasta Sauté with Added Protein" },
  { id: "psbpm", name: "Pasta Sauté with Beef & Pork Meatballs", price: 12.95, category: "Pasta Sauté with Added Protein" },
  { id: "bcp", name: "Baked Chicken Parmesan", price: 13.95, category: "Specials" },
  { id: "pm", name: "Penne Marinara", price: 13.95, category: "Specials" },
  { id: "coke", name: "Coca-Cola", price: 2.2, category: "Beverages" },
  { id: "dcoke", name: "Diet Coke", price: 2.2, category: "Beverages" },
  { id: "sprite", name: "Sprite", price: 2.2, category: "Beverages" },
  { id: "drp", name: "Dr. Pepper", price: 2.0, category: "Beverages" },
  { id: "fanta", name: "Orange Fanta", price: 2.1, category: "Beverages" },
  { id: "punch", name: "Fruit Punch", price: 2.0, category: "Beverages" },
  { id: "lem", name: "Lemonade", price: 2.2, category: "Beverages" },
  { id: "tea", name: "Sweet Iced Tea", price: 2.0, category: "Beverages" },
  { id: "water", name: "Dasani Water, 20 oz", price: 2.7, category: "Beverages" },
];

export const SMASH_MENU: MenuItem[] = [
  { id: "sns_c1", name: "To The Max Burger Combo", price: 11.4, category: "Combos" },
  { id: "sns_c2", name: "BBQ Bacon Cheddar Ranch Burger Combo", price: 13.45, category: "Combos" },
  { id: "sns_c3", name: "Classic Smash Beef Burger Combo", price: 10.0, category: "Combos" },
  { id: "sns_c4", name: "Grilled Chicken Sandwich Combo", price: 12.6, category: "Combos" },
  { id: "sns_c5", name: "Turkey Burger Combo", price: 10.0, category: "Combos" },
  { id: "sns_c6", name: "Beyond Burger Combo", price: 13.45, category: "Combos" },
  { id: "sns_c7", name: "The Wolf Attack Combo", price: 13.45, category: "Combos" },
  { id: "sns_c8", name: "Smash Mushroom, Swiss Cheese Combo", price: 12.45, category: "Combos" },
  { id: "sns_f1", name: "Classic Smash Beef Burger", price: 6.45, category: "Favorites" },
  { id: "sns_f2", name: "Grilled Chicken Sandwich", price: 8.85, category: "Favorites" },
  { id: "sns_f3", name: "Turkey Burger", price: 6.45, category: "Favorites" },
  { id: "sns_f4", name: "Beyond Burger", price: 6.65, category: "Favorites" },
  { id: "sns_f5", name: "Malibu Garden Burger", price: 6.65, category: "Favorites" },
  { id: "sns_f6", name: "The Wolf Attack", price: 10.0, category: "Favorites" },
  { id: "sns_s1", name: "Hot Shaker Fries", price: 3.8, category: "Sides & Shakes" },
  { id: "sns_s2", name: "Vanilla Milkshake", price: 5.65, category: "Sides & Shakes" },
  { id: "sns_s3", name: "Chocolate Milkshake", price: 5.65, category: "Sides & Shakes" },
  { id: "sns_s4", name: "Strawberry Milkshake", price: 5.65, category: "Sides & Shakes" },
  { id: "sns_coke", name: "Coca-Cola", price: 2.2, category: "Fountain Beverages" },
  { id: "sns_dcoke", name: "Diet Coke", price: 2.2, category: "Fountain Beverages" },
  { id: "sns_sprite", name: "Sprite", price: 2.2, category: "Fountain Beverages" },
];

export const POPEYES_MENU: MenuItem[] = [
  { id: "pop_c1", name: "Classic Chicken Sandwich Combo", price: 9.99, category: "Combos" },
  { id: "pop_c2", name: "Spicy Chicken Sandwich Combo", price: 9.99, category: "Combos" },
  { id: "pop_c3", name: "3Pc Tenders Combo", price: 10.49, category: "Combos" },
  { id: "pop_c4", name: "5Pc Tenders Combo", price: 12.49, category: "Combos" },
  { id: "pop_c5", name: "2Pc Signature Chicken Combo", price: 9.49, category: "Combos" },
  { id: "pop_s1", name: "Classic Chicken Sandwich", price: 4.99, category: "Sandwiches & Chicken" },
  { id: "pop_s2", name: "Spicy Chicken Sandwich", price: 4.99, category: "Sandwiches & Chicken" },
  { id: "pop_s3", name: "3Pc Tenders", price: 6.49, category: "Sandwiches & Chicken" },
  { id: "pop_sd1", name: "Cajun Fries", price: 3.29, category: "Sides" },
  { id: "pop_sd2", name: "Red Beans & Rice", price: 3.29, category: "Sides" },
  { id: "pop_sd3", name: "Mashed Potatoes with Gravy", price: 3.29, category: "Sides" },
  { id: "pop_sd4", name: "Mac & Cheese", price: 3.29, category: "Sides" },
  { id: "pop_b1", name: "Biscuit", price: 1.99, category: "Sides" },
  { id: "pop_d1", name: "Fountain Drink", price: 2.49, category: "Beverages" },
];

export const SUBWAY_MENU: MenuItem[] = [
  { id: "sub_1", name: "Footlong Italian B.M.T.", price: 9.49, category: "Footlong Subs" },
  { id: "sub_2", name: "Footlong Spicy Italian", price: 8.99, category: "Footlong Subs" },
  { id: "sub_3", name: "Footlong Turkey Breast", price: 8.99, category: "Footlong Subs" },
  { id: "sub_4", name: "Footlong Tuna", price: 8.99, category: "Footlong Subs" },
  { id: "sub_5", name: "Footlong Meatball Marinara", price: 8.49, category: "Footlong Subs" },
  { id: "sub_6", name: "Footlong Veggie Delite", price: 7.49, category: "Footlong Subs" },
  { id: "sub_7", name: "6-inch Italian B.M.T.", price: 6.49, category: "6-inch Subs" },
  { id: "sub_8", name: "6-inch Turkey Breast", price: 5.99, category: "6-inch Subs" },
  { id: "sub_9", name: "6-inch Tuna", price: 5.99, category: "6-inch Subs" },
  { id: "sub_10", name: "6-inch Veggie Delite", price: 4.99, category: "6-inch Subs" },
  { id: "sub_c1", name: "Chocolate Chip Cookie", price: 1.29, category: "Sides & Drinks" },
  { id: "sub_c2", name: "Bag of Chips", price: 1.59, category: "Sides & Drinks" },
  { id: "sub_d1", name: "Fountain Drink", price: 2.29, category: "Sides & Drinks" },
];
