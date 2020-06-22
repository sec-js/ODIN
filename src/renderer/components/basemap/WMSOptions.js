import React from 'react'
import { PropTypes } from 'prop-types'
import { Card, CardContent, Typography, CircularProgress } from '@material-ui/core'

import WMTSLayerTable from './WMTSLayerTable'
import WMSCapabilities from 'ol/format/WMSCapabilities'
import { get as getProjection } from 'ol/proj'
import { wmsLayer, flattenLayers, firstOrDefault } from './tools'
import { useTranslation } from 'react-i18next'

const WMSOptions = props => {
  const { merge, onValidation } = props

  const { t, i18n } = useTranslation()
  const collator = Intl.Collator(i18n.language)

  /* effects */
  const [capabilities, setCapabilities] = React.useState(null)
  const [selectedLayerId, setSelectedLayerId] = React.useState(props.options.layer)
  const [error, setError] = React.useState(null)
  const [missingProjectionDefinitions, setMissingProjectionDefinitions] = React.useState([])

  React.useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal

    const fetchAndSetCapabilities = async () => {
      setError(null)
      setCapabilities(null)
      try {
        const response = await fetch(props.options.url, { signal })
        if (!response.ok) { throw new Error(response.statusText) }

        /* We need to check if the request was OK beyond the http status code */
        const content = await response.text()
        const caps = (new WMSCapabilities()).read(content)
        if (!caps || !caps.Service || !caps.Capability) throw new Error(t('basemapManagement.invalidResponse'))
        console.dir(caps)
        setCapabilities(caps)
      } catch (error) {
        setError(error.message)
      }
    }
    fetchAndSetCapabilities()
    onValidation(!!props.options.layer && capabilities && !error)
    return () => { controller.abort() }
  }, [])

  // triggered by changes to the WMTS capabilities or by selecting a layer
  React.useEffect(() => {
    if (!capabilities || !selectedLayerId) return
    const providedCRS = crs(capabilities, selectedLayerId)
      .map(crs => ({
        Identifier: crs.Identifier,
        SupportedCRS: crs.SupportedCRS,
        CRSCode: crs.SupportedCRS.replace(/urn:ogc:def:crs:(\w+):(.*:)?(\w+)$/, '$1:$3')
      }))
    const missingDefinitions = providedCRS.filter(crs => !getProjection(crs.CRSCode))
    if (missingDefinitions.length === providedCRS.length) {
      /* Oops, seems like we do not support any CRS provided by the WMS source */
      setMissingProjectionDefinitions(missingDefinitions)
      onValidation(false)
    } else {
      /* phew, we do support at least on provided CRS */
      onValidation(true)
    }
  }, [capabilities, selectedLayerId])

  /* increases performance */
  const layers = React.useMemo(() => {

    if (!capabilities) return []
    const l = wmsLayer(capabilities.Capability.Layer.Layer)
    return l.sort((left, right) => collator.compare(left.Name, right.Name))
  }, [capabilities])

  const wgs84BoundingBox = (wmtsCapabilites, layerId) => {
    const layer = flattenLayers(wmtsCapabilites.Capability.Layer.Layer).find(l => l.Name === layerId)
    if (!layer) return null
    return layer.EX_GeographicBoundingBox
  }

  const crs = (caps, layerId) => {
    const layer = flattenLayers(caps.Capability.Layer.Layer).find(l => l.Name === layerId)
    if (!layer) return []
    return layer.CRS
      .filter(crs => crs.startsWith('EPSG'))
      .map(crs => ({ Identifier: crs, SupportedCRS: crs }))
  }

  /* functions */
  const handleLayerSelected = layerId => {
    setSelectedLayerId(layerId)
    if (layerId) {
      const providedCRS = crs(capabilities, layerId)
      const p = (providedCRS.some(c => c.Identifier === 'EPSG:3857')
        ? 'EPSG:3857'
        : firstOrDefault(providedCRS.filter(crs => getProjection(crs.CRSCode)), null)
      )
      merge({
        layer: layerId,
        wgs84BoundingBox: wgs84BoundingBox(capabilities, layerId),
        projection: p
      })
    }
  }

  /* rendering */
  if (error) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography gutterBottom variant="body1" color="secondary">
            {t('basemapManagement.wmts.error')}: {error}
          </Typography>
        </CardContent>
      </Card>
    )
  } else if (!capabilities) {
    return (
      <Card variant="outlined">
        <CardContent align="center">
          <CircularProgress />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card variant="outlined">
        <CardContent>
          <Typography gutterBottom>
            {capabilities.ServiceProvider ? capabilities.ServiceProvider.ProviderName : ''}
          </Typography>
          <Typography gutterBottom variant="h5" component="h2">
            {capabilities.ServiceIdentification ? capabilities.ServiceIdentification.Title : ''}
          </Typography>
          <Typography gutterBottom >
            {capabilities.ServiceIdentification ? capabilities.ServiceIdentification.Abstract : ''}
          </Typography>
        </CardContent>
      </Card>
      <WMTSLayerTable
        layers={layers}
        selectedLayerIdentifier={selectedLayerId}
        onLayerSelected={handleLayerSelected}
      />
      { missingProjectionDefinitions.length > 0
        ? <Card variant="outlined" style={{ marginTop: '0.5em' }}>
          <CardContent>
            <Typography gutterBottom color="secondary">
              {t('basemapManagement.wmts.missingProjections')}: {missingProjectionDefinitions.map(d => d.CRSCode).join(',')}
            </Typography>
          </CardContent>
        </Card>
        : null
      }
    </>
  )
}
WMSOptions.propTypes = {
  options: PropTypes.object,
  merge: PropTypes.func,
  onValidation: PropTypes.func
}

export default WMSOptions
