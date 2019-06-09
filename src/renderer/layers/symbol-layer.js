import L from 'leaflet'
import Leaflet from '../leaflet'
import evented from '../evented'
import store from '../stores/layer-store'

let map
let group

const STYLES = {
  LineString: { color: '#000000', weight: 2, opacity: 1 },
  Polygon: { color: '#444444', weight: 1, opacity: 0.1 }
}

const addLayer = ([name, layer]) => new L.GeoJSON.Symbols({
  id: name,
  size: () => 34,
  features: () => layer.content,
  filter: feature => feature.geometry,
  style: feature => STYLES[feature.geometry.type] || {}
}).addTo(group)

const bounds = ({ content }) => {
  if (!content.bbox) return
  if (typeof content.bbox !== 'string') return

  const bounds = (lat1, lng1, lat2, lng2) => L.latLngBounds(L.latLng(lat1, lng1), L.latLng(lat2, lng2))

  // Format: PostGIS (ST_Extent())
  const regex = /BOX\((.*)[ ]+(.*)[, ]+(.*)[ ]+(.*)\)/
  const match = content.bbox.match(regex)
  if (match) {
    /* eslint-disable no-unused-vars */
    const [_, lng1, lat1, lng2, lat2] = match
    return bounds(lat1, lng1, lat2, lng2)
    /* eslint-enable no-unused-vars */
  }

  // Format: GeoJSON (simple array)
  const [lng1, lat1, lng2, lat2] = JSON.parse(content.bbox)
  return bounds(lat1, lng1, lat2, lng2)
}

const fitBounds = bounds => {
  if (!bounds) return
  map.fitBounds(bounds, { animate: true })
}

evented.on('MAP_CREATED', reference => {
  map = reference
  group = L.layerGroup()
  group.addTo(map)

  const show = state => Object.entries(state)
    .filter(([_, layer]) => layer.show)
    .forEach(addLayer)

  const hide = name => {

    Leaflet.layers(group)
      .filter(layer => layer instanceof L.GeoJSON.Symbols)
      .filter(layer => layer.options.id === name)
      .forEach(layer => {
        layer.on('remove', () => console.log('layer removed', name))
        layer.remove()
      })
  }

  store.on('added', ({ name, layer }) => {
    addLayer([name, layer])
    fitBounds(bounds(layer))
  })

  store.on('removed', ({ name }) => hide(name))
  store.on('hidden', ({ name }) => hide(name))
  store.on('shown', ({ name, layer }) => addLayer([name, layer]))

  if (store.ready()) show(store.state())
  else store.on('ready', show)
})
