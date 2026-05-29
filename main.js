import { recipesData } from './data.js';

// Participating teams represented by the current world map plus the UK subdivision overlay.
// Cape Verde and Curaçao are not present in the current map files.
const worldCupTeams = [
  "Canada", "United States of America", "Mexico",
  "Australia", "Saudi Arabia", "Qatar", "South Korea", "Iran", "Iraq", "Japan", "Jordan", "Uzbekistan",
  "South Africa", "Algeria", "Ivory Coast", "Egypt", "Ghana", "Morocco", "Democratic Republic of the Congo", "Senegal", "Tunisia",
  "Argentina", "Brazil", "Colombia", "Ecuador", "Paraguay", "Uruguay",
  "New Zealand",
  "Germany", "Austria", "Belgium", "Bosnia and Herzegovina", "Croatia", "Spain", "France", "Netherlands", "Norway", "Portugal", "Czechia", "Sweden", "Switzerland", "Turkey", "England", "Scotland",
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
  "England": 1
};

const isParticipating = (d) => {
  if (!d || !d.properties) return false;
  return worldCupTeams.includes(d.properties.ADMIN);
};

function getCountryIsoA2(d) {
  if (!d) return '';
  if (countryIsoOverrides[d.ADMIN]) return countryIsoOverrides[d.ADMIN];
  if (d.ISO_A2 && d.ISO_A2 !== '-99') return d.ISO_A2;
  return '';
}

function getFlagUrl(d) {
  const isoCode = getCountryIsoA2(d);
  return isoCode ? `https://flagcdn.com/w80/${isoCode.toLowerCase()}.png` : '';
}

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
  "Alemanha": "Germany",
  "Marrocos": "Morocco"
};

let fetchedRecipesData = {};
const initialGlobeLat = 8;
const originalGlobeLng = -51.925;
const initialGlobeRotationOffset = -10;
const initialGlobeLng = originalGlobeLng + initialGlobeRotationOffset;
let rotationControlMode = 'edge-hold';
const EDGE_HOLD_SPIN_DEGREES_PER_SECOND = 70;
const countryIsoOverrides = {
  France: 'FR',
  England: 'GB-ENG',
  Scotland: 'GB-SCT',
  Wales: 'GB-WLS',
  'Northern Ireland': 'GB-NIR'
};

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
let hoveredPolygon = null;
let hoveredCountryName = null;
let autoRotatePausedByHover = false;
let hoverResetTimeout = null;

function getDefaultGlobeView() {
  const isMobile = window.innerWidth <= 480;
  return {
    lat: initialGlobeLat,
    lng: initialGlobeLng,
    altitude: isMobile ? 3.65 : 2.5
  };
}

function setDefaultGlobeView(duration = 0) {
  world.pointOfView(getDefaultGlobeView(), duration);
}

function getHoverAltitude(feature) {
  const { area } = getPolygonCenterAndArea(feature);

  if (area < 15) return 0.07;
  if (area < 80) return 0.055;
  if (area < 400) return 0.045;
  return 0.035;
}

function normalizeMapFeature(feature) {
  const ukSubunitNames = new Set(['England', 'Scotland', 'Wales', 'Northern Ireland']);
  const name = feature.properties.GEOUNIT || feature.properties.NAME;

  if (feature.properties.ADMIN === 'United Kingdom' && ukSubunitNames.has(name)) {
    return {
      ...feature,
      properties: {
        ...feature.properties,
        ADMIN: name,
        NAME: name,
        NAME_LONG: name,
        ISO_A2: countryIsoOverrides[name] || feature.properties.ISO_A2
      }
    };
  }

  return feature;
}

function resetHoverStyles() {
  const container = document.getElementById('globeViz');
  if (container) {
    container.style.cursor = 'default';
  }

  if (autoRotatePausedByHover) {
    world.controls().autoRotate = true;
    autoRotatePausedByHover = false;
  }

  world
    .polygonAltitude(d => isParticipating(d) ? 0.01 : 0.002)
    .polygonCapColor(d => isParticipating(d) ? '#a5147d' : '#5a2864')
    .polygonSideColor(d => isParticipating(d) ? '#5a2864' : 'rgba(0, 0, 0, 0)')
    .polygonStrokeColor(d => isParticipating(d) ? '#f0739b' : '#a5147d40');
}

