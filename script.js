
const API_URL = "https://www.themealdb.com/api/json/v1/1";

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const recipeGrid = document.getElementById("recipeGrid");
const favoritesGrid = document.getElementById("favoritesGrid");
const sectionTitle = document.getElementById("sectionTitle");
const resultCount = document.getElementById("resultCount");
const statusMessage = document.getElementById("statusMessage");
const pagination = document.getElementById("pagination");
const modal = document.getElementById("recipeModal");
const recipeDetails = document.getElementById("recipeDetails");
const closeModal = document.getElementById("closeModal");
const themeToggle = document.getElementById("themeToggle");
const favoritesNav = document.getElementById("favoritesNav");
const toast = document.getElementById("toast");

let recipes = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 6;

let favorites = JSON.parse(localStorage.getItem("recipeFavorites")) || [];
let toastTimeout;







function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}



function saveFavorites() {
  localStorage.setItem("recipeFavorites", JSON.stringify(favorites));
}

function isFavorite(id) {
  return favorites.some(recipe => recipe.idMeal === id);
}

function toggleFavorite(meal) {
  if (isFavorite(meal.idMeal)) {
    favorites = favorites.filter(
      recipe => recipe.idMeal !== meal.idMeal
    );

    showToast("Removed from favorites");
  } else {
    favorites.push(meal);
    showToast("Added to favorites");
  }

  saveFavorites();
  displayRecipes();
  displayFavorites();
}

function displayFavorites() {
  if (favorites.length === 0) {
    favoritesGrid.innerHTML = `
      <div class="status-message">
        No favorites yet. Tap the on any recipe to save it!
      </div>
    `;
    return;
  }

  favoritesGrid.innerHTML = favorites.map(meal => createRecipeCard(meal)).join("");
}

function createRecipeCard(meal) {
  const favorite = isFavorite(meal.idMeal);

  return `
    <article class="recipe-card">
      <div class="card-image-wrap">
        <img
          src="${escapeHTML(meal.strMealThumb || "")}"
          alt="${escapeHTML(meal.strMeal)}"
          loading="lazy"
        >

        <button
          class="favorite-btn ${favorite ? "is-favorite" : ""}"
          data-favorite="${meal.idMeal}"
          aria-label="Toggle favorite"
          title="Toggle favorite"
        >
          ${favorite }
        </button>
      </div>

      <div class="card-body">
        <span class="card-meta">
          ${escapeHTML(meal.strCategory || "Recipe")}
        </span>

        <h3>${escapeHTML(meal.strMeal)}</h3>

        <div class="card-actions">
          <button class="view-btn" data-view="${meal.idMeal}">
            View Recipe →
          </button>
        </div>
      </div>
    </article>
  `;
}


async function searchRecipes(query) {
  const cleanedQuery = query.trim();

  if (!cleanedQuery) {
    showToast("Please enter a recipe name.");
    return;
  }

  currentPage = 1;
  recipes = [];

  sectionTitle.textContent = `Results for "${cleanedQuery}"`;
  resultCount.textContent = "";
  recipeGrid.innerHTML = "";
  pagination.innerHTML = "";

  showLoading("Searching for delicious recipes...");

  try {
    const response = await fetch(
      `${API_URL}/search.php?s=${encodeURIComponent(cleanedQuery)}`
    );

    if (!response.ok) {
      throw new Error("Unable to connect to the recipe service.");
    }

    const data = await response.json();

    recipes = data.meals || [];

    hideStatus();

    if (recipes.length === 0) {
      resultCount.textContent = "0 recipes found";

      showStatus(
        `No recipes found for "${cleanedQuery}". Try another search!`
      );

      return;
    }

    resultCount.textContent =
      `${recipes.length} recipes found`;

    displayRecipes();
  } catch (error) {
    recipes = [];
    resultCount.textContent = "";
    showStatus("Something went wrong. Please check your internet connection and try again.", true);
  }
}


function displayRecipes() {
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const pageRecipes = recipes.slice(startIndex, endIndex);

  recipeGrid.innerHTML = pageRecipes
    .map(meal => createRecipeCard(meal))
    .join("");

  displayPagination();
}


function displayPagination() {
  pagination.innerHTML = "";

  const totalPages = Math.ceil(recipes.length / ITEMS_PER_PAGE);

  if (totalPages <= 1) return;

  const previousButton = createPageButton("←", currentPage - 1);
  previousButton.disabled = currentPage === 1;
  pagination.appendChild(previousButton);

  for (let page = 1; page <= totalPages; page++) {
    const button = createPageButton(page, page);

    if (page === currentPage) {
      button.classList.add("active");
    }

    pagination.appendChild(button);
  }

  const nextButton = createPageButton("→", currentPage + 1);
  nextButton.disabled = currentPage === totalPages;
  pagination.appendChild(nextButton);
}

