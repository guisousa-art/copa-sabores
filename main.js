import countriesGeoJsonUrl from './ne_110m_admin_0_countries.geojson?url';
import recipesCsvUrl from './assets/paises-mapa-v4.csv?url';

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

function hasRecipeForCountry(countryName) {
  return Boolean(countryName && fetchedRecipesData[countryName]);
}

const isParticipating = (d) => {
  if (!d || !d.properties) return false;
  return hasRecipeForCountry(d.properties.ADMIN);
};

function getCountryIsoA2(d) {
  if (!d) return '';
  if (countryIsoOverrides[d.ADMIN]) return countryIsoOverrides[d.ADMIN];
  if (d.ISO_A2 && d.ISO_A2 !== '-99') return d.ISO_A2;
  return '';
}

function getFlagUrl(d) {
  const isoCode = getCountryIsoA2(d);
  return getFlagUrlByIso(isoCode);
}

function getFlagUrlByIso(isoCode) {
  return isoCode ? `https://flagcdn.com/w80/${isoCode.toLowerCase()}.png` : '';
}

let fetchedRecipesData = {};
let countrySearchItems = [];
const RECIPE_IMAGE_FALLBACK = "https://images.unsplash.com/photo-1495195134817-a165d429281b?w=800&auto=format&fit=crop";
const initialGlobeLat = 8;
const originalGlobeLng = -51.925;
const initialGlobeRotationOffset = -10;
const initialGlobeLng = originalGlobeLng + initialGlobeRotationOffset;
const EDGE_HOLD_SPIN_DEGREES_PER_SECOND = 131.25;
const countryIsoOverrides = {
  France: 'FR',
  Norway: 'NO',
  England: 'GB-ENG',
  Scotland: 'GB-SCT',
  Wales: 'GB-WLS',
  'Northern Ireland': 'GB-NIR'
};
const csvCountryFallbackMetadata = {
  "cabo verde": {
    isoCode: "CV",
    lat: 16.5388,
    lng: -23.0418
  },
  "curacao": {
    isoCode: "CW",
    lat: 12.1696,
    lng: -68.99
  }
};
const PARTICIPATING_ALTITUDE = 0.018;
const NON_PARTICIPATING_ALTITUDE = 0.01;
const PARTICIPATING_CAP_COLOR = '#a5147d';
const NON_PARTICIPATING_CAP_COLOR = '#5a2864';
const PARTICIPATING_SIDE_COLOR = '#5a2864';
const NON_PARTICIPATING_SIDE_COLOR = 'rgba(90, 40, 100, 0.48)';
const PARTICIPATING_STROKE_COLOR = '#5a2864';
const NON_PARTICIPATING_STROKE_COLOR = 'rgba(165, 20, 125, 0.3)';
const COUNTRY_GEOMETRY_SCALE = 0.9875;
const HOVER_EXTRUSION_MULTIPLIER = 1.15;

function getBasePolygonAltitude(d) {
  return isParticipating(d) ? PARTICIPATING_ALTITUDE : NON_PARTICIPATING_ALTITUDE;
}

function getBasePolygonCapColor(d) {
  return isParticipating(d) ? PARTICIPATING_CAP_COLOR : NON_PARTICIPATING_CAP_COLOR;
}

function getBasePolygonSideColor(d) {
  return isParticipating(d) ? PARTICIPATING_SIDE_COLOR : NON_PARTICIPATING_SIDE_COLOR;
}

function getBasePolygonStrokeColor(d) {
  return isParticipating(d) ? PARTICIPATING_STROKE_COLOR : NON_PARTICIPATING_STROKE_COLOR;
}

function getRingCenter(ring) {
  const center = ring.reduce((acc, [lng, lat]) => {
    acc.lng += lng;
    acc.lat += lat;
    return acc;
  }, { lng: 0, lat: 0 });

  return {
    lng: center.lng / ring.length,
    lat: center.lat / ring.length
  };
}

