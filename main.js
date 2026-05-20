import { recipesData } from './data.js';

// Participating Teams in the World Cup
const worldCupTeams = [
  "Canada", "United States of America", "Mexico",
  "Australia", "Saudi Arabia", "Qatar", "South Korea", "Iran", "Iraq", "Japan", "Jordan", "Uzbekistan",
  "South Africa", "Algeria", "Ivory Coast", "Egypt", "Ghana", "Morocco", "Democratic Republic of the Congo", "Senegal", "Tunisia",
  "Argentina", "Brazil", "Colombia", "Ecuador", "Paraguay", "Uruguay",
  "New Zealand",
  "Germany", "Austria", "Belgium", "Bosnia and Herzegovina", "Croatia", "Spain", "France", "Netherlands", "Norway", "Portugal", "Czechia", "Sweden", "Switzerland", "Turkey", "United Kingdom",
  "Haiti", "Panama"
];

const isParticipating = (d) => {
  if (!d || !d.properties) return false;
  return worldCupTeams.includes(d.properties.ADMIN);
};

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
  .backgroundColor('rgba(0, 0, 0, 0)')
  .polygonAltitude(d => isParticipating(d) ? 0.01 : 0.002)
  .polygonCapColor(d => isParticipating(d) ? '#be1e1e' : 'rgba(190, 30, 30, 0.35)') // participating vs muted red for other lands
  .polygonSideColor(d => isParticipating(d) ? 'rgba(255, 200, 0, 0.3)' : 'rgba(0, 0, 0, 0)')
  .polygonStrokeColor(d => isParticipating(d) ? '#ffc800' : 'rgba(255, 200, 0, 0.25)') // yellow borders (#ffc800)
  .polygonLabel(({ properties: d }) => {
    const ptName = getCountryNamePT(d);
    const participating = worldCupTeams.includes(d.ADMIN);
    return `
    <div style="background: rgba(0, 0, 0, 0.85); color: white; padding: 5px 10px; border-radius: 6px; font-family: 'Outfit', sans-serif; border: 1px solid ${participating ? '#ffc800' : 'rgba(255, 255, 255, 0.15)'}">
      <b>${ptName}</b>${participating ? ' <span style="color: #ffc800; font-size: 0.85rem; margin-left: 4px;">★</span>' : ''}
    </div>
  `})
  .onPolygonHover(hoverD => {
    const container = document.getElementById('globeViz');
    if (hoverD && isParticipating(hoverD)) {
      container.style.cursor = 'pointer';
      world
        .polygonAltitude(d => d === hoverD ? 0.08 : (isParticipating(d) ? 0.01 : 0.002))
        .polygonCapColor(d => d === hoverD ? '#ffc800' : (isParticipating(d) ? '#be1e1e' : 'rgba(190, 30, 30, 0.35)'))
        .polygonStrokeColor(d => d === hoverD ? '#ffffff' : (isParticipating(d) ? '#ffc800' : 'rgba(255, 200, 0, 0.25)'));
    } else {
      container.style.cursor = 'default';
      world
        .polygonAltitude(d => isParticipating(d) ? 0.01 : 0.002)
        .polygonCapColor(d => isParticipating(d) ? '#be1e1e' : 'rgba(190, 30, 30, 0.35)')
        .polygonStrokeColor(d => isParticipating(d) ? '#ffc800' : 'rgba(255, 200, 0, 0.25)');
    }
  })
  .onPolygonClick(d => {
    if (d && isParticipating(d)) {
      const countryName = d.properties.ADMIN;
      const ptName = getCountryNamePT(d.properties);

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
    }
  });

// Set Solid Ocean Color (#e61928) on the globe base sphere
world.globeMaterial().color.set('#e61928');
world.globeMaterial().shininess = 15; // Muted glossy reflection

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
    // Render all countries so outlines cover the entire globe
    world.polygonsData(countries.features);

    // Setup Auto-rotation
    world.controls().autoRotate = true;
    world.controls().autoRotateSpeed = 0.25; // Slow down by 50%
    world.controls().enableZoom = false;   // Disable default scroll zoom
    world.controls().enableRotate = false; // Disable default dragging (prevents scroll conflicts)

    // Custom Globe Controls (Placed inside .then to ensure controls are initialized)
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const rotationSlider = document.getElementById('rotationSlider');

    // Handle Rotation via Slider
    rotationSlider.addEventListener('input', (e) => {
      // Disable autoRotate upon manual interaction
      if (world.controls().autoRotate) {
        world.controls().autoRotate = false;
      }
      
      const currentPOV = world.pointOfView();
      world.pointOfView({
        lat: currentPOV.lat,
        lng: Number(e.target.value),
        altitude: currentPOV.altitude
      }, 0); // Instant 0ms transition for smooth dragging
    });

    // Handle Zoom In
    zoomInBtn.addEventListener('click', () => {
      const currentPOV = world.pointOfView();
      // Prevent clipping by limiting minimum altitude to 1.15
      const newAltitude = Math.max(1.15, currentPOV.altitude - 0.4);
      world.pointOfView({
        lat: currentPOV.lat,
        lng: currentPOV.lng,
        altitude: newAltitude
      }, 400); // Fluid 400ms transition
    });

    // Handle Zoom Out
    zoomOutBtn.addEventListener('click', () => {
      const currentPOV = world.pointOfView();
      // Limit maximum altitude to 4.0
      const newAltitude = Math.min(4.0, currentPOV.altitude + 0.4);
      world.pointOfView({
        lat: currentPOV.lat,
        lng: currentPOV.lng,
        altitude: newAltitude
      }, 400); // Fluid 400ms transition
    });

    // Sync Slider Position with Auto-Rotation
    world.controls().addEventListener('change', () => {
      if (world.controls().autoRotate) {
        const pov = world.pointOfView();
        // Normalize longitude to [0, 360)
        let lng = pov.lng % 360;
        if (lng < 0) lng += 360;
        rotationSlider.value = Math.round(lng);
      }
    });
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
