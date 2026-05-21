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

// Number of World Cup titles won by country
const worldCupTitles = {
  "Brazil": 5,
  "Germany": 4,
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
      const recipe = recipesData[countryName];

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
world.globeMaterial().color.set('#233c91');
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

// Load GeoJSON data for countries
fetch('./ne_110m_admin_0_countries.geojson')
  .then(res => res.json())
  .then(countries => {
    // Render all countries so outlines cover the entire globe
    world.polygonsData(countries.features);

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

// Modal Logic
function openModal(country, recipe, isoCode, englishName) {
  countryNameEl.textContent = country;
  recipeDishEl.textContent = recipe.dish;
  recipeDescEl.textContent = recipe.description;
  recipeImageEl.src = recipe.image;

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