function scaleRingFromCenter(ring, center) {
  return ring.map(([lng, lat]) => [
    center.lng + ((lng - center.lng) * COUNTRY_GEOMETRY_SCALE),
    center.lat + ((lat - center.lat) * COUNTRY_GEOMETRY_SCALE)
  ]);
}

function scalePolygonCoordinates(polygon) {
  const exteriorRing = polygon[0];
  if (!exteriorRing || exteriorRing.length < 3) return polygon;

  const center = getRingCenter(exteriorRing);
  return polygon.map(ring => scaleRingFromCenter(ring, center));
}

function scaleCountryGeometry(feature) {
  if (COUNTRY_GEOMETRY_SCALE === 1 || !feature.geometry) return feature;

  if (feature.geometry.type === 'Polygon') {
    return {
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: scalePolygonCoordinates(feature.geometry.coordinates)
      }
    };
  }

  if (feature.geometry.type === 'MultiPolygon') {
    return {
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: feature.geometry.coordinates.map(scalePolygonCoordinates)
      }
    };
  }

  return feature;
}

// CSV Parser to handle comma-delimited fields, quotes, and newlines
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

function normalizeLookupText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const csvCountryNameAliases = {
  "fraca": "franca",
  "holanda": "netherlands",
  "rd do congo": "democratic republic of the congo",
  "republica da coreia": "south korea",
  "ri ira": "iran"
};

function getCsvCountryFallbackMetadata(countryName) {
  return csvCountryFallbackMetadata[normalizeLookupText(countryName)] || {};
}

function getOptimizedRecipeImageUrl(imageUrl) {
  const trimmedUrl = imageUrl ? imageUrl.trim() : "";
  if (!trimmedUrl) return "";

  return trimmedUrl.replace(/\/(\d{3,4})x0\/smart\//g, (match, width) => (
    Number(width) > 640 ? '/640x0/smart/' : match
  ));
}

function findCountryFeature(countryLookup, countryName) {
  const normalizedName = normalizeLookupText(countryName);
  const directMatch = countryLookup.get(normalizedName);
  if (directMatch) return directMatch;

  const alias = csvCountryNameAliases[normalizedName];
  return alias ? countryLookup.get(alias) : null;
}

function getFeatureLookupNames(feature) {
  const d = feature.properties || {};
  return [
    d.ADMIN,
    d.NAME,
    d.NAME_LONG,
    d.NAME_PT,
    d.GEOUNIT,
    d.SOVEREIGNT,
    getCountryNamePT(d)
  ].filter(Boolean);
}

function createCountryLookup(features) {
  return features.reduce((lookup, feature) => {
    getFeatureLookupNames(feature).forEach(name => {
      const key = normalizeLookupText(name);
      if (key && !lookup.has(key)) {
        lookup.set(key, feature);
      }
    });
    return lookup;
  }, new Map());
}

function buildRecipesFromCsv(csvText, features) {
  const parsed = parseCSV(csvText);
  if (parsed.length <= 1) throw new Error("CSV de receitas vazio ou inválido");

  const headers = parsed[0];
  const countryLookup = createCountryLookup(features);
  const recipes = {};
  const searchItems = [];

  for (let i = 1; i < parsed.length; i++) {
    const row = parsed[i];
    if (!row || row.length < 2) continue;

    const countryPt = row[0];
    const dishName = row[1];
    const image = row[2];
    const description = row[3];
    const link = row[4];

    const missingFields = headers.filter((header, index) => !String(row[index] || "").trim());
    if (missingFields.length) {
      console.warn(`País do CSV ignorado por informações incompletas: ${countryPt || `linha ${i + 1}`} (${missingFields.join(", ")})`);
      continue;
    }

    if (!countryPt || !dishName) continue;

    const recipe = {
      dish: dishName.trim(),
      description: description ? description.trim() : "",
      image: getOptimizedRecipeImageUrl(image) || RECIPE_IMAGE_FALLBACK,
      link: link && link.trim() !== "" ? link.trim() : "https://receitas.globo.com/"
    };
    const feature = findCountryFeature(countryLookup, countryPt);
    if (!feature) {
      const fallbackMetadata = getCsvCountryFallbackMetadata(countryPt);
      const recipeKey = countryPt.trim();

      console.warn(`País do CSV não encontrado no mapa: ${countryPt}. Ele será exibido apenas na busca.`);
      recipes[recipeKey] = recipe;
      searchItems.push({
        feature: null,
        namePT: countryPt.trim(),
        nameEN: recipeKey,
        isoCode: fallbackMetadata.isoCode || "",
        lat: fallbackMetadata.lat,
        lng: fallbackMetadata.lng,
        recipe
      });
      continue;
    }

    recipes[feature.properties.ADMIN] = recipe;
    searchItems.push({
      feature,
      namePT: getCountryNamePT(feature.properties),
      nameEN: feature.properties.ADMIN,
      isoCode: getCountryIsoA2(feature.properties),
      recipe
    });
  }

  return { recipes, searchItems };
}

