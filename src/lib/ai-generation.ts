import { supabase } from "@/lib/supabase-client"

type AiFunctionName =
  | "generare-lavoratore-descrizione-rivista"
  | "generare-lavoratore-riassunto-profilo-breve"
  | "generare-selezioni-lavoratori-messaggio-famiglia"

type AiGenerationPayload = {
  id: string
  model?: string
  temperature?: number
}

export async function invokeAiGenerationFunction(
  functionName: AiFunctionName,
  payload: AiGenerationPayload,
) {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
  })

  if (error) {
    throw error
  }

  return data
}
