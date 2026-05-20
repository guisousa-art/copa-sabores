import { recipesData } from './data.js';

// Elements
const modal = document.getElementById('recipeModal');
const closeModalBtn = document.getElementById('closeModal');
const countryNameEl = document.getElementById('countryName');
const recipeDishEl = document.getElementById('recipeDish');
const recipeDescEl = document.getElementById('recipeDesc');
const recipeImageEl = document.getElementById('recipeImage');

// Setup Globe
const world = Globe()
  (document.getElementById('globeViz'))
  .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
  .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
  .backgroundImageUrl('./assets/background.png')
  .polygonAltitude(0.01)
  .polygonCapColor(() => 'rgba(200, 0, 0, 0.2)')
  .polygonSideColor(() => 'rgba(0, 100, 0, 0.15)')
  .polygonStrokeColor(() => '#111')
  .polygonLabel(({ properties: d }) => {
    const ptName = getCountryNamePT(d);
    return `
    <div style="background: rgba(0, 0, 0, 0.8); color: white; padding: 5px 10px; border-radius: 4px; font-family: 'Outfit', sans-serif;">
      <b>${ptName}</b>
    </div>
  `})
  .onPolygonHover(hoverD => {
    world
      .polygonAltitude(d => d === hoverD ? 0.08 : 0.01)
      .polygonCapColor(d => d === hoverD ? 'rgba(0, 255, 204, 0.6)' : 'rgba(255, 255, 255, 0.1)');
  })
  .onPolygonClick(({ properties: d }) => {
    const countryName = d.ADMIN;
    const ptName = getCountryNamePT(d);

    // Check if we have a recipe for this country
    const recipe = recipesData[countryName];

    if (recipe) {
      openModal(ptName, recipe);
    } else {
      // Fallback if no recipe found
      openModal(ptName, {
        dish: "Iguarias Locais",
        description: `Ainda estamos reunindo receitas tradicionais para ${ptName}. Fique ligado para mais novidades culinárias da Copa!`,
        image: "https://images.unsplash.com/photo-1495195134817-a165d429281b?w=800&auto=format&fit=crop"
      });
    }
  });

// Portuguese Translation Helper
const regionNamesPt = new Intl.DisplayNames(['pt-BR'], { type: 'region' });
function getCountryNamePT(d) {
  if (d.ISO_A2 && d.ISO_A2 !== '-99') {
    try {
      return regionNamesPt.of(d.ISO_A2);
    } catch (e) { }
  }
  const fallbacks = {
    "France": "França",
    "Norway": "Noruega",
    "Somaliland": "Somalilândia",
    "Kosovo": "Kosovo",
    "Northern Cyprus": "Chipre do Norte"
  };
  return fallbacks[d.ADMIN] || d.ADMIN;
}

// Load GeoJSON data for countries
fetch('./ne_110m_admin_0_countries.geojson')
  .then(res => res.json())
  .then(countries => {
    const worldCupTeams = [
      "Canada", "United States of America", "Mexico",
      "Australia", "Saudi Arabia", "Qatar", "South Korea", "Iran", "Iraq", "Japan", "Jordan", "Uzbekistan",
      "South Africa", "Algeria", "Ivory Coast", "Egypt", "Ghana", "Morocco", "Democratic Republic of the Congo", "Senegal", "Tunisia",
      "Argentina", "Brazil", "Colombia", "Ecuador", "Paraguay", "Uruguay",
      "New Zealand",
      "Germany", "Austria", "Belgium", "Bosnia and Herzegovina", "Croatia", "Spain", "France", "Netherlands", "Norway", "Portugal", "Czechia", "Sweden", "Switzerland", "Turkey", "United Kingdom",
      "Haiti", "Panama"
    ];

    const filteredFeatures = countries.features.filter(f => worldCupTeams.includes(f.properties.ADMIN));
    world.polygonsData(filteredFeatures);

    // Setup Auto-rotation
    world.controls().autoRotate = true;
    world.controls().autoRotateSpeed = 0.5;
    world.controls().enableZoom = true;
  });

// Modal Logic
function openModal(country, recipe) {
  countryNameEl.textContent = country;
  recipeDishEl.textContent = recipe.dish;
  recipeDescEl.textContent = recipe.description;
  recipeImageEl.src = recipe.image;

  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
}

closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    closeModal();
  }
});

// Handle resize
window.addEventListener('resize', () => {
  world.width(window.innerWidth);
  world.height(window.innerHeight);
});
