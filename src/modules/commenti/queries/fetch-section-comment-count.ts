import { supabase } from "@/lib/supabase-client"

import { countThreadComments } from "../lib/count-section-comments"
import { readCommentCount } from "../lib/rpc-response"
import type { EntityType } from "../types/entity"
import { fetchCommentSectionPage } from "./fetch-section-comments"

export async function fetchCommentSectionCount(options: {
  pageEntityType: EntityType
  pageEntityId: string
  sectionEntityType: EntityType
  sectionEntityId: string
}): Promise<number> {
  const { data, error } = await supabase.rpc("commenti_count_for_section", {
    p_page_entity_type: options.pageEntityType,
    p_page_entity_id: options.pageEntityId,
    p_section_entity_type: options.sectionEntityType,
    p_section_entity_id: options.sectionEntityId,
  })

  if (!error) {
    return readCommentCount(data)
  }

  const page = await fetchCommentSectionPage(options)
  return countThreadComments(page.comments)
}
