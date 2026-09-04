export function isNominatimCoordSource(props: Record<string, unknown> | null | undefined) {
  return props?.coord_source === 'nominatim'
}