function createPageButton(label, page) {
  const button = document.createElement("button");
  button.textContent = label;
  button.className = "page-btn";

  button.addEventListener("click", () => {
    const totalPages = Math.ceil(recipes.length / ITEMS_PER_PAGE);

    if (page < 1 || page > totalPages) return;

    currentPage = page;
    displayRecipes();

    document.getElementById("recipes").scrollIntoView({
      behavior: "smooth"
    });
  });

  return button;
}


async function getRecipeDetails(id) {
  modal.classList.add("show");
  recipeDetails.innerHTML = "<p>Loading recipe details...</p>";

  try {
    const response = await fetch(
      `${API_URL}/lookup.php?i=${encodeURIComponent(id)}`
    );

    if (!response.ok) {
      throw new Error("Unable to load recipe details.");
    }

    const data = await response.json();

    if (!data.meals || data.meals.length === 0) {
      recipeDetails.innerHTML = "<p>Recipe details not found.</p>";
      return;
    }

    displayRecipeDetails(data.meals[0]);
  } catch (error) {
    recipeDetails.innerHTML = `
      <p class="status-message error">
        Failed to load recipe details. Please try again.
      </p>
    `;
  }
}

function displayRecipeDetails(meal) {
  let ingredients = [];

  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];

    if (ingredient && ingredient.trim()) {
      ingredients.push(`
        <li>
          ${escapeHTML(measure || "")}
          ${escapeHTML(ingredient)}
        </li>
      `);
    }
  }

  recipeDetails.innerHTML = `
    <img src="${escapeHTML(meal.strMealThumb || "")}" alt="${escapeHTML(meal.strMeal)}">

    <span class="card-meta">
      ${escapeHTML(meal.strCategory || "Recipe")} ·
      ${escapeHTML(meal.strArea || "International")}
    </span>

    <h2>${escapeHTML(meal.strMeal)}</h2>

    <button
      class="view-btn"
      data-favorite="${meal.idMeal}"
      style="margin-top:10px"
    >
      ${isFavorite(meal.idMeal) ? "♥ Saved" : "♡ Add to Favorites"}
    </button>

    <h3> Ingredients</h3>
    <ul class="ingredients-list">
      ${ingredients.join("")}
    </ul>

    <h3> Instructions</h3>
    <p>${escapeHTML(meal.strInstructions || "No instructions available.")}</p>

    ${
      meal.strYoutube
        ? `<h3> Video Tutorial</h3>
           <a href="${escapeHTML(meal.strYoutube)}" target="_blank" rel="noopener noreferrer">
             Watch on YouTube ↗
           </a>`
        : ""
    }
  `;
}


searchForm.addEventListener("submit", event => {
  event.preventDefault();
  searchRecipes(searchInput.value);
});

document.querySelectorAll("[data-search]").forEach(button => {
  button.addEventListener("click", () => {
    const query = button.dataset.search;
    searchInput.value = query;
    searchRecipes(query);
  });
});

recipeGrid.addEventListener("click", event => {
  const favoriteButton = event.target.closest("[data-favorite]");
  const viewButton = event.target.closest("[data-view]");

  if (favoriteButton) {
    const id = favoriteButton.dataset.favorite;
    const meal = recipes.find(recipe => recipe.idMeal === id);

    if (meal) toggleFavorite(meal);
    return;
  }

  if (viewButton) {
    getRecipeDetails(viewButton.dataset.view);
  }
});

favoritesGrid.addEventListener("click", event => {
  const favoriteButton = event.target.closest("[data-favorite]");
  const viewButton = event.target.closest("[data-view]");

  if (favoriteButton) {
    const id = favoriteButton.dataset.favorite;
    const meal = favorites.find(recipe => recipe.idMeal === id);

    if (meal) toggleFavorite(meal);
    return;
  }

  if (viewButton) {
    getRecipeDetails(viewButton.dataset.view);
  }
});

recipeDetails.addEventListener("click", event => {
  const button = event.target.closest("[data-favorite]");

  if (!button) return;

  const id = button.dataset.favorite;

  // Fetch meal from current results or favorites
  const meal =
    recipes.find(recipe => recipe.idMeal === id) ||
    favorites.find(recipe => recipe.idMeal === id);

  if (meal) {
    toggleFavorite(meal);
    displayRecipeDetails(meal);
  }
});

favoritesNav.addEventListener("click", () => {
  document.getElementById("favoritesSection").scrollIntoView({
    behavior: "smooth"
  });
});


closeModal.addEventListener("click", () => {
  modal.classList.remove("show");
});

modal.addEventListener("click", event => {
  if (event.target === modal) {
    modal.classList.remove("show");
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    modal.classList.remove("show");
  }
});


function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function showLoading(message) {
  statusMessage.textContent = message;
  statusMessage.className = "status-message";
}

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.className = isError
    ? "status-message error"
    : "status-message";
}

function hideStatus() {
  statusMessage.textContent = "";
  statusMessage.className = "status-message";
}

initializeTheme();
displayFavorites();
searchRecipes("Chicken");
