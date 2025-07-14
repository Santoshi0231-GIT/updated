// product-search.js

/**
 * Search food items based on a query string
 * @param {Array} foodItems - List of food items
 * @param {string} query - Search query
 * @returns {Array} - Filtered list of food items matching the query
 */
function searchFoodItems(foodItems, query) {
  if (!query) return foodItems;
  const lowerCaseQuery = query.toLowerCase();
  return foodItems.filter(item =>
    item.name.toLowerCase().includes(lowerCaseQuery) ||
    (item.description && item.description.toLowerCase().includes(lowerCaseQuery))
  );
}

module.exports = searchFoodItems;

