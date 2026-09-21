const FIRESTORE_API_ROOT = "https://firestore.googleapis.com/v1";
const TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

export const SERVER_TIMESTAMP: unique symbol = Symbol("Firestore server timestamp");

export type FirestoreValue =
  | null
  | boolean
  | number
  | string
  | Date
  | Uint8Array
  | FirestoreValue[]
  | { [field: string]: FirestoreValue };

export type FirestoreWritableValue =
  | FirestoreValue
  | typeof SERVER_TIMESTAMP
  | FirestoreWritableValue[]
  | { [field: string]: FirestoreWritableValue };

export interface FirestoreDocument {
  name: string;
  fields: Record<string, FirestoreValue>;
  createTime?: Date;
  updateTime?: Date;
}

export interface FirestoreRestClient {
  projectId: string;
  accessToken: string;
  fetch?: typeof fetch;
}

export interface FirestoreListResult {
  documents: FirestoreDocument[];
  nextPageToken?: string;
}

export type FirestoreWritePrecondition =
  | { exists: boolean; updateTime?: never }
  | { exists?: never; updateTime: string | Date };

export interface GetDocumentOptions {
  mask?: readonly string[];
}

export interface ListDocumentsOptions extends GetDocumentOptions {
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
  showMissing?: boolean;
}

export type CreateDocumentOptions = GetDocumentOptions;

export interface PatchDocumentOptions extends GetDocumentOptions {
  updateMask?: readonly string[];
  precondition?: FirestoreWritePrecondition;
}

export interface DeleteDocumentOptions {
  precondition?: FirestoreWritePrecondition;
}

export interface FirestoreCommitResult {
  commitTime?: Date;
  updateTime?: Date;
  transformResults: FirestoreValue[];
}

export class FirestoreRestError extends Error {
  readonly status?: number;

  constructor(message: "Firestore request failed" | "Malformed Firestore response", status?: number) {
    super(message);
    this.name = "FirestoreRestError";
    this.status = status;
  }
}

function malformed(): never {
  throw new FirestoreRestError("Malformed Firestore response");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseTimestamp(value: unknown): Date {
  if (typeof value !== "string" || !TIMESTAMP_PATTERN.test(value)) {
    return malformed();
  }
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime())) {
    return malformed();
  }
  return timestamp;
}

function decodeBytes(value: unknown): Uint8Array {
  if (typeof value !== "string") {
    return malformed();
  }
  try {
    const decoded = atob(value);
    return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  } catch {
    return malformed();
  }
}

function decodeInteger(value: unknown): number {
  if (typeof value !== "string" || !/^-?(?:0|[1-9]\d*)$/.test(value)) {
    return malformed();
  }
  const integer = Number(value);
  if (!Number.isSafeInteger(integer)) {
    return malformed();
  }
  return integer;
}

function decodeDouble(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (value === "NaN") {
    return Number.NaN;
  }
  if (value === "Infinity") {
    return Number.POSITIVE_INFINITY;
  }
  if (value === "-Infinity") {
    return Number.NEGATIVE_INFINITY;
  }
  return malformed();
}

function decodeMap(value: unknown): Record<string, FirestoreValue> {
  if (!isRecord(value)) {
    return malformed();
  }
  if (value.fields === undefined) {
    return {};
  }
  if (!isRecord(value.fields)) {
    return malformed();
  }
  return decodeFields(value.fields);
}

function decodeArray(value: unknown): FirestoreValue[] {
  if (!isRecord(value)) {
    return malformed();
  }
  if (value.values === undefined) {
    return [];
  }
  if (!Array.isArray(value.values)) {
    return malformed();
  }
  return value.values.map(decodeValue);
}

function decodeGeoPoint(value: unknown): { latitude: number; longitude: number } {
  if (
    !isRecord(value) ||
    typeof value.latitude !== "number" ||
    !Number.isFinite(value.latitude) ||
    typeof value.longitude !== "number" ||
    !Number.isFinite(value.longitude)
  ) {
    return malformed();
  }
  return { latitude: value.latitude, longitude: value.longitude };
}

