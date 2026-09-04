export function isNominatimCoordSource(props: Record<string, unknown> | null | undefined): boolean {
  return props?.coord_source === 'nominatim'
}