// Setup Globe
const world = Globe()
  (document.getElementById('globeViz'))
  .backgroundColor('rgba(0, 0, 0, 0)')
  .atmosphereColor('#008c9b')
  .atmosphereAltitude(0.2)
  .polygonAltitude(d => isParticipating(d) ? 0.01 : 0.002)
  .polygonCapColor(d => isParticipating(d) ? '#a5147d' : '#5a2864') // participating vs muted red for other lands
  .polygonSideColor(d => isParticipating(d) ? '#5a2864' : 'rgba(0, 0, 0, 0)')
  .polygonStrokeColor(d => isParticipating(d) ? '#f0739b' : '#a5147d40') // yellow borders (#ffc800)
  .polygonLabel(({ properties: d }) => {
    const ptName = getCountryNamePT(d);
    const participating = worldCupTeams.includes(d.ADMIN);
    const titles = worldCupTitles[d.ADMIN] || 0;
    const flagUrl = getFlagUrl(d);
    const flagHtml = flagUrl
      ? `<img src="${flagUrl}" style="width: 22px; height: 22px; object-fit: cover; border-radius: 4px; border: 1px solid #ffc800; display: inline-block;" alt="flag">`
      : '';
    const titlesHtml = participating
      ? `<div style="font-size: 0.8rem; margin-top: 4px; color: ${titles > 0 ? '#ffc800' : '#aaa'}; display: flex; align-items: center; gap: 4px;">
          🏆 ${titles} ${titles === 1 ? 'título' : 'títulos'}
         </div>`
      : '';
    return `
    <div style="background: rgba(0, 0, 0, 0.9); color: white; padding: 8px 12px; border-radius: 8px; font-family: 'Globo Tx', sans-serif; border: 1px solid ${participating ? '#ffc800' : 'rgba(255, 255, 255, 0.15)'}; display: flex; flex-direction: column; align-items: center; pointer-events: none;">
      <div style="display: flex; align-items: center; gap: 8px;">
        ${flagHtml}
        <b style="font-size: 0.95rem; white-space: nowrap;">${ptName}</b>
      </div>
      ${titlesHtml}
    </div>
  `})
  .onPolygonHover(hoverD => {
    if (hoverResetTimeout && hoverD) {
      window.clearTimeout(hoverResetTimeout);
      hoverResetTimeout = null;
    }

    if (hoverD === hoveredPolygon) return;

    const container = document.getElementById('globeViz');
    if (hoverD && isParticipating(hoverD)) {
      hoveredPolygon = hoverD;
      hoveredCountryName = hoverD.properties.ADMIN;
      container.style.cursor = 'pointer';
      if (world.controls().autoRotate) {
        world.controls().autoRotate = false;
        autoRotatePausedByHover = true;
      }
      world
        .polygonAltitude(d => d.properties.ADMIN === hoveredCountryName ? getHoverAltitude(hoverD) : (isParticipating(d) ? 0.01 : 0.002))
        .polygonCapColor(d => d.properties.ADMIN === hoveredCountryName ? '#ffc800' : (isParticipating(d) ? '#a5147d' : '#5a2864'))
        .polygonSideColor(d => d.properties.ADMIN === hoveredCountryName ? '#ffc800' : (isParticipating(d) ? '#5a2864' : 'rgba(0, 0, 0, 0)'))
        .polygonStrokeColor(d => d.properties.ADMIN === hoveredCountryName ? '#ffffff' : (isParticipating(d) ? '#f0739b' : '#a5147d40'));
    } else {
      hoveredPolygon = null;
      hoveredCountryName = null;
      hoverResetTimeout = window.setTimeout(() => {
        hoverResetTimeout = null;
        resetHoverStyles();
      }, 140);
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
          openModal(ptName, recipe, getCountryIsoA2(d.properties), countryName);
        }, 300);
      } else {
        setTimeout(() => {
          openModal(ptName, {
            dish: "Iguarias Locais",
            description: `Ainda estamos reunindo receitas tradicionais para ${ptName}. Fique ligado para mais novidades culinárias da Copa!`,
            image: "https://images.unsplash.com/photo-1495195134817-a165d429281b?w=800&auto=format&fit=crop"
          }, getCountryIsoA2(d.properties), countryName);
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
    "England": "Inglaterra",
    "Scotland": "Escócia",
    "Wales": "País de Gales",
    "Northern Ireland": "Irlanda do Norte",
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
    const mapFeatures = countries.features.map(normalizeMapFeature);

    // Render all countries so outlines cover the entire globe
    world.polygonsData(mapFeatures);

    // Initialize the glassmorphic search panel with country rows
    initializeCountrySearch(mapFeatures);

    // Setup Auto-rotation
    world.controls().autoRotate = true;
    world.controls().autoRotateSpeed = 0.25; // Slow down by 50%
    world.controls().enableZoom = false;   // Disable default scroll zoom
    world.controls().enableRotate = false; // Disable default dragging (prevents scroll conflicts)
    setDefaultGlobeView(0);

    // Custom Globe Controls (Placed inside .then to ensure controls are initialized)
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const rotationDragControl = document.getElementById('rotationDragControl');
    const rotationDragThumb = document.getElementById('rotationDragThumb');
    const rotationModeButtons = document.querySelectorAll('[data-rotation-mode]');

    rotationModeButtons.forEach(button => {
      button.classList.toggle('is-active', button.dataset.rotationMode === rotationControlMode);
      button.addEventListener('click', () => {
        rotationControlMode = button.dataset.rotationMode || 'edge-hold';
        rotationModeButtons.forEach(item => {
          item.classList.toggle('is-active', item === button);
        });
      });
    });

    // Handle spring-back drag rotation without enabling native globe gestures in embeds
    let isDraggingRotation = false;
    let dragStartX = 0;
    let dragStartLng = 0;
    let trackWidth = 1;
    let edgeSpinFrame = null;
    let edgeSpinDirection = 0;
    let lastEdgeSpinTime = 0;

    function getRotationMaxOffset() {
      return Math.max(28, (trackWidth / 2) - 14);
    }

    function stopEdgeSpin() {
      edgeSpinDirection = 0;
      lastEdgeSpinTime = 0;
      if (edgeSpinFrame) {
        window.cancelAnimationFrame(edgeSpinFrame);
        edgeSpinFrame = null;
      }
    }

    function runEdgeSpin(timestamp) {
      if (!isDraggingRotation || !edgeSpinDirection) {
        stopEdgeSpin();
        return;
      }

      if (!lastEdgeSpinTime) {
        lastEdgeSpinTime = timestamp;
      }

      const elapsed = Math.min(64, timestamp - lastEdgeSpinTime);
      lastEdgeSpinTime = timestamp;
      const spinDelta = edgeSpinDirection * EDGE_HOLD_SPIN_DEGREES_PER_SECOND * (elapsed / 1000);
      const currentPOV = world.pointOfView();

      dragStartLng += spinDelta;
      world.pointOfView({
        lat: currentPOV.lat,
        lng: currentPOV.lng + spinDelta,
        altitude: currentPOV.altitude
      }, 0);

      edgeSpinFrame = window.requestAnimationFrame(runEdgeSpin);
    }

    function startEdgeSpin(direction) {
      if (rotationControlMode !== 'edge-hold') return;
      if (edgeSpinDirection === direction && edgeSpinFrame) return;

      stopEdgeSpin();
      edgeSpinDirection = direction;
      edgeSpinFrame = window.requestAnimationFrame(runEdgeSpin);
    }

    function setRotationThumb(deltaX) {
      if (!rotationDragThumb) return;
      const maxOffset = getRotationMaxOffset();
      const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
      rotationDragThumb.style.transform = `translate(-50%, -50%) translateX(${clampedOffset}px)`;
      if (rotationDragControl) {
        rotationDragControl.setAttribute('aria-valuenow', String(Math.round((clampedOffset / maxOffset) * 100)));
      }
      return { clampedOffset, maxOffset };
    }

    function resetRotationThumb() {
      if (!rotationDragThumb) return;
      rotationDragThumb.classList.add('is-returning');
      rotationDragThumb.style.transform = 'translate(-50%, -50%) translateX(0)';
      if (rotationDragControl) {
        rotationDragControl.setAttribute('aria-valuenow', '0');
      }
      window.setTimeout(() => {
        rotationDragThumb.classList.remove('is-returning');
      }, 220);
    }

    function moveRotation(clientX) {
      const deltaX = clientX - dragStartX;
      const currentPOV = world.pointOfView();
      const { clampedOffset, maxOffset } = setRotationThumb(deltaX);
      const rotationDelta = rotationControlMode === 'drag-360'
        ? clampedOffset * (360 / maxOffset)
        : clampedOffset * (180 / Math.max(trackWidth, 1));

      world.pointOfView({
        lat: currentPOV.lat,
        lng: dragStartLng + rotationDelta,
        altitude: currentPOV.altitude
      }, 0);

      if (Math.abs(clampedOffset) >= maxOffset - 0.5 && rotationControlMode === 'edge-hold') {
        startEdgeSpin(clampedOffset > 0 ? 1 : -1);
      } else {
        stopEdgeSpin();
      }
    }

    function stopRotationDrag() {
      if (!isDraggingRotation) return;
      isDraggingRotation = false;
      stopEdgeSpin();
      resetRotationThumb();
      world.controls().autoRotate = true;
      window.removeEventListener('pointermove', onRotationPointerMove);
      window.removeEventListener('pointerup', stopRotationDrag);
      window.removeEventListener('pointercancel', stopRotationDrag);
    }

    function onRotationPointerMove(e) {
      if (!isDraggingRotation) return;
      e.preventDefault();
      moveRotation(e.clientX);
    }

    if (rotationDragControl) {
      rotationDragControl.addEventListener('pointerdown', (e) => {
        e.preventDefault();

        // Disable autoRotate upon manual interaction
        if (world.controls().autoRotate) {
          world.controls().autoRotate = false;
        }

        const rect = rotationDragControl.getBoundingClientRect();
        trackWidth = rect.width;
        dragStartX = e.clientX;
        dragStartLng = world.pointOfView().lng;
        isDraggingRotation = true;
        if (rotationDragThumb) {
          rotationDragThumb.classList.remove('is-returning');
        }

        window.addEventListener('pointermove', onRotationPointerMove, { passive: false });
        window.addEventListener('pointerup', stopRotationDrag);
        window.addEventListener('pointercancel', stopRotationDrag);
      });
    }

    window.addEventListener('keydown', (e) => {
      if (!rotationDragControl || document.activeElement !== rotationDragControl) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();

      if (world.controls().autoRotate) {
        world.controls().autoRotate = false;
      }

      const currentPOV = world.pointOfView();
      const direction = e.key === 'ArrowRight' ? 1 : -1;
      world.pointOfView({
        lat: currentPOV.lat,
        lng: currentPOV.lng + (direction * 8),
        altitude: currentPOV.altitude
      }, 150);
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

    // Fade in the globe Viz after a minor rendering buffer delay (150ms) to ensure
    // the WebGL context compiles and renders the first frame cleanly without visual pops/flickers
    const globeContainer = document.getElementById('globeViz');
    if (globeContainer) {
      setTimeout(() => {
        setDefaultGlobeView(0);
        globeContainer.classList.add('is-ready');
      }, 150);
    }
  });

// Setup glassmorphic floating search list and filter logic
function initializeCountrySearch(features) {
  const listEl = document.getElementById('countryList');
  const searchInput = document.getElementById('countrySearch');
  
  const featureGroups = features
    .filter(f => isParticipating(f))
    .reduce((groups, feature) => {
      const countryName = feature.properties.ADMIN;
      if (!groups.has(countryName)) {
        groups.set(countryName, []);
      }
      groups.get(countryName).push(feature);
      return groups;
    }, new Map());

  const participatingFeatures = Array.from(featureGroups.entries())
    .map(([countryName, countryFeatures]) => {
      const feature = countryFeatures[0];

      return {
        feature,
        namePT: getCountryNamePT(feature.properties),
        nameEN: countryName,
        isoCode: getCountryIsoA2(feature.properties)
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
      
      const flagUrl = getFlagUrl(item.feature.properties);
        
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
            openModal(ptName, recipe, getCountryIsoA2(d.properties), countryName);
          }, 300);
        } else {
          setTimeout(() => {
            openModal(ptName, {
              dish: "Iguarias Locais",
              description: `Ainda estamos reunindo receitas tradicionais para ${ptName}. Fique ligado para mais novidades culinárias da Copa!`,
              image: "https://images.unsplash.com/photo-1495195134817-a165d429281b?w=800&auto=format&fit=crop"
            }, getCountryIsoA2(d.properties), countryName);
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

  // Populate dynamic sheet-fed ingredients
  const ingredientsSection = document.getElementById('ingredientsSection');
  const ingredientsList = document.getElementById('ingredientsList');
  const fullRecipeCta = document.getElementById('fullRecipeCta');

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

  if (fullRecipeCta) {
    fullRecipeCta.classList.remove('hidden');
  }

  recipeImageEl.src = recipe.image;
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
  
  // Resume auto-rotation when the modal is closed
  world.controls().autoRotate = true;

  // Reset camera back to the initial framing after closing a recipe
  setDefaultGlobeView(800);
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