export function decodeValue(value: unknown): FirestoreValue {
  if (!isRecord(value) || Object.keys(value).length !== 1) {
    return malformed();
  }
  if ("nullValue" in value && (value.nullValue === null || value.nullValue === "NULL_VALUE")) {
    return null;
  }
  if ("booleanValue" in value && typeof value.booleanValue === "boolean") {
    return value.booleanValue;
  }
  if ("integerValue" in value) {
    return decodeInteger(value.integerValue);
  }
  if ("doubleValue" in value) {
    return decodeDouble(value.doubleValue);
  }
  if ("timestampValue" in value) {
    return parseTimestamp(value.timestampValue);
  }
  if ("stringValue" in value && typeof value.stringValue === "string") {
    return value.stringValue;
  }
  if ("bytesValue" in value) {
    return decodeBytes(value.bytesValue);
  }
  if ("referenceValue" in value && typeof value.referenceValue === "string") {
    return value.referenceValue;
  }
  if ("geoPointValue" in value) {
    return decodeGeoPoint(value.geoPointValue);
  }
  if ("arrayValue" in value) {
    return decodeArray(value.arrayValue);
  }
  if ("mapValue" in value) {
    return decodeMap(value.mapValue);
  }
  return malformed();
}

function decodeFields(value: Record<string, unknown>): Record<string, FirestoreValue> {
  return Object.fromEntries(
    Object.entries(value).map(([field, fieldValue]) => [field, decodeValue(fieldValue)]),
  );
}

export function decodeDocument(value: unknown): FirestoreDocument {
  if (!isRecord(value) || typeof value.name !== "string" || value.name.length === 0) {
    return malformed();
  }
  if (value.fields !== undefined && !isRecord(value.fields)) {
    return malformed();
  }
  return {
    name: value.name,
    fields: decodeFields(value.fields ?? {}),
    ...(value.createTime === undefined ? {} : { createTime: parseTimestamp(value.createTime) }),
    ...(value.updateTime === undefined ? {} : { updateTime: parseTimestamp(value.updateTime) }),
  };
}

function encodeBytes(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function encodeValue(value: FirestoreWritableValue): Record<string, unknown> {
  if (value === SERVER_TIMESTAMP) {
    throw new TypeError("Server timestamps must be top-level fields");
  }
  if (value === null) {
    return { nullValue: null };
  }
  if (typeof value === "string") {
    return { stringValue: value };
  }
  if (typeof value === "boolean") {
    return { booleanValue: value };
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      if (Number.isNaN(value)) {
        return { doubleValue: "NaN" };
      }
      return { doubleValue: value > 0 ? "Infinity" : "-Infinity" };
    }
    return Number.isSafeInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) {
      throw new TypeError("Invalid Firestore timestamp");
    }
    return { timestampValue: value.toISOString() };
  }
  if (value instanceof Uint8Array) {
    return { bytesValue: encodeBytes(value) };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } };
  }
  if (!isRecord(value)) {
    throw new TypeError("Unsupported Firestore value");
  }
  return { mapValue: { fields: encodeFields(value as Record<string, FirestoreWritableValue>) } };
}

function encodeFields(
  fields: Record<string, FirestoreWritableValue>,
): Record<string, Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(fields).map(([field, value]) => [field, encodeValue(value)]),
  );
}

function splitTransforms(fields: Record<string, FirestoreWritableValue>): {
  encodedFields: Record<string, Record<string, unknown>>;
  transforms: { fieldPath: string; setToServerValue: "REQUEST_TIME" }[];
} {
  const regularFields: Record<string, FirestoreWritableValue> = {};
  const transforms: { fieldPath: string; setToServerValue: "REQUEST_TIME" }[] = [];
  for (const [field, value] of Object.entries(fields)) {
    if (value === SERVER_TIMESTAMP) {
      transforms.push({ fieldPath: field, setToServerValue: "REQUEST_TIME" });
    } else {
      regularFields[field] = value;
    }
  }
  return { encodedFields: encodeFields(regularFields), transforms };
}

