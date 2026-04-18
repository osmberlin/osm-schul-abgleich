import { OsmTagSnippet } from '../components/OsmTagSnippet'
import { de } from '../i18n/de'
import {
  applyFlatMapRotationLocks,
  flatMapGlProps,
  OPENFREEMAP_STYLE,
} from '../lib/openFreeMapStyle'
import { buildOsmUploadChangesetTags } from '../lib/osmUploadChangeset'
import { useOsmAppActions, useOsmDisplayName, usePendingEditsByKey } from '../stores/osmAppStore'
import { XMarkIcon } from '@heroicons/react/20/solid'
import { Link } from '@tanstack/react-router'
import bbox from '@turf/bbox'
import { featureCollection, point } from '@turf/helpers'
import { getFeature, getAuthToken, configure, uploadChangeset, isLoggedIn } from 'osm-api'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useState } from 'react'
import MapGL, { Layer, Source } from 'react-map-gl/maplibre'

function syncOsmAuthHeader() {
  const t = getAuthToken()
  configure({ authHeader: t ? `Bearer ${t}` : undefined })
}

export function AenderungenPage() {
  const pendingByKey = usePendingEditsByKey()
  const displayName = useOsmDisplayName()
  const { removePendingTag, clearPending } = useOsmAppActions()

  const [uploadBusy, setUploadBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const list = Object.entries(pendingByKey)

  const pendingEdits = list.map(([, p]) => p)

  const changesetTagsPreview = buildOsmUploadChangesetTags(pendingEdits)

  const sourceTagEntries = Object.entries(changesetTagsPreview)
    .filter(([k]) => k.startsWith('source:'))
    .sort((a, b) => {
      const na = Number(a[0].replace('source:', ''))
      const nb = Number(b[0].replace('source:', ''))
      return na - nb
    })

  const mapFc = featureCollection(
    list.map(([, p]) =>
      point([p.lon, p.lat], { key: `${p.osmType}/${p.osmId}`, label: `${p.osmType}/${p.osmId}` }),
    ),
  )

  let initialViewState = { longitude: 10.45, latitude: 51.16, zoom: 5.2 }
  if (mapFc.features.length === 1) {
    const c = mapFc.features[0].geometry.coordinates
    initialViewState = { longitude: c[0], latitude: c[1], zoom: 14 }
  } else if (mapFc.features.length > 1) {
    const b = bbox(mapFc)
    const [minX, minY, maxX, maxY] = b
    const lon = (minX + maxX) / 2
    const lat = (minY + maxY) / 2
    const pad = 0.02
    const maxDelta = Math.max(maxX - minX, maxY - minY) + pad * 2
    const zoom = maxDelta > 2 ? 7 : maxDelta > 0.5 ? 10 : maxDelta > 0.1 ? 12 : 14
    initialViewState = { longitude: lon, latitude: lat, zoom }
  }

  async function onUpload() {
    setFeedback(null)
    if (list.length === 0) return
    if (!isLoggedIn()) {
      setFeedback({ kind: 'err', text: de.osm.reviewNotLoggedIn })
      return
    }
    syncOsmAuthHeader()
    setUploadBusy(true)
    try {
      const modify = []
      for (const [, p] of list) {
        const id = Number.parseInt(p.osmId, 10)
        if (!Number.isFinite(id)) continue
        const [feat] = await getFeature(p.osmType, id)
        if (!feat || feat.visible === false) continue
        const merged = {
          ...feat,
          tags: { ...feat.tags, ...p.tags },
        }
        modify.push(merged)
      }
      if (modify.length === 0) {
        setFeedback({ kind: 'err', text: de.osm.uploadError })
        return
      }
      await uploadChangeset(buildOsmUploadChangesetTags(list.map(([, p]) => p)), {
        create: [],
        modify,
        delete: [],
      })
      clearPending()
      setFeedback({ kind: 'ok', text: de.osm.uploadSuccess })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setFeedback({ kind: 'err', text: `${de.osm.uploadError} ${msg}` })
    } finally {
      setUploadBusy(false)
    }
  }

  const canUpload = list.length > 0 && Boolean(displayName) && !uploadBusy

  return (
    <div className="mx-auto max-w-5xl p-4 pb-10">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-100">{de.osm.reviewTitle}</h1>
      <p className="mb-6 max-w-3xl text-sm text-zinc-400">{de.osm.reviewLead}</p>

      {feedback && (
        <p
          className={`mb-4 rounded-md px-3 py-2 text-sm ${
            feedback.kind === 'ok'
              ? 'bg-emerald-500/15 text-emerald-200'
              : 'bg-red-500/15 text-red-200'
          }`}
          role="status"
        >
          {feedback.text}
        </p>
      )}

      {list.length === 0 ? (
        <p className="text-zinc-400">{de.osm.reviewEmpty}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div
            className="relative h-[min(420px,50vh)] overflow-hidden rounded-lg border border-zinc-700 lg:min-h-[420px]"
            aria-label={de.osm.mapAria}
          >
            <MapGL
              key={`${mapFc.features.length}-${initialViewState.longitude}`}
              initialViewState={initialViewState}
              mapStyle={OPENFREEMAP_STYLE}
              reuseMaps
              {...flatMapGlProps}
              onLoad={(e) => applyFlatMapRotationLocks(e.target)}
            >
              <Source id="pending-osm" type="geojson" data={mapFc}>
                <Layer
                  id="pending-halo"
                  type="circle"
                  paint={{
                    'circle-radius': 10,
                    'circle-color': 'rgba(234, 179, 8, 0.45)',
                  }}
                />
                <Layer
                  id="pending-core"
                  type="circle"
                  paint={{
                    'circle-radius': 4,
                    'circle-color': '#ca8a04',
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#fff',
                  }}
                />
              </Source>
            </MapGL>
          </div>

          <div className="space-y-4">
            {list.map(([key, p]) => (
              <div key={key} className="rounded-lg border border-zinc-700 bg-zinc-900/30 p-3">
                <h2 className="text-sm font-medium text-amber-200">
                  <OsmTagSnippet>
                    {p.osmType}/{p.osmId}
                  </OsmTagSnippet>
                </h2>
                <ul className="mt-2 space-y-1">
                  {Object.entries(p.tags).map(([tk, tv]) => (
                    <li
                      key={tk}
                      className="flex items-center justify-between gap-2 border-b border-zinc-800/80 py-1.5 text-sm last:border-0"
                    >
                      <OsmTagSnippet>
                        {tk}={tv}
                      </OsmTagSnippet>
                      <button
                        type="button"
                        aria-label={de.osm.removeTagAria}
                        onClick={() => removePendingTag(key, tk)}
                        className="shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                      >
                        <XMarkIcon className="size-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {!displayName && <p className="text-sm text-zinc-500">{de.osm.reviewNotLoggedIn}</p>}

            <div>
              <button
                type="button"
                disabled={!canUpload}
                onClick={() => void onUpload()}
                aria-describedby="osm-changeset-tags-preview"
                className="w-full rounded-md bg-amber-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {uploadBusy ? de.osm.uploadBusy : de.osm.uploadButton}
              </button>
              <div
                id="osm-changeset-tags-preview"
                className="mt-2 space-y-2 text-sm leading-relaxed text-zinc-500"
              >
                <p>{changesetTagsPreview.comment}</p>
                <p className="font-mono text-xs break-words text-zinc-600">
                  {changesetTagsPreview.created_by}
                </p>
                {sourceTagEntries.map(([k, v]) => (
                  <p key={k} className="font-mono text-xs break-all text-zinc-600">
                    <span className="text-zinc-500">{k}=</span>
                    {v}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="mt-8">
        <Link to="/" className="text-sm text-emerald-300 underline decoration-emerald-400/30">
          ← {de.navHome}
        </Link>
      </p>
    </div>
  )
}