function loadRecipesCsvText() {
  return fetch(recipesCsvUrl)
    .then(res => {
      if (!res.ok) throw new Error("Falha ao buscar CSV local de receitas");
      return res.text();
    })
    .catch(err => {
      console.warn("CSV local de receitas não pôde ser carregado:", err);
      return "";
    });
}

// Elements
const modal = document.getElementById('recipeModal');
const closeModalBtn = document.getElementById('closeModal');
const countryNameEl = document.getElementById('countryName');
const recipeDishEl = document.getElementById('recipeDish');
const recipeDescEl = document.getElementById('recipeDesc');
const recipeImageEl = document.getElementById('recipeImage');
const globeHintEl = document.getElementById('globeHint');
const globeHintSubtleEl = document.getElementById('globeHintSubtle');
let hoveredPolygon = null;
let hoveredCountryName = null;
let autoRotatePausedByHover = false;
let hoverResetTimeout = null;

function dismissGlobeHint() {
  if (!globeHintEl || globeHintEl.classList.contains('is-dismissed')) return;
  globeHintEl.classList.add('is-dismissed');
  if (globeHintSubtleEl) {
    globeHintSubtleEl.classList.add('is-visible');
    globeHintSubtleEl.setAttribute('aria-hidden', 'false');
  }
}

function setupGlobeHintDismissal() {
  if (!globeHintEl) return;

  const dismissOnFirstKeyPress = (event) => {
    if (event.key === 'Tab') return;
    dismissGlobeHint();
    document.removeEventListener('keydown', dismissOnFirstKeyPress);
  };

  document.addEventListener('pointerdown', dismissGlobeHint, { once: true, passive: true });
  document.addEventListener('keydown', dismissOnFirstKeyPress);
}

setupGlobeHintDismissal();

