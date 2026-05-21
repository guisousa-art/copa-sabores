import { recipesData } from './data.js';

// Participating Teams in the World Cup
const worldCupTeams = [
  "Canada", "United States of America", "Mexico",
  "Australia", "Saudi Arabia", "Qatar", "South Korea", "Iran", "Iraq", "Japan", "Jordan", "Uzbekistan",
  "South Africa", "Algeria", "Ivory Coast", "Egypt", "Ghana", "Morocco", "Democratic Republic of the Congo", "Senegal", "Tunisia",
  "Argentina", "Brazil", "Colombia", "Ecuador", "Paraguay", "Uruguay",
  "New Zealand",
  "Germany", "Austria", "Belgium", "Bosnia and Herzegovina", "Croatia", "Spain", "France", "Netherlands", "Norway", "Portugal", "Czechia", "Sweden", "Switzerland", "Turkey", "United Kingdom", "Italy",
  "Haiti", "Panama"
];

// Number of World Cup titles won by country
const worldCupTitles = {
  "Brazil": 5,
  "Germany": 4,
  "Italy": 4,
  "Argentina": 3,
  "France": 2,
  "Uruguay": 2,
  "Spain": 1,
  "United Kingdom": 1 // England
};

const isParticipating = (d) => {
  if (!d || !d.properties) return false;
  return worldCupTeams.includes(d.properties.ADMIN);
};

// ==========================================
// GOOGLE SHEETS INTEGRATION CONFIGURATION
// ==========================================
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1JRHo8rWdp09LPfgZujFPoyCxeRee8uKKqgl9jWMfgk0/export?format=csv';

const sheetCountryMap = {
  "Brasil": "Brazil",
  "Argentina": "Argentina",
  "México": "Mexico",
  "Japão": "Japan",
  "França": "France",
  "Itália": "Italy",
  "Alemanha": "Germany",
  "Marrocos": "Morocco"
};

let fetchedRecipesData = {};

// Bulletproof CSV Parser to handle comma-delimited fields, quotes, and newlines
function parseCSV(csvText) {
  const lines = [];
  let currentLine = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // Skip double quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentLine.push(currentField.trim());
        currentField = '';
      } else if (char === '\r' || char === '\n') {
        currentLine.push(currentField.trim());
        currentField = '';
        if (currentLine.some(field => field !== '')) {
          lines.push(currentLine);
        }
        currentLine = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
      } else {
        currentField += char;
      }
    }
  }
  
  if (currentField !== '' || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    if (currentLine.some(field => field !== '')) {
      lines.push(currentLine);
    }
  }
  
  return lines;
}

