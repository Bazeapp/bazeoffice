export type AuditActor = {
  userId: string | null;
  email: string | null;
};

export type AuditOperation = "create" | "update" | "delete";

type FieldAuditLogOptions = {
  actor: AuditActor;
  operation: AuditOperation;
  tableName: string;
  recordId: string;
  source: string;
  oldRecord?: Record<string, unknown> | null;
  newRecord?: Record<string, unknown> | null;
  fields?: string[];
  requestContext?: Record<string, unknown>;
};

function getBearerToken(req: Request) {
  const authorization = req.headers.get("Authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function resolveAuditActor(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  req: Request,
): Promise<AuditActor> {
  const token = getBearerToken(req);
  if (!token) return { userId: null, email: null };

  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    console.error("[audit] Failed to resolve actor", error.message);
    return { userId: null, email: null };
  }

  return {
    userId: data.user?.id ?? null,
    email: data.user?.email ?? null,
  };
}

function normalizeJsonValue(value: unknown) {
  return value === undefined ? null : value;
}

function jsonValuesAreEqual(left: unknown, right: unknown) {
  return JSON.stringify(normalizeJsonValue(left)) ===
    JSON.stringify(normalizeJsonValue(right));
}

function getAuditFields(options: FieldAuditLogOptions) {
  if (options.fields) {
    return Array.from(new Set(options.fields.filter(Boolean)));
  }

  return Array.from(
    new Set([
      ...Object.keys(options.oldRecord ?? {}),
      ...Object.keys(options.newRecord ?? {}),
    ]),
  );
}

export async function insertFieldAuditLogs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  options: FieldAuditLogOptions,
) {
  const fields = getAuditFields(options);
  if (fields.length === 0) return;

  const rows: Record<string, unknown>[] = [];

  for (const fieldName of fields) {
    const oldValue = normalizeJsonValue(options.oldRecord?.[fieldName]);
    const newValue = normalizeJsonValue(options.newRecord?.[fieldName]);

    if (options.operation === "update" && jsonValuesAreEqual(oldValue, newValue)) {
      continue;
    }

    rows.push({
      actor_user_id: options.actor.userId,
      actor_email: options.actor.email,
      operation: options.operation,
      table_name: options.tableName,
      record_id: options.recordId,
      field_name: fieldName,
      old_value: oldValue,
      new_value: newValue,
      source: options.source,
      request_context: options.requestContext ?? {},
    });
  }

  if (rows.length === 0) return;

  const { error } = await supabase.from("audit_logs").insert(rows);
  if (error) {
    console.error("[audit] Failed to insert audit logs", error.message);
  }
}