function shouldDisableHoverEffects() {
  return window.innerWidth <= 768 || !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function setupGlobeHorizontalRotation(container) {
  if (!container) return;

  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let activePointerId = null;
  let isHorizontalDragging = false;
  let movedDuringPointer = false;
  let autoRotatePausedByPointer = false;
  const touchHorizontalThreshold = 10;
  const mouseHorizontalThreshold = 4;
  const rotationDegreesPerPixel = 0.32;

  function resetGesture(clientX, clientY, pointerId = null) {
    startX = clientX;
    startY = clientY;
    lastX = clientX;
    activePointerId = pointerId;
    isHorizontalDragging = false;
    movedDuringPointer = false;
  }

  function getGestureDelta(clientX, clientY) {
    return {
      deltaX: Math.abs(clientX - startX),
      deltaY: Math.abs(clientY - startY)
    };
  }

  function shouldStartHorizontalDrag(clientX, clientY, pointerType) {
    const { deltaX, deltaY } = getGestureDelta(clientX, clientY);
    const threshold = pointerType === 'touch' ? touchHorizontalThreshold : mouseHorizontalThreshold;
    return deltaX > threshold && deltaX > deltaY;
  }

  function pauseAutoRotateForPointer() {
    if (!world.controls().autoRotate) return;

    world.controls().autoRotate = false;
    autoRotatePausedByPointer = true;
  }

  function resumeAutoRotateAfterPointer() {
    if (!autoRotatePausedByPointer) return;

    world.controls().autoRotate = true;
    autoRotatePausedByPointer = false;
  }

  function rotateGlobeHorizontally(clientX) {
    const movementX = clientX - lastX;
    lastX = clientX;

    if (!movementX) return;

    const currentPOV = world.pointOfView();
    world.pointOfView({
      lat: currentPOV.lat,
      lng: currentPOV.lng - (movementX * rotationDegreesPerPixel),
      altitude: currentPOV.altitude
    }, 0);
  }

  function handlePointerMove(e) {
    if (e.pointerId !== activePointerId) return;
    if (e.pointerType === 'mouse' && e.buttons !== 1) {
      resetPointerDrag(e);
      return;
    }

    if (!isHorizontalDragging) {
      if (!shouldStartHorizontalDrag(e.clientX, e.clientY, e.pointerType)) return;

      isHorizontalDragging = true;
      movedDuringPointer = true;
      lastX = e.clientX;
      pauseAutoRotateForPointer();
      if (container.setPointerCapture) {
        container.setPointerCapture(e.pointerId);
      }
    }

    if (e.cancelable) {
      e.preventDefault();
    }
    e.stopImmediatePropagation();
    rotateGlobeHorizontally(e.clientX);
  }

  function resetPointerDrag(e) {
    if (e.pointerId !== activePointerId) return;

    if (container.releasePointerCapture && container.hasPointerCapture?.(e.pointerId)) {
      container.releasePointerCapture(e.pointerId);
    }

    activePointerId = null;
    isHorizontalDragging = false;
    resumeAutoRotateAfterPointer();
  }

  function blockSyntheticClickAfterDrag(e) {
    if (!movedDuringPointer) return;

    if (e.cancelable) {
      e.preventDefault();
    }
    e.stopImmediatePropagation();
  }

  container.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.pointerType !== 'touch' && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;

    resetGesture(e.clientX, e.clientY, e.pointerId);

    if (e.pointerType !== 'touch' && container.setPointerCapture) {
      container.setPointerCapture(e.pointerId);
    }
  }, { capture: true, passive: true });

  container.addEventListener('pointermove', handlePointerMove, { capture: true, passive: false });

  container.addEventListener('pointerup', (e) => {
    blockSyntheticClickAfterDrag(e);
    resetPointerDrag(e);
  }, { capture: true });

  container.addEventListener('pointercancel', resetPointerDrag, { capture: true });

  container.addEventListener('click', blockSyntheticClickAfterDrag, { capture: true });
}

function applyGlobeScrollTouchAction(container) {
  if (!container) return;

  container.style.touchAction = 'pan-y pinch-zoom';

  const canvas = container.querySelector('canvas');
  if (canvas) {
    canvas.style.touchAction = 'pan-y pinch-zoom';
  }
}

function getDefaultGlobeView() {
  const isMobile = window.innerWidth <= 768;
  return {
    lat: initialGlobeLat,
    lng: initialGlobeLng,
    altitude: isMobile ? 4.67 : 2.5
  };
}

function setDefaultGlobeView(duration = 0) {
  world.pointOfView(getDefaultGlobeView(), duration);
}

function getHoverAltitude(feature) {
  const { area } = getPolygonCenterAndArea(feature);

  if (area < 15) return 0.07 * HOVER_EXTRUSION_MULTIPLIER;
  if (area < 80) return 0.055 * HOVER_EXTRUSION_MULTIPLIER;
  if (area < 400) return 0.045 * HOVER_EXTRUSION_MULTIPLIER;
  return 0.035 * HOVER_EXTRUSION_MULTIPLIER;
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
    .polygonAltitude(getBasePolygonAltitude)
    .polygonCapColor(getBasePolygonCapColor)
    .polygonSideColor(getBasePolygonSideColor)
    .polygonStrokeColor(getBasePolygonStrokeColor);
}