// Fetch recipes from Google Sheets with graceful fallback to local data
function loadRecipesFromSheet() {
  return fetch(SHEET_URL)
    .then(res => {
      if (!res.ok) throw new Error("Falha ao buscar planilha de receitas");
      return res.text();
    })
    .then(csvText => {
      const parsed = parseCSV(csvText);
      if (parsed.length <= 1) throw new Error("Planilha vazia ou inválida");
      
      const recipes = { ...recipesData };
      
      for (let i = 1; i < parsed.length; i++) {
        const row = parsed[i];
        if (!row || row.length < 3) continue;
        
        const id = row[0];
        const dishName = row[1];
        const paisPt = row[2];
        const customImage = row[3];
        
        // Parse up to 5 ingredients and quantities
        const ingredients = [];
        for (let j = 4; j < 14; j += 2) {
          const ingName = row[j];
          const ingQty = row[j+1];
          if (ingName && ingName.trim() !== '') {
            ingredients.push({
              name: ingName.trim(),
              quantity: ingQty ? ingQty.trim() : ''
            });
          }
        }
        
        // Modo de preparo split by '|'
        const prepSteps = row[14] ? row[14].split('|').map(s => s.trim()).filter(s => s !== '') : [];
        
        // Map country to English ADMIN name
        const englishName = sheetCountryMap[paisPt] || id.split('-')[0];
        
        // Fallback Unsplash image from data.js local data
        const localFallback = recipesData[englishName];
        const fallbackImage = localFallback ? localFallback.image : "https://images.unsplash.com/photo-1495195134817-a165d429281b?w=800&auto=format&fit=crop";
        
        recipes[englishName] = {
          dish: dishName,
          description: localFallback ? localFallback.description : `Uma deliciosa receita tradicional de ${paisPt} de dar água na boca, preparada para a Copa dos Sabores.`,
          image: customImage && customImage.trim() !== '' ? customImage.trim() : fallbackImage,
          ingredients: ingredients,
          instructions: prepSteps
        };
      }
      
      fetchedRecipesData = recipes;
      console.log("Recipes loaded successfully from Google Sheets:", fetchedRecipesData);
      return recipes;
    })
    .catch(err => {
      console.warn("Utilizando dados locais como fallback devido a erro na planilha:", err);
      // Fallback
      fetchedRecipesData = recipesData;
    });
}

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
  .polygonStrokeColor(d => isParticipating(d) ? '#28cdd2' : '#008c9b40') // yellow borders (#ffc800)
  .polygonLabel(({ properties: d }) => {
    const ptName = getCountryNamePT(d);
    const participating = worldCupTeams.includes(d.ADMIN);
    const titles = worldCupTitles[d.ADMIN] || 0;
    const flagHtml = d.ISO_A2 && d.ISO_A2 !== '-99'
      ? `<img src="https://flagcdn.com/w80/${d.ISO_A2.toLowerCase()}.png" style="width: 22px; height: 22px; object-fit: cover; border-radius: 4px; border: 1px solid #ffc800; display: inline-block;" alt="flag">`
      : '';
    const titlesHtml = participating
      ? `<div style="font-size: 0.8rem; margin-top: 4px; color: ${titles > 0 ? '#ffc800' : '#aaa'}; display: flex; align-items: center; gap: 4px;">
          🏆 ${titles} ${titles === 1 ? 'título' : 'títulos'}
         </div>`
      : '';
    return `
    <div style="background: rgba(0, 0, 0, 0.9); color: white; padding: 8px 12px; border-radius: 8px; font-family: 'Outfit', sans-serif; border: 1px solid ${participating ? '#ffc800' : 'rgba(255, 255, 255, 0.15)'}; display: flex; flex-direction: column; align-items: center; pointer-events: none;">
      <div style="display: flex; align-items: center; gap: 8px;">
        ${flagHtml}
        <b style="font-size: 0.95rem; white-space: nowrap;">${ptName}</b>
      </div>
      ${titlesHtml}
    </div>
  `})
  .onPolygonHover(hoverD => {
    const container = document.getElementById('globeViz');
    if (hoverD && isParticipating(hoverD)) {
      container.style.cursor = 'pointer';
      world
        .polygonAltitude(d => d === hoverD ? 0.08 : (isParticipating(d) ? 0.01 : 0.002))
        .polygonCapColor(d => d === hoverD ? '#ffc800' : (isParticipating(d) ? '#be1e1e' : 'rgba(190, 30, 30, 0.35)'))
        .polygonStrokeColor(d => d === hoverD ? '#ffffff' : (isParticipating(d) ? '#28cdd2' : '#008c9b40'));
    } else {
      container.style.cursor = 'default';
      world
        .polygonAltitude(d => isParticipating(d) ? 0.01 : 0.002)
        .polygonCapColor(d => isParticipating(d) ? '#be1e1e' : 'rgba(190, 30, 30, 0.35)')
        .polygonStrokeColor(d => isParticipating(d) ? '#28cdd2' : '#008c9b40');
    }
  })
  .onPolygonClick(d => {
    if (d && isParticipating(d)) {
      const countryName = d.properties.ADMIN;
      const ptName = getCountryNamePT(d.properties);
      const recipe = fetchedRecipesData[countryName];

      // Calculate geographic center and bounding box area
      const { lat, lng, area } = getPolygonCenterAndArea(d);

      // Determine zoom level based on physical size (bounding box area)
      let zoomAltitude;
      if (area < 15) {
        zoomAltitude = 1.25; // Swiss, Belgium, etc. - Very deep zoom
      } else if (area < 80) {
        zoomAltitude = 1.5;  // Germany, Japan, Spain, France, UK - Deep zoom
      } else if (area < 400) {
        zoomAltitude = 1.95; // Saudi Arabia, Mexico, Colombia - Medium zoom
      } else {
        zoomAltitude = 2.4;  // Brazil, USA, Canada, Australia - Wide zoom
      }

      // Add a slight height adjustment for mobile viewports
      const isMobile = window.innerWidth <= 480;
      if (isMobile) {
        zoomAltitude += 0.45;
      }

      // Stop auto-rotation upon manual interaction/selection
      if (world.controls().autoRotate) {
        world.controls().autoRotate = false;
      }

      // Smooth camera transition to focus on the country
      world.pointOfView({ lat, lng, altitude: zoomAltitude }, 800);

      // Open the modal after a short delay so the user experiences the globe's visual pan transition
      if (recipe) {
        setTimeout(() => {
          openModal(ptName, recipe, d.properties.ISO_A2, countryName);
        }, 300);
      } else {
        setTimeout(() => {
          openModal(ptName, {
            dish: "Iguarias Locais",
            description: `Ainda estamos reunindo receitas tradicionais para ${ptName}. Fique ligado para mais novidades culinárias da Copa!`,
            image: "https://images.unsplash.com/photo-1495195134817-a165d429281b?w=800&auto=format&fit=crop"
          }, d.properties.ISO_A2, countryName);
        }, 300);
      }
    }
  });

