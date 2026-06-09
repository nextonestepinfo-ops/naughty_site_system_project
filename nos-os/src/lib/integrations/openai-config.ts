const secretKeyPrefix = "sk-";

export function resolveOpenAIModel(value: string | undefined, fallback: string) {
  const model = value?.trim();
  if (!model || model.startsWith(secretKeyPrefix)) return fallback;
  return model;
}