// Setup Globe
const world = Globe()
  (document.getElementById('globeViz'))
  .backgroundColor('rgba(0, 0, 0, 0)')
  .atmosphereColor('#008c9b')
  .atmosphereAltitude(0.2)
  .polygonsTransitionDuration(520)
  .polygonAltitude(getBasePolygonAltitude)
  .polygonCapColor(getBasePolygonCapColor)
  .polygonSideColor(getBasePolygonSideColor)
  .polygonStrokeColor(getBasePolygonStrokeColor)
  .polygonLabel(({ properties: d }) => {
    if (shouldDisableHoverEffects()) return '';

    const participating = hasRecipeForCountry(d.ADMIN);
    if (!participating) return '';

    const ptName = getCountryNamePT(d);
    const titles = worldCupTitles[d.ADMIN] || 0;
    const flagUrl = getFlagUrl(d);
    const flagHtml = flagUrl
      ? `<img src="${flagUrl}" style="width: 22px; height: 22px; object-fit: cover; border-radius: 4px; border: 1px solid #ffc800; display: inline-block;" alt="flag">`
      : '';
    const titlesHtml = `<div style="font-size: 0.8rem; margin-top: 4px; color: ${titles > 0 ? '#ffc800' : '#aaa'}; display: flex; align-items: center; gap: 4px;">
          🏆 ${titles} ${titles === 1 ? 'título' : 'títulos'}
         </div>`;
    return `
    <div style="background: rgba(0, 0, 0, 0.9); color: white; padding: 8px 12px; border-radius: 8px; font-family: 'Globo Tx', sans-serif; border: 1px solid #ffc800; display: flex; flex-direction: column; align-items: center; pointer-events: none;">
      <div style="display: flex; align-items: center; gap: 8px;">
        ${flagHtml}
        <b style="font-size: 0.95rem; white-space: nowrap;">${ptName}</b>
      </div>
      ${titlesHtml}
    </div>
  `})
  .onPolygonHover(hoverD => {
    if (shouldDisableHoverEffects()) {
      if (hoveredPolygon || hoveredCountryName || autoRotatePausedByHover) {
        hoveredPolygon = null;
        hoveredCountryName = null;
        resetHoverStyles();
      }
      return;
    }

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
        .polygonAltitude(d => d.properties.ADMIN === hoveredCountryName ? getHoverAltitude(hoverD) : getBasePolygonAltitude(d))
        .polygonCapColor(d => d.properties.ADMIN === hoveredCountryName ? '#ffc800' : getBasePolygonCapColor(d))
        .polygonSideColor(d => d.properties.ADMIN === hoveredCountryName ? '#ffc800' : getBasePolygonSideColor(d))
        .polygonStrokeColor(d => d.properties.ADMIN === hoveredCountryName ? '#ffffff' : getBasePolygonStrokeColor(d));
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
            image: RECIPE_IMAGE_FALLBACK,
            link: "https://receitas.globo.com/"
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

// Start loading local recipe CSV immediately
const recipesCsvPromise = loadRecipesCsvText();

function hideMapLoader() {
  const loader = document.getElementById('mapLoader');
  if (!loader) return;

  loader.classList.add('is-hidden');
  loader.setAttribute('aria-hidden', 'true');
}

function showMapLoaderError() {
  const loaderStatus = document.getElementById('mapLoaderStatus');
  if (loaderStatus) {
    loaderStatus.textContent = 'Não foi possível carregar o mapa';
  }
}

// Load GeoJSON data for countries and local recipe CSV in parallel
Promise.all([
  fetch(countriesGeoJsonUrl).then(res => res.json()),
  recipesCsvPromise
])
  .then(([countries, recipesCsvText]) => {
    const mapFeatures = countries.features
      .map(normalizeMapFeature)
      .map(scaleCountryGeometry);

    try {
      const csvData = recipesCsvText ? buildRecipesFromCsv(recipesCsvText, mapFeatures) : { recipes: {}, searchItems: [] };
      fetchedRecipesData = csvData.recipes;
      countrySearchItems = csvData.searchItems;
      console.log("Recipes loaded successfully from local CSV:", fetchedRecipesData);
    } catch (err) {
      console.warn("CSV local de receitas inválido:", err);
      fetchedRecipesData = {};
      countrySearchItems = [];
    }

    // Render all countries for map context. Only CSV-backed countries are interactive.
    world.polygonsData(mapFeatures);

    // Initialize the glassmorphic search panel with CSV-backed country rows
    initializeCountrySearch(countrySearchItems);

    // Setup Auto-rotation
    world.controls().autoRotate = true;
    world.controls().autoRotateSpeed = 0.25; // Slow down by 50%
    world.controls().enableZoom = false;   // Disable default scroll zoom
    world.controls().enableRotate = false; // Horizontal dragging is handled by a custom scroll-safe gesture.
    world.controls().enablePan = false;    // Do not trap vertical page-scroll gestures
    if (window.innerWidth <= 768 && world.controls().touches) {
      world.controls().touches.ONE = null;
      world.controls().touches.TWO = null;
    }
    const globeContainer = document.getElementById('globeViz');
    applyGlobeScrollTouchAction(globeContainer);
    setupGlobeHorizontalRotation(globeContainer);
    window.requestAnimationFrame(() => applyGlobeScrollTouchAction(globeContainer));
    setDefaultGlobeView(0);

    // Custom Globe Controls (Placed inside .then to ensure controls are initialized)
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const rotationDragControl = document.getElementById('rotationDragControl');
    const rotationDragThumb = document.getElementById('rotationDragThumb');

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
      const rotationDelta = clampedOffset * (180 / Math.max(trackWidth, 1));

      world.pointOfView({
        lat: currentPOV.lat,
        lng: dragStartLng + rotationDelta,
        altitude: currentPOV.altitude
      }, 0);

      if (Math.abs(clampedOffset) >= maxOffset - 0.5) {
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
        if (rotationDragControl.setPointerCapture) {
          rotationDragControl.setPointerCapture(e.pointerId);
        }
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
    if (globeContainer) {
      setTimeout(() => {
        setDefaultGlobeView(0);
        globeContainer.classList.add('is-ready');
        window.setTimeout(hideMapLoader, 250);
      }, 150);
    }
  })
  .catch(err => {
    console.error("Falha ao carregar visualização inicial do mapa:", err);
    showMapLoaderError();
  });

// Setup glassmorphic floating search list and filter logic
function initializeCountrySearch(searchItems) {
  const listEl = document.getElementById('countryList');
  const searchInput = document.getElementById('countrySearch');
  const INITIAL_VISIBLE_FLAGS = 6;

  const searchItemGroups = searchItems
    .filter(item => item && item.nameEN && item.recipe)
    .reduce((groups, item) => {
      if (!groups.has(item.nameEN)) {
        groups.set(item.nameEN, item);
      }
      return groups;
    }, new Map());

  const participatingFeatures = Array.from(searchItemGroups.values());
  let searchFlagsLoaded = false;

  function loadSearchFlags() {
    if (searchFlagsLoaded) return;
    searchFlagsLoaded = true;

    listEl.querySelectorAll('img.search-flag[data-src]').forEach((img) => {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
  }
  
  // Sort alphabetically by Portuguese name
  participatingFeatures.sort((a, b) => a.namePT.localeCompare(b.namePT, 'pt-BR'));
  
  // Populate UI items
  function renderList(filteredFeatures) {
    listEl.innerHTML = '';
    
    filteredFeatures.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'country-item';
      
      const flagUrl = getFlagUrlByIso(item.isoCode);
      const shouldLoadFlag = searchFlagsLoaded || index < INITIAL_VISIBLE_FLAGS;
        
      const flagHtml = flagUrl
        ? `<img ${shouldLoadFlag ? `src="${flagUrl}"` : `data-src="${flagUrl}"`} class="search-flag" alt="" loading="lazy" decoding="async">`
        : `<div class="search-flag-placeholder"></div>`;
        
      li.innerHTML = `
        ${flagHtml}
        <span class="search-country-name">${item.namePT}</span>
      `;
      
      // Click zooms to country when map geometry exists and triggers details modal
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
        const countryName = item.nameEN;
        const ptName = item.namePT;
        const recipe = item.recipe || fetchedRecipesData[countryName];

        if (!d) {
          if (world.controls().autoRotate) {
            world.controls().autoRotate = false;
          }

          const hasCoordinates = Number.isFinite(item.lat) && Number.isFinite(item.lng);
          if (hasCoordinates) {
            const zoomAltitude = window.innerWidth <= 480 ? 2.05 : 1.6;
            world.pointOfView({ lat: item.lat, lng: item.lng, altitude: zoomAltitude }, 800);
          }

          setTimeout(() => {
            openModal(ptName, recipe, item.isoCode, countryName);
          }, hasCoordinates ? 300 : 0);
          return;
        }
        
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
            openModal(ptName, recipe, item.isoCode || getCountryIsoA2(d.properties), countryName);
          }, 300);
        } else {
          setTimeout(() => {
            openModal(ptName, {
              dish: "Iguarias Locais",
              description: `Ainda estamos reunindo receitas tradicionais para ${ptName}. Fique ligado para mais novidades culinárias da Copa!`,
              image: RECIPE_IMAGE_FALLBACK,
              link: "https://receitas.globo.com/"
            }, getCountryIsoA2(d.properties), countryName);
          }, 300);
        }
      });
      
      listEl.appendChild(li);
    });
  }
  
  renderList(participatingFeatures);
  listEl.addEventListener('pointerenter', loadSearchFlags, { once: true });
  listEl.addEventListener('pointerdown', loadSearchFlags, { once: true });
  
  // Real-time search filter matching country names and dish titles
  searchInput.addEventListener('input', (e) => {
    loadSearchFlags();
    const query = normalizeLookupText(e.target.value);
    
    const filtered = participatingFeatures.filter(item => {
      const normPT = normalizeLookupText(item.namePT);
      const normEN = normalizeLookupText(item.nameEN);
      
      const recipe = item.recipe || fetchedRecipesData[item.nameEN];
      const normDish = recipe && recipe.dish
        ? normalizeLookupText(recipe.dish)
        : "";
      
      return normPT.includes(query) || normEN.includes(query) || normDish.includes(query);
    });
    
    renderList(filtered);
  });

  // Mobile full screen search overlay open/close logic
  const searchContainer = document.querySelector('.search-container');
  const closeSearchBtn = document.getElementById('closeSearch');
  
  searchInput.addEventListener('focus', () => {
    loadSearchFlags();
    if (window.innerWidth <= 768) {
      searchContainer.classList.add('is-open');
      document.body.classList.add('search-open');
    }
  });
  
  searchInput.addEventListener('click', () => {
    loadSearchFlags();
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

  const fullRecipeCta = document.getElementById('fullRecipeCta');

  if (fullRecipeCta) {
    const recipeLink = recipe.link || "https://receitas.globo.com/";
    fullRecipeCta.href = recipeLink;
    fullRecipeCta.classList.toggle('hidden', !recipeLink);
  }

  recipeImageEl.onerror = () => {
    recipeImageEl.onerror = null;
    recipeImageEl.src = RECIPE_IMAGE_FALLBACK;
  };
  recipeImageEl.src = recipe.image || RECIPE_IMAGE_FALLBACK;
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
