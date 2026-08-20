import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  ToolCall: a
    .model({
      toolName: a.string().required(),
      timestamp: a.datetime().required(),
      rawPayload: a.string().required(),
      outcome: a.enum([
        "SUCCESS",
        "TOOL_ERROR",
        "EMPTY_RESULT",
        "MALFORMED",
        "SCHEMA_DRIFT",
      ]),
      fingerprint: a.string().required(),
      argsHash: a.string().required(),
      summary: a.string(),
      sessionId: a.string().required(),
    })
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