function encodedPath(path: string, expected: "document" | "collection" | "parent"): string {
  if (path === "" && expected === "parent") {
    return "";
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment.length === 0)) {
    throw new TypeError("Invalid Firestore path");
  }
  const shouldBeEven = expected === "document" || expected === "parent";
  if ((segments.length % 2 === 0) !== shouldBeEven) {
    throw new TypeError("Invalid Firestore path");
  }
  return segments.map(encodeURIComponent).join("/");
}

function rootUrl(client: FirestoreRestClient): string {
  if (typeof client?.projectId !== "string" || client.projectId.length === 0) {
    throw new TypeError("Invalid Firestore client");
  }
  return `${FIRESTORE_API_ROOT}/projects/${encodeURIComponent(client.projectId)}/databases/(default)/documents`;
}

function rootName(client: FirestoreRestClient): string {
  return `projects/${client.projectId}/databases/(default)/documents`;
}

function requestHeaders(client: FirestoreRestClient, json = false): Headers {
  if (typeof client.accessToken !== "string" || client.accessToken.length === 0) {
    throw new TypeError("Invalid Firestore client");
  }
  const headers = new Headers({
    Accept: "application/json",
    Authorization: `Bearer ${client.accessToken}`,
  });
  if (json) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

async function performFetch(
  client: FirestoreRestClient,
  url: URL,
  init: RequestInit,
): Promise<Response> {
  const fetchImplementation = client.fetch ?? globalThis.fetch;
  if (typeof fetchImplementation !== "function") {
    throw new FirestoreRestError("Firestore request failed");
  }
  try {
    return await fetchImplementation(url.toString(), init);
  } catch {
    throw new FirestoreRestError("Firestore request failed");
  }
}

async function responseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return malformed();
  }
}

function requireSuccess(response: Response): void {
  if (!response.ok) {
    throw new FirestoreRestError("Firestore request failed", response.status);
  }
}

function appendMask(url: URL, name: "mask" | "updateMask", fields?: readonly string[]): void {
  for (const field of fields ?? []) {
    if (typeof field !== "string" || field.length === 0) {
      throw new TypeError("Invalid Firestore field mask");
    }
    url.searchParams.append(`${name}.fieldPaths`, field);
  }
}

function appendPrecondition(url: URL, precondition?: FirestoreWritePrecondition): void {
  if (!precondition) {
    return;
  }
  if (typeof precondition.exists === "boolean" && precondition.updateTime === undefined) {
    url.searchParams.set("currentDocument.exists", String(precondition.exists));
    return;
  }
  if (precondition.exists === undefined && precondition.updateTime !== undefined) {
    const updateTime = precondition.updateTime instanceof Date
      ? precondition.updateTime.toISOString()
      : precondition.updateTime;
    parseTimestamp(updateTime);
    url.searchParams.set("currentDocument.updateTime", updateTime);
    return;
  }
  throw new TypeError("Invalid Firestore precondition");
}

function preconditionJson(
  precondition: FirestoreWritePrecondition | undefined,
  fallback?: FirestoreWritePrecondition,
): Record<string, unknown> | undefined {
  const selected = precondition ?? fallback;
  if (!selected) {
    return undefined;
  }
  if (typeof selected.exists === "boolean" && selected.updateTime === undefined) {
    return { exists: selected.exists };
  }
  if (selected.exists === undefined && selected.updateTime !== undefined) {
    const updateTime = selected.updateTime instanceof Date
      ? selected.updateTime.toISOString()
      : selected.updateTime;
    parseTimestamp(updateTime);
    return { updateTime };
  }
  throw new TypeError("Invalid Firestore precondition");
}

