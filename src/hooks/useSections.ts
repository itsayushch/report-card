import { useQuery } from "@tanstack/react-query"

export function useSections(activeOnly = true) {
  return useQuery({
    queryKey: ["sections", { activeOnly }],
    queryFn: async () => {
      const url = `/api/admin/sections${activeOnly ? "?activeOnly=true" : ""}`
      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch sections")
      const data = await response.json()
      return data.sections || []
    },
  })
}