// Set Solid Ocean Color (#233c91) on the globe base sphere
world.globeMaterial().color.set('#284650');
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

// Calculate geographic center and approximate bounding box area of a polygon/multipolygon
function getPolygonCenterAndArea(feature) {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  let totalPts = 0;
  let sumLat = 0;
  let sumLng = 0;

  function processRing(ring) {
    ring.forEach(pt => {
      const lng = pt[0];
      const lat = pt[1];
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;

      sumLng += lng;
      sumLat += lat;
      totalPts++;
    });
  }

  const geom = feature.geometry;
  if (geom.type === 'Polygon') {
    geom.coordinates.forEach(processRing);
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates.forEach(polygon => {
      polygon.forEach(processRing);
    });
  }

  const centerLat = totalPts > 0 ? sumLat / totalPts : 0;
  const centerLng = totalPts > 0 ? sumLng / totalPts : 0;
  const dLng = maxLng - minLng;
  const dLat = maxLat - minLat;
  const bboxArea = dLng * dLat;

  return {
    lat: centerLat,
    lng: centerLng,
    area: bboxArea || 1
  };
}

// Start loading recipes from sheet immediately
const recipesPromise = loadRecipesFromSheet();

// Load GeoJSON data for countries and sheet recipes in parallel
Promise.all([
  fetch('./ne_110m_admin_0_countries.geojson').then(res => res.json()),
  recipesPromise
])
  .then(([countries]) => {
    // Render all countries so outlines cover the entire globe
    world.polygonsData(countries.features);

    // Initialize the glassmorphic search panel with country rows
    initializeCountrySearch(countries.features);

    // Make default globe size 25% smaller on mobile (increase altitude to 3.3 to zoom out)
    const isMobile = window.innerWidth <= 480;
    world.pointOfView({ lat: -14.235, lng: -51.925, altitude: isMobile ? 3.3 : 2.5 }, 0);

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

// Setup glassmorphic floating search list and filter logic
function initializeCountrySearch(features) {
  const listEl = document.getElementById('countryList');
  const searchInput = document.getElementById('countrySearch');
  
  const participatingFeatures = features
    .filter(f => isParticipating(f))
    .map(f => {
      return {
        feature: f,
        namePT: getCountryNamePT(f.properties),
        nameEN: f.properties.ADMIN,
        isoCode: f.properties.ISO_A2
      };
    });
  
  // Sort alphabetically by Portuguese name
  participatingFeatures.sort((a, b) => a.namePT.localeCompare(b.namePT, 'pt-BR'));
  
  // Populate UI items
  function renderList(filteredFeatures) {
    listEl.innerHTML = '';
    
    filteredFeatures.forEach(item => {
      const li = document.createElement('li');
      li.className = 'country-item';
      
      const flagUrl = item.isoCode && item.isoCode !== '-99'
        ? `https://flagcdn.com/w80/${item.isoCode.toLowerCase()}.png`
        : '';
        
      const flagHtml = flagUrl
        ? `<img src="${flagUrl}" class="search-flag" alt="${item.namePT} flag">`
        : `<div class="search-flag-placeholder"></div>`;
        
      li.innerHTML = `
        ${flagHtml}
        <span class="search-country-name">${item.namePT}</span>
      `;
      
      // Click zooms to country and triggers details modal
      li.addEventListener('click', () => {
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer && searchContainer.classList.contains('is-open')) {
          searchContainer.classList.remove('is-open');
          document.body.classList.remove('search-open');
          searchInput.value = '';
          searchInput.blur();
          renderList(participatingFeatures);
        }

        const d = item.feature;
        const countryName = d.properties.ADMIN;
        const ptName = item.namePT;
        const recipe = fetchedRecipesData[countryName];
        
        // Bounding box area specific zoom calculation
        const { lat, lng, area } = getPolygonCenterAndArea(d);
        
        let zoomAltitude;
        if (area < 15) {
          zoomAltitude = 1.25;
        } else if (area < 80) {
          zoomAltitude = 1.5;
        } else if (area < 400) {
          zoomAltitude = 1.95;
        } else {
          zoomAltitude = 2.4;
        }
        
        const isMobile = window.innerWidth <= 480;
        if (isMobile) {
          zoomAltitude += 0.45;
        }
        
        if (world.controls().autoRotate) {
          world.controls().autoRotate = false;
        }
        
        world.pointOfView({ lat, lng, altitude: zoomAltitude }, 800);
        
        if (recipe) {
          setTimeout(() => {
            openModal(ptName, recipe, d.properties.ISO_A2, countryName);
          }, 300);
        } else {
          setTimeout(() => {
            openModal(ptName, {
              dish: "Iguarias Locais",
              description: `Ainda estamos reunindo receitas tradicionais para ${ptName}. Fique ligado para mais novidades culinárias da Copa!`,
              image: "https://images.unsplash.com/photo-1495195134817-a165d429281b?w=800&auto=format&fit=crop"
            }, d.properties.ISO_A2, countryName);
          }, 300);
        }
      });
      
      listEl.appendChild(li);
    });
  }
  
  renderList(participatingFeatures);
  
  // Real-time search filter matching country names and dish titles
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const filtered = participatingFeatures.filter(item => {
      const normPT = item.namePT.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const normEN = item.nameEN.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      const recipe = fetchedRecipesData[item.nameEN];
      const normDish = recipe && recipe.dish
        ? recipe.dish.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        : "";
      
      return normPT.includes(query) || normEN.includes(query) || normDish.includes(query);
    });
    
    renderList(filtered);
  });

  // Mobile full screen search overlay open/close logic
  const searchContainer = document.querySelector('.search-container');
  const closeSearchBtn = document.getElementById('closeSearch');
  
  searchInput.addEventListener('focus', () => {
    if (window.innerWidth <= 768) {
      searchContainer.classList.add('is-open');
      document.body.classList.add('search-open');
    }
  });
  
  searchInput.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      searchContainer.classList.add('is-open');
      document.body.classList.add('search-open');
    }
  });

  if (closeSearchBtn) {
    closeSearchBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent refocussing the search input
      searchContainer.classList.remove('is-open');
      document.body.classList.remove('search-open');
      searchInput.value = '';
      searchInput.blur();
      renderList(participatingFeatures);
    });
  }
}