async function commitWrite(
  client: FirestoreRestClient,
  documentPath: string,
  fields: Record<string, FirestoreWritableValue>,
  mode: "create" | "patch",
  options: PatchDocumentOptions = {},
): Promise<FirestoreCommitResult> {
  const { encodedFields, transforms } = splitTransforms(fields);
  const url = new URL(`${rootUrl(client)}:commit`);
  const name = `${rootName(client)}/${encodedPath(documentPath, "document")}`;
  const regularFieldNames = Object.keys(encodedFields);
  const precondition = preconditionJson(
    options.precondition,
    mode === "create" ? { exists: false } : undefined,
  );
  const write = mode === "patch" && regularFieldNames.length === 0
    ? {
        transform: { document: name, fieldTransforms: transforms },
        ...(precondition ? { currentDocument: precondition } : {}),
      }
    : {
        update: { name, fields: encodedFields },
        ...(mode === "patch"
          ? { updateMask: { fieldPaths: [...(options.updateMask ?? regularFieldNames)] } }
          : {}),
        updateTransforms: transforms,
        ...(precondition ? { currentDocument: precondition } : {}),
      };
  const response = await performFetch(client, url, {
    method: "POST",
    headers: requestHeaders(client, true),
    body: JSON.stringify({ writes: [write] }),
  });
  requireSuccess(response);
  const value = await responseJson(response);
  if (!isRecord(value) || !Array.isArray(value.writeResults) || value.writeResults.length !== 1) {
    return malformed();
  }
  const writeResult = value.writeResults[0];
  if (!isRecord(writeResult)) {
    return malformed();
  }
  const transformResults = writeResult.transformResults === undefined
    ? []
    : Array.isArray(writeResult.transformResults)
      ? writeResult.transformResults.map(decodeValue)
      : malformed();
  return {
    ...(value.commitTime === undefined ? {} : { commitTime: parseTimestamp(value.commitTime) }),
    ...(writeResult.updateTime === undefined
      ? {}
      : { updateTime: parseTimestamp(writeResult.updateTime) }),
    transformResults,
  };
}

export async function getDocument(
  client: FirestoreRestClient,
  documentPath: string,
  options: GetDocumentOptions = {},
): Promise<FirestoreDocument | null> {
  const url = new URL(`${rootUrl(client)}/${encodedPath(documentPath, "document")}`);
  appendMask(url, "mask", options.mask);
  const response = await performFetch(client, url, { headers: requestHeaders(client) });
  if (response.status === 404) {
    return null;
  }
  requireSuccess(response);
  return decodeDocument(await responseJson(response));
}

export async function listDocuments(
  client: FirestoreRestClient,
  collectionPath: string,
  options: ListDocumentsOptions = {},
): Promise<FirestoreListResult> {
  const url = new URL(`${rootUrl(client)}/${encodedPath(collectionPath, "collection")}`);
  if (options.pageSize !== undefined) {
    if (!Number.isSafeInteger(options.pageSize) || options.pageSize <= 0) {
      throw new TypeError("Invalid Firestore page size");
    }
    url.searchParams.set("pageSize", String(options.pageSize));
  }
  if (options.pageToken !== undefined) {
    url.searchParams.set("pageToken", options.pageToken);
  }
  if (options.orderBy !== undefined) {
    url.searchParams.set("orderBy", options.orderBy);
  }
  if (options.showMissing !== undefined) {
    url.searchParams.set("showMissing", String(options.showMissing));
  }
  appendMask(url, "mask", options.mask);

  const response = await performFetch(client, url, { headers: requestHeaders(client) });
  requireSuccess(response);
  const value = await responseJson(response);
  if (!isRecord(value)) {
    return malformed();
  }
  if (value.documents !== undefined && !Array.isArray(value.documents)) {
    return malformed();
  }
  if (value.nextPageToken !== undefined && typeof value.nextPageToken !== "string") {
    return malformed();
  }
  return {
    documents: (value.documents ?? []).map(decodeDocument),
    ...(value.nextPageToken === undefined ? {} : { nextPageToken: value.nextPageToken }),
  };
}

