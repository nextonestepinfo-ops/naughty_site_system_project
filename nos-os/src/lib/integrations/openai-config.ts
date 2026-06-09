const secretKeyPrefix = "sk-";

function cleanEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "\"\"" || trimmed === "''") return "";
  return trimmed;
}

export function resolveOpenAIApiKey(value: string | undefined) {
  const key = cleanEnvValue(value);
  if (!key || key === "your_openai_key_here" || !key.startsWith(secretKeyPrefix)) return null;
  return key;
}

export function resolveOpenAIModel(value: string | undefined, fallback: string) {
  const model = cleanEnvValue(value);
  if (!model || model.startsWith(secretKeyPrefix)) return fallback;
  return model;
}
