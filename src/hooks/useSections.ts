import { useQuery } from "@tanstack/react-query"

export interface ClassSection {
  id: string
  class: string
  name: string
  isActive: boolean
  sortOrder: number
}

interface SectionsResponse {
  sections?: ClassSection[]
}

export function useSections(activeOnly = true) {
  return useQuery<ClassSection[]>({
    queryKey: ["sections", { activeOnly }],
    queryFn: async () => {
      const url = `/api/admin/sections${activeOnly ? "?activeOnly=true" : ""}`
      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch sections")
      const data = await response.json() as SectionsResponse
      return data.sections || []
    },
  })
}