// Modal Logic
function openModal(country, recipe, isoCode, englishName) {
  countryNameEl.textContent = country;
  recipeDishEl.textContent = recipe.dish;
  recipeDescEl.textContent = recipe.description || "";

  // Render Flag CDN Squared flag icon
  const flagEl = document.getElementById('countryFlag');
  if (isoCode && isoCode !== '-99') {
    flagEl.src = `https://flagcdn.com/w80/${isoCode.toLowerCase()}.png`;
    flagEl.style.display = 'block';
  } else {
    flagEl.style.display = 'none';
  }

  // Update World Cup titles count dynamically
  const titlesEl = document.getElementById('countryTitles');
  if (titlesEl) {
    const titles = worldCupTitles[englishName] || 0;
    titlesEl.innerHTML = `🏆 ${titles} ${titles === 1 ? 'título' : 'títulos'}`;
    if (titles > 0) {
      titlesEl.style.color = 'var(--accent-color)';
    } else {
      titlesEl.style.color = '#888';
    }
  }

  // Populate dynamic sheet-fed ingredients and instructions
  const ingredientsSection = document.getElementById('ingredientsSection');
  const ingredientsList = document.getElementById('ingredientsList');
  const instructionsSection = document.getElementById('instructionsSection');
  const instructionsList = document.getElementById('instructionsList');

  if (recipe.ingredients && recipe.ingredients.length > 0) {
    ingredientsList.innerHTML = '';
    recipe.ingredients.forEach(ing => {
      const li = document.createElement('li');
      li.className = 'ingredient-item';
      li.innerHTML = `
        <span class="ingredient-bullet">•</span>
        <span class="ingredient-name">${ing.name}</span>
        ${ing.quantity ? `<span class="ingredient-qty">${ing.quantity}</span>` : ''}
      `;
      ingredientsList.appendChild(li);
    });
    ingredientsSection.classList.remove('hidden');
  } else {
    ingredientsSection.classList.add('hidden');
  }

  if (recipe.instructions && recipe.instructions.length > 0) {
    instructionsList.innerHTML = '';
    recipe.instructions.forEach((step, idx) => {
      const li = document.createElement('li');
      li.className = 'instruction-step';
      li.innerHTML = `
        <span class="step-number">${idx + 1}</span>
        <span class="step-text">${step}</span>
      `;
      instructionsList.appendChild(li);
    });
    instructionsSection.classList.remove('hidden');
  } else {
    instructionsSection.classList.add('hidden');
  }

  recipeImageEl.src = recipe.image;
  modal.classList.remove('hidden');
}

