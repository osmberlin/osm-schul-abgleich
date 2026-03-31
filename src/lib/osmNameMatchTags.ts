/**
 * OSM tags used for school name matching and display.
 * Order: official_name → name → name:de (attribution when normalized keys collide, then UI candidates).
 */
export const OSM_SCHOOL_NAME_TAGS_IN_ORDER = ['official_name', 'name', 'name:de'] as const

export type OsmNameMatchTag = (typeof OSM_SCHOOL_NAME_TAGS_IN_ORDER)[number]
