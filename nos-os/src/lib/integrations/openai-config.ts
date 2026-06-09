const secretKeyPrefix = "sk-";

export function cleanOpenAIEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "\"\"" || trimmed === "''") return "";
  return trimmed;
}

export function resolveOpenAIApiKey(value: string | undefined) {
  const key = cleanOpenAIEnvValue(value);
  if (!key || key === "your_openai_key_here" || !key.startsWith(secretKeyPrefix)) return null;
  return key;
}

export function resolveOpenAIModel(value: string | undefined, fallback: string) {
  const model = cleanOpenAIEnvValue(value);
  if (!model || model.startsWith(secretKeyPrefix)) return fallback;
  return model;
}
