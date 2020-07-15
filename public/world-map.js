/* global topojson: false */
import {panZoomSetup} from './pan-zoom.js';

const ROTATION_SPEED = 1e-2;
const SVG_HEIGHT = 500;
const SVG_WIDTH = 960;

const tooltip = d3.select('.tooltip');
const tooltipCountry = tooltip.select('.country');
const tooltipPopulation = tooltip.select('.population');

const projectionMap = {
  Aitoff: d3.geoAitoff,
  'Azimuthal Equal Area': d3.geoAzimuthalEqualArea,
  Boggs: d3.geoBoggs,
  Bromley: d3.geoBromley,
  'Cylindrical Stereographic': d3.geoCylindricalStereographic,
  Eckert4: d3.geoEckert4,
  Fahey: d3.geoFahey,
  Gilbert: d3.geoGilbert,
  Hufnagel: d3.geoHufnagel,
  'Interrupted Homolosine': d3.geoInterruptedHomolosine,
  'Interrupted Mollweide Hemispheres': d3.geoInterruptedMollweideHemispheres,
  Mercator: d3.geoMercator,
  'Natural Earth 1': d3.geoNaturalEarth1,
  Orthographic: d3.geoOrthographic,
  Patterson: d3.geoPatterson
};
//const defaultProjection = 'Natural Earth 1';
const defaultProjectionName = 'Orthographic';

// Add event handling to select.
const select = d3
  .select('#projection-select')
  .on('change', () => setProjection(d3.event.target.value));

// Add options to select.
for (const projectionName of Object.keys(projectionMap)) {
  const option = select.append('option').text(projectionName);
  if (projectionName === defaultProjectionName) option.attr('selected', true);
}

// Add event handling to rotate button.
const rotateBtn = d3.select('#rotate-btn').on('click', rotate);

const svg = d3
  .select('svg')
  .attr('height', SVG_HEIGHT)
  .attr('width', SVG_WIDTH)
  .attr('viewBox', `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`);

/*
  svg.call(
    d3.zoom().on('zoom', () => {
      svg.attr('transform', d3.event.transform);
    })
  );
  */
//panZoomSetup('map', svg.attr('width'), svg.attr('height'));

const graticule = d3.geoGraticule();

const grid = graticule();
const sphere = {type: 'Sphere'};

let borders, currentCountry, land, path, pathGenerator, projection, timer;

svg.append('path').attr('class', 'sphere');

function setProjection(projectionName) {
  const projectionFn = projectionMap[projectionName];
  projection = projectionFn();

  const isOrthographic = projectionName === 'Orthographic';
  if (isOrthographic) {
    projection
      .scale(SVG_HEIGHT / 2.1)
      .translate([SVG_WIDTH / 2, SVG_HEIGHT / 2])
      .clipAngle(90)
      .precision(0.5);
    path = d3.geoPath().projection(projection);
  } else {
    if (timer) timer.stop();
  }

  rotateBtn.style('display', isOrthographic ? 'inline' : 'none');

  pathGenerator = d3.geoPath().projection(projection);
  svg.select('.sphere').attr('d', pathGenerator(sphere));
  svg.selectAll('.country').attr('d', pathGenerator);
}

function hideTooltip() {
  tooltip.style('opacity', 0);
}

// This handles when the mouse cursor
// enters an SVG path that represent a country.
function pathEntered() {
  // Move this path element to the end of its SVG group so it
  // renders on top which allows it's entire stroke is visible.
  this.parentNode.appendChild(this);
}

// This handles when the mouse cursor
// moves over an SVG path that represent a country.
function pathMoved(d) {
  // Populate the tooltip.
  const country = d.properties.name;
  if (country !== currentCountry) {
    tooltipCountry.text(country);
    tooltipPopulation.text('coming soon');
    currentCountry = country;
  }

  // Position the tooltip.
  tooltip
    .style('left', d3.event.pageX + 'px')
    .style('top', d3.event.pageY + 'px');

  // Show the tooltip.
  tooltip.style('opacity', 0.7);
}

function rotate() {
  rotateBtn.style('display', 'none');

  const start = Date.now();

  timer = d3.timer(() => {
    projection.rotate([ROTATION_SPEED * (Date.now() - start), 0]);
    pathGenerator = d3.geoPath().projection(projection);
    svg.selectAll('.country').attr('d', pathGenerator);
  });
}

export async function createMap() {
  setProjection(defaultProjectionName);

  const data = await d3.json('./topojson/countries-50m.json');

  land = topojson.feature(data, data.objects.land);
  borders = topojson.mesh(data, data.objects.countries, (a, b) => a !== b);

  // Convert TopoJSON data to GeoJSON data.
  const countries = topojson.feature(data, data.objects.countries);

  const idToNameMap = {};
  for (const feature of countries.features) {
    idToNameMap[feature.id] = feature.properties.name;
  }

  // Convert GeoJSON to SVG.
  const paths = svg
    .selectAll('path')
    .data(countries.features)
    .enter()
    .append('path')
    .attr('class', 'country')
    .attr('d', pathGenerator)
    .on('mouseenter', pathEntered)
    .on('mousemove', pathMoved)
    .on('mouseout', hideTooltip);
}