function closeModal() {
  const shareMenu = document.getElementById('shareMenu');
  if (shareMenu) {
    shareMenu.classList.add('hidden');
  }

  modal.classList.add('hidden');
  
  // Resume auto-rotation when the modal is closed
  world.controls().autoRotate = true;

  // Reset camera vertical rotation (lat to 0) and altitude back to defaults
  const currentPOV = world.pointOfView();
  const isMobile = window.innerWidth <= 480;
  world.pointOfView({
    lat: 0,
    lng: currentPOV.lng,
    altitude: isMobile ? 3.3 : 2.5
  }, 800); // smooth 800ms transition
}

closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    closeModal();
  }
});

// Dismiss modal or collapse search container on Escape key press
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer && searchContainer.classList.contains('is-open')) {
      searchContainer.classList.remove('is-open');
      document.body.classList.remove('search-open');
      const searchInput = document.getElementById('countrySearch');
      if (searchInput) {
        searchInput.value = '';
        searchInput.blur();
        searchInput.dispatchEvent(new Event('input'));
      }
    } else if (!modal.classList.contains('hidden')) {
      closeModal();
    }
  }
});

// Handle resize
window.addEventListener('resize', () => {
  world.width(window.innerWidth);
  world.height(window.innerHeight);
});

// ==========================================
// RECIPE SHARE BUTTON & SOCIAL MEDIA MENU
// ==========================================
const shareUrl = "https://s3.glbimg.com/v1/AUTH_e03f7a1106bb438e970511f892f07c35/receitas/2026/pagina-especial-receitas-copa/index.html";

function getShareMessage() {
  const country = document.getElementById('countryName').textContent;
  const dish = document.getElementById('recipeDish').textContent;
  return `Confira a receita tradicional de *${dish}* do *${country}* na Copa dos Sabores! 🏆🥘 Veja mais aqui: ${shareUrl}`;
}

function copyTextToClipboard(text, successCallback) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(successCallback)
      .catch(err => console.error('Erro ao copiar: ', err));
  } else {
    // Fallback using document.execCommand
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      successCallback();
    } catch (err) {
      console.error('Fallback error during copy:', err);
    }
    document.body.removeChild(textArea);
  }
}

const shareBtn = document.getElementById('shareRecipeBtn');
const shareMenu = document.getElementById('shareMenu');
const shareWA = document.getElementById('shareWA');
const shareTW = document.getElementById('shareTW');
const shareIG = document.getElementById('shareIG');
const shareCopy = document.getElementById('shareCopy');

if (shareBtn && shareMenu) {
  shareBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    shareMenu.classList.toggle('hidden');
  });
}

if (shareWA) {
  shareWA.addEventListener('click', () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(getShareMessage())}`;
    window.open(url, '_blank');
    shareMenu.classList.add('hidden');
  });
}

if (shareTW) {
  shareTW.addEventListener('click', () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(getShareMessage())}`;
    window.open(url, '_blank');
    shareMenu.classList.add('hidden');
  });
}

if (shareIG) {
  shareIG.addEventListener('click', () => {
    const shareText = getShareMessage();
    copyTextToClipboard(shareText, () => {
      const span = shareIG.querySelector('span');
      const originalText = span.textContent;
      span.textContent = 'Copiado no IG! 📸';
      setTimeout(() => {
        span.textContent = originalText;
        shareMenu.classList.add('hidden');
      }, 2000);
    });
  });
}

if (shareCopy) {
  shareCopy.addEventListener('click', () => {
    copyTextToClipboard(shareUrl, () => {
      const span = shareCopy.querySelector('span');
      const originalText = span.textContent;
      span.textContent = 'Link Copiado! ✓';
      setTimeout(() => {
        span.textContent = originalText;
        shareMenu.classList.add('hidden');
      }, 2000);
    });
  });
}

// Global outside click listener to close sharing dropdown
window.addEventListener('click', (e) => {
  if (shareMenu && !shareMenu.classList.contains('hidden')) {
    if (shareBtn && !shareBtn.contains(e.target) && !shareMenu.contains(e.target)) {
      shareMenu.classList.add('hidden');
    }
  }
});