export async function runQuery(
  client: FirestoreRestClient,
  parentPath: string,
  structuredQuery: Record<string, unknown>,
): Promise<FirestoreDocument[]> {
  if (!isRecord(structuredQuery)) {
    throw new TypeError("Invalid Firestore query");
  }
  const parent = encodedPath(parentPath, "parent");
  const url = new URL(`${rootUrl(client)}${parent ? `/${parent}` : ""}:runQuery`);
  const response = await performFetch(client, url, {
    method: "POST",
    headers: requestHeaders(client, true),
    body: JSON.stringify({ structuredQuery }),
  });
  requireSuccess(response);
  const value = await responseJson(response);
  if (!Array.isArray(value) || value.some((row) => !isRecord(row))) {
    return malformed();
  }
  return value.flatMap((row) => row.document === undefined ? [] : [decodeDocument(row.document)]);
}

export async function createDocument(
  client: FirestoreRestClient,
  collectionPath: string,
  documentId: string,
  fields: Record<string, FirestoreWritableValue>,
  options: CreateDocumentOptions = {},
): Promise<FirestoreDocument | FirestoreCommitResult> {
  if (typeof documentId !== "string" || documentId.length === 0 || documentId.includes("/")) {
    throw new TypeError("Invalid Firestore document ID");
  }
  if (Object.values(fields).includes(SERVER_TIMESTAMP)) {
    if (options.mask?.length) {
      throw new TypeError("Response masks are unavailable for transformed writes");
    }
    return commitWrite(client, `${collectionPath}/${documentId}`, fields, "create");
  }
  const url = new URL(`${rootUrl(client)}/${encodedPath(collectionPath, "collection")}`);
  url.searchParams.set("documentId", documentId);
  appendMask(url, "mask", options.mask);
  const response = await performFetch(client, url, {
    method: "POST",
    headers: requestHeaders(client, true),
    body: JSON.stringify({ fields: encodeFields(fields) }),
  });
  requireSuccess(response);
  return decodeDocument(await responseJson(response));
}

export async function patchDocument(
  client: FirestoreRestClient,
  documentPath: string,
  fields: Record<string, FirestoreWritableValue>,
  options: PatchDocumentOptions = {},
): Promise<FirestoreDocument | FirestoreCommitResult> {
  if (Object.values(fields).includes(SERVER_TIMESTAMP)) {
    if (options.mask?.length) {
      throw new TypeError("Response masks are unavailable for transformed writes");
    }
    return commitWrite(client, documentPath, fields, "patch", options);
  }
  const url = new URL(`${rootUrl(client)}/${encodedPath(documentPath, "document")}`);
  appendMask(url, "updateMask", options.updateMask ?? Object.keys(fields));
  appendMask(url, "mask", options.mask);
  appendPrecondition(url, options.precondition);
  const response = await performFetch(client, url, {
    method: "PATCH",
    headers: requestHeaders(client, true),
    body: JSON.stringify({ fields: encodeFields(fields) }),
  });
  requireSuccess(response);
  return decodeDocument(await responseJson(response));
}

export async function deleteDocument(
  client: FirestoreRestClient,
  documentPath: string,
  options: DeleteDocumentOptions = {},
): Promise<boolean> {
  const url = new URL(`${rootUrl(client)}/${encodedPath(documentPath, "document")}`);
  appendPrecondition(url, options.precondition);
  const response = await performFetch(client, url, {
    method: "DELETE",
    headers: requestHeaders(client),
  });
  if (response.status === 404) {
    return false;
  }
  requireSuccess(response);
  return true;
}
