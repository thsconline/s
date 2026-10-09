const fs = require("fs");
const zlib = require("zlib");
const crypto = require("crypto");
const { execSync } = require("child_process");

const PASSWORD = process.env.GAS_SECRET_PASSWORD;
const ATOM_FILE = "./feed.atom";

const B2_KEY_ID = process.env.B2_APPLICATION_KEY_ID;
const B2_APP_KEY = process.env.B2_APPLICATION_KEY;
const B2_BUCKET_ID = process.env.B2_BUCKET_ID;

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

const KV_NAMESPACE_ID = process.env.KV_NAMESPACE_ID;

const PUBLIC_API_BASE_URL =  process.env.PUBLIC_API_BASE_URL ||  "https://thsconline.net";
const PUBLIC_API_BASE_URLWWW =  process.env.PUBLIC_API_BASE_URLWWW ||  "https://www.thsconline.net";


const CHUNK_SIZE = 4 * 1024 * 1024;


// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing ${name} environment variable.`
    );
  }

  return value;
}


// -----------------------------------------------------------------------------
// B2
// -----------------------------------------------------------------------------

async function getB2AuthTokens() {
  requireEnv("B2_APPLICATION_KEY_ID");
  requireEnv("B2_APPLICATION_KEY");
  requireEnv("B2_BUCKET_ID");

  const credentials = Buffer
    .from(`${B2_KEY_ID}:${B2_APP_KEY}`)
    .toString("base64");

  const response = await fetch(
    "https://api.backblazeb2.com/b2api/v4/b2_authorize_account",
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`
      }
    }
  );

  if (!response.ok) {
    const details = await response.text();

    throw new Error(
      `B2 authorization failed (${response.status} ${response.statusText}): ${details}`
    );
  }

  const responseText = await response.text();
  const data = JSON.parse(responseText);

  if (
    !data.apiInfo ||
    !data.apiInfo.storageApi ||
    !data.apiInfo.storageApi.apiUrl ||
    !data.authorizationToken
  ) {
    console.error(
      "B2 authorization response:",
      responseText
    );

    throw new Error(
      "B2 authorization response is missing apiUrl or authorizationToken."
    );
  }

  return data;
}


async function getB2UploadUrl(
  apiUrl,
  authToken
) {
  const response = await fetch(
    `${apiUrl}/b2api/v4/b2_get_upload_url`,
    {
      method: "POST",
      headers: {
        Authorization: authToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        bucketId: B2_BUCKET_ID
      })
    }
  );

  if (!response.ok) {
    const details = await response.text();

    throw new Error(
      `B2 get_upload_url failed (${response.status} ${response.statusText}): ${details}`
    );
  }

  const data = await response.json();

  if (
    !data.uploadUrl ||
    !data.authorizationToken
  ) {
    throw new Error(
      "B2 upload URL response is missing uploadUrl or authorizationToken."
    );
  }

  return data;
}


async function uploadBufferToB2(
  uploadUrl,
  uploadAuthToken,
  filename,
  dataBuffer
) {
  const contentSha1 = crypto
    .createHash("sha1")
    .update(dataBuffer)
    .digest("hex");

  const encodedFilename =
    encodeURIComponent(filename);

  const response = await fetch(
    uploadUrl,
    {
      method: "POST",
      headers: {
        Authorization: uploadAuthToken,
        "X-Bz-File-Name": encodedFilename,
        "Content-Type":
          "application/octet-stream",
        "Content-Length":
          String(dataBuffer.length),
        "X-Bz-Content-Sha1":
          contentSha1
      },
      body: dataBuffer
    }
  );

  if (!response.ok) {
    const details = await response.text();

    throw new Error(
      `B2 upload failed for ${filename} ` +
      `(${response.status} ${response.statusText}): ${details}`
    );
  }

  const result =
    await response.json();

  if (!result.fileId) {
    throw new Error(
      `B2 accepted ${filename}, but no fileId was returned.`
    );
  }

  return result;
}


async function listExistingPaperFragments(
  apiUrl,
  authToken,
  fileBaseName
) {
  const files = [];

  let startFileName;
  let startFileId;

  while (true) {
    const params =
      new URLSearchParams();

    params.set(
      "bucketId",
      B2_BUCKET_ID
    );

    params.set(
      "prefix",
      `${fileBaseName}.`
    );

    params.set(
      "maxFileCount",
      "1000"
    );

    if (startFileName) {
      params.set(
        "startFileName",
        startFileName
      );
    }

    if (startFileId) {
      params.set(
        "startFileId",
        startFileId
      );
    }

    const response =
      await fetch(
        `${apiUrl}/b2api/v4/b2_list_file_versions?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: authToken
          }
        }
      );

    if (!response.ok) {
      const details =
        await response.text();

      throw new Error(
        `B2 list_file_versions failed ` +
        `(${response.status} ${response.statusText}): ${details}`
      );
    }

    const data =
      await response.json();

    if (Array.isArray(data.files)) {
      for (const file of data.files) {
        const match =
          file.fileName.match(
            new RegExp(
              `^${escapeRegExp(fileBaseName)}\\.(\\d+)$`
            )
          );

        if (match) {
          files.push({
            fileId: file.fileId,
            fileName: file.fileName,
            fragmentIndex:
              Number(match[1]),
            action: file.action
          });
        }
      }
    }

    if (
      !data.nextFileName ||
      !data.nextFileId
    ) {
      break;
    }

    startFileName =
      data.nextFileName;

    startFileId =
      data.nextFileId;
  }

  return files;
}


async function deleteB2FileVersion(
  apiUrl,
  authToken,
  fileName,
  fileId
) {
  const response =
    await fetch(
      `${apiUrl}/b2api/v4/b2_delete_file_version`,
      {
        method: "POST",
        headers: {
          Authorization: authToken,
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          fileName,
          fileId
        })
      }
    );

  if (!response.ok) {
    const details =
      await response.text();

    throw new Error(
      `B2 delete_file_version failed for ${fileName} ` +
      `(${response.status} ${response.statusText}): ${details}`
    );
  }

  return response.json();
}


function escapeRegExp(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}


// -----------------------------------------------------------------------------
// Cloudflare KV
// -----------------------------------------------------------------------------

function buildKVUrl(key) {
  requireEnv(
    "CLOUDFLARE_ACCOUNT_ID"
  );

  requireEnv(
    "KV_NAMESPACE_ID"
  );

  return (
    `https://api.cloudflare.com/client/v4/` +
    `accounts/${encodeURIComponent(CLOUDFLARE_ACCOUNT_ID)}/` +
    `storage/kv/namespaces/${encodeURIComponent(KV_NAMESPACE_ID)}/` +
    `values/${encodeURIComponent(key)}`
  );
}


async function getKVCount(key) {
  requireEnv(
    "CLOUDFLARE_API_TOKEN"
  );

  const response =
    await fetch(
      buildKVUrl(key),
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${CLOUDFLARE_API_TOKEN}`
        }
      }
    );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const details =
      await response.text();

    throw new Error(
      `KV read failed (${response.status} ${response.statusText}): ${details}`
    );
  }

  const text =
    await response.text();

  const count =
    Number(text.trim());

  if (
    !Number.isInteger(count) ||
    count < 0
  ) {
    throw new Error(
      `KV value for "${key}" is invalid: ${text}`
    );
  }

  return count;
}


async function putKVCount(
  key,
  count
) {
  requireEnv(
    "CLOUDFLARE_API_TOKEN"
  );

  const response =
    await fetch(
      buildKVUrl(key),
      {
        method: "PUT",
        headers: {
          Authorization:
            `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type":
            "text/plain; charset=utf-8"
        },
        body: String(count)
      }
    );

  if (!response.ok) {
    const details =
      await response.text();

    throw new Error(
      `KV write failed (${response.status} ${response.statusText}): ${details}`
    );
  }

  const result =
    await response.json();

  if (!result.success) {
    throw new Error(
      `KV write was not successful: ${JSON.stringify(result)}`
    );
  }
}


// -----------------------------------------------------------------------------
// Cloudflare Cache Purge
// -----------------------------------------------------------------------------

async function purgeCloudflareUrls(
  urls
) {
  requireEnv(
    "CLOUDFLARE_API_TOKEN"
  );

  requireEnv(
    "CLOUDFLARE_ZONE_ID"
  );

  if (urls.length === 0) {
    return;
  }

  const batchSize = 100;

  for (
    let offset = 0;
    offset < urls.length;
    offset += batchSize
  ) {
    const batch =
      urls.slice(
        offset,
        offset + batchSize
      );

    console.log(
      `   ☁️ Purging Cloudflare cache for ${batch.length} URL(s)...`
    );

    const response =
      await fetch(
        `https://api.cloudflare.com/client/v4/` +
        `zones/${CLOUDFLARE_ZONE_ID}/purge_cache`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${CLOUDFLARE_API_TOKEN}`,
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            files: batch
          })
        }
      );

    const result =
      await response.json();

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        `Cloudflare cache purge failed ` +
        `(${response.status} ${response.statusText}): ` +
        `${JSON.stringify(result)}`
      );
    }

    console.log(
      "   ✅ Cloudflare cache purge accepted."
    );
  }
}


function buildCloudflarePurgeUrls(
  viewNo,
  title,
  fragmentCount
) {
  const bases = [
    PUBLIC_API_BASE_URL.replace(/\/+$/, ""),
    PUBLIC_API_BASE_URLWWW.replace(/\/+$/, "")
  ];

  const encodedViewNo = encodeURIComponent(viewNo);
  const encodedTitle = encodeURIComponent(title);

  const urls = [];

  for (const base of [...new Set(bases)]) {
    urls.push(
      `${base}/api/v1/getmetadata/${encodedViewNo}/${encodedTitle}`,
      `${base}/api/v1/countfragments/${encodedViewNo}/${encodedTitle}`
    );

    for (let fragmentIndex = 0; fragmentIndex < fragmentCount; fragmentIndex++) {
      urls.push(
        `${base}/api/v1/getfragment/${encodedViewNo}/${encodedTitle}/${fragmentIndex}`
      );
    }
  }

  return urls;
}


// -----------------------------------------------------------------------------
// Feed
// -----------------------------------------------------------------------------

function parseAtomFeed(
  xmlString
) {
  const entries = [];

  const rootUpdatedMatch =
    xmlString.match(
      /<(?:(?:\w+):)?feed\b[^>]*>[\s\S]*?<(?:(?:\w+):)?updated\b[^>]*>([\s\S]*?)<\/(?:(?:\w+):)?updated>/i
    );

  const globalFeedUpdatedTime =
    rootUpdatedMatch
      ? new Date(
          rootUpdatedMatch[1].trim()
        ).getTime()
      : null;

  const entryRegex =
    /<(?:(?:\w+):)?entry\b[^>]*>([\s\S]*?)<\/(?:(?:\w+):)?entry>/gi;

  let match;

  while (
    (match = entryRegex.exec(xmlString)) !== null
  ) {
    const entryBlock =
      match[1];

    const titleMatch =
      entryBlock.match(
        /<(?:(?:\w+):)?title\b[^>]*>([\s\S]*?)<\/(?:(?:\w+):)?title>/i
      );

    const collectionMatch =
      entryBlock.match(
        /<(?:(?:\w+):)?collection\b[^>]*>([\s\S]*?)<\/(?:(?:\w+):)?collection>/i
      );

    const updatedMatch =
      entryBlock.match(
        /<(?:(?:\w+):)?updated\b[^>]*>([\s\S]*?)<\/(?:(?:\w+):)?updated>/i
      );

    if (
      titleMatch &&
      collectionMatch &&
      updatedMatch
    ) {
      const updatedTime =
        new Date(
          updatedMatch[1].trim()
        ).getTime();

      if (
        !Number.isNaN(
          updatedTime
        )
      ) {
        entries.push({
          viewNo:
            collectionMatch[1].trim(),

          title:
            titleMatch[1].trim(),

          updatedTime
        });
      }
    }
  }

  return {
    entries,
    globalFeedUpdatedTime
  };
}


// -----------------------------------------------------------------------------
// GAS
// -----------------------------------------------------------------------------

function selectWorker(
  includeFallback = true
) {
  const workers = [
    "AKfycbzwc57zmEK1Vm9Q5L1n1my3dxRafZRfNhCZ24zSLIa9H7MhySFhNahvPfW4R3uq753_",
    "AKfycbxCi8vsX-_l5a0JP-mG1RXIbSeiuZOfteumnk96oZCgQMR9nHjikpDqpknUHp-K5hg",
    "AKfycbz0Jc62sHl3IKUJNpqYZp6FGf85aERQKg4SITYgb0pbOJXGvo7CVshdIhN3AEbEBkQmww",
    "AKfycbwMElTU5QdXoUEc4yWj8mUbF-753lHMFAafJn7GuaV8WpACWy16DWhXS8KfJA_HKEZ03Q",
    "AKfycbwafzfiazfcLyo4MPomtJV8j8P3Ys5Y5Z5dlbo6X_Ddll40NQyylFotiGP4RmlNEPNFpg",
    "AKfycbz2OkJ8-2GbIVWOAOAP0Qp37Sts2tclovMTtGEIfqWRkePvz1G1Ag3YywZNyDxeBtYkjg",
    "AKfycbyMS8xD-tK6wRe7wc3fyKAX7MmLiLOU5CTLHVV_HLNImZFx8SsPA2Cvhcc0Ml2TUeas",
    "AKfycbyOERxQbjmX6cmaY9txazA2MFY7y66ylYHyGG1FeGFHARXk36jLvIOGJUsUoy8VmOrp",
    "AKfycbx0LmnTURBcvLI1I4hASnAOTOkqsNEWToguRNAkypoIiGorRQr6YyqFlbOaZjtnWBjx",
    "AKfycbyaAQFka8STu0Fupxt333SW2T-7InSqmY6moyRs8-YGHucSiFqqpyCE4vktadLziRPe",
    "AKfycbxBXfKvsLNcAoiD1usgXLJejnVbGJ4Q0c9WYdufoHoIsuC4bbLKPlQ4XsLPNHRFAzilow",
    "AKfycbw3FjfIIds8UpY4GE_Jdu9hF8Mf58govLZcdpVdHOqb6IbF_A8F2cgtkvv--iEgOEzm",
    "AKfycbyzcBH0M5Np7XQf4aaGktd0zgHt5Sa0CRAXiG-XiUyWd5jzEN1qLDcjXbpVgu0LKQbJ",
    "AKfycbxq4Pi15A7VI2PQGJBnCU0OL0K08gfqbl1dRQEwQc5dcELs1BUoGBw8s9cGQHQncmjh",
    "AKfycbwYhBoXMfdf0QisZrOiUqr27DwE5Hf9hIYAeXV9SfYce-j5VrdwXkJp_wKSwV70yOe6TQ"
  ];

  const fallback =
    "AKfycbx69GPoJtf9sSevsUbWtPr46vpa01u4oNkHjFmkkWxmj62AZ0q-";

  if (!includeFallback) {
    return workers[
      Math.floor(
        Math.random() *
        workers.length
      )
    ];
  }

  return Math.random() < 15 / 16
    ? workers[
        Math.floor(
          Math.random() *
          workers.length
        )
      ]
    : fallback;
}


// -----------------------------------------------------------------------------
// File base name
// -----------------------------------------------------------------------------

function buildFileBaseName(
  viewNo,
  title
) {
  const normalizedTitle =
    title
      .toLowerCase()
      .replace(
        /\s*w\.\s*sol\s*$/i,
        ""
      )
      .replace(
        /\s+/g,
        "-"
      )
      .replace(
        /[^a-z0-9-]/g,
        ""
      )
      .replace(
        /-+/g,
        "-"
      )
      .replace(
        /^-|-$/g,
        "");

  return `${viewNo}-${normalizedTitle}`;
}


// -----------------------------------------------------------------------------
// Process Paper
// -----------------------------------------------------------------------------

async function processPaper(
  viewNo,
  title,
  b2Session
) {
  const fileBaseName =
    buildFileBaseName(
      viewNo,
      title
    );

  console.log(
    `📁 Generated file base name: ${fileBaseName}`
  );

  /*
   * KV key deliberately matches the B2/API base name.
   *
   * Example:
   * 5328-2025-acme-trials
   */
  const kvKey =
    `${fileBaseName}`;

  console.log(
    `🔑 KV key: ${kvKey}`
  );

  /*
   * ---------------------------------------------------------------------------
   * READ PREVIOUS COUNT FROM KV
   * ---------------------------------------------------------------------------
   */

  let previousKVCount =
    await getKVCount(kvKey);

  if (
    previousKVCount === null
  ) {
    console.log(
      "   ℹ️ No existing KV count found."
    );
  } else {
    console.log(
      `   📊 Previous KV fragment count: ${previousKVCount}`
    );
  }

  const workerToken =
    selectWorker(false);

  const dataGasUrl =
    new URL(
      `https://script.google.com/macros/s/${workerToken}/exec`
    );

  dataGasUrl.searchParams.set(
    "export",
    "view"
  );

  dataGasUrl.searchParams.set(
    "base",
    viewNo
  );

  dataGasUrl.searchParams.set(
    "field",
    title
  );

  dataGasUrl.searchParams.set(
    "hash",
    PASSWORD
  );

  try {
    console.log(
      `📡 Fetching from endpoint [${workerToken}]`
    );

    const debugGasUrl =
      new URL(dataGasUrl);

    debugGasUrl.searchParams.set(
      "hash",
      "***REDACTED***"
    );

    console.log(
      `   🌐 GAS URL: ${debugGasUrl.toString()}`
    );

    console.log(
      `   📋 GAS parameters: ` +
      `export=view, ` +
      `base=${viewNo}, ` +
      `field="${title}", ` +
      `password=${PASSWORD ? "SET" : "MISSING"}`
    );

    const gasRequestStarted =
      Date.now();

    const response =
      await fetch(
        dataGasUrl.toString(),
        {
          method: "GET"
        }
      );

    const gasRequestDuration =
      Date.now() -
      gasRequestStarted;

    console.log(
      `   📥 GAS response received after ${gasRequestDuration} ms`
    );

    console.log(
      `   📊 Status: ${response.status} ${response.statusText}`
    );

    console.log(
      `   🔀 Redirected: ${response.redirected}`
    );

    console.log(
      `   🌐 Final URL: ${response.url}`
    );

    console.log(
      `   📄 Content-Type: ${response.headers.get("content-type")}`
    );

    if (!response.ok) {
      const errorBody =
        await response.text();

      console.error(
        `   ❌ GAS response body: ${errorBody}`
      );

      throw new Error(
        `HTTP Error Status: ${response.status} ${response.statusText}`
      );
    }

    console.log(
      "   📦 Parsing GAS JSON response..."
    );

    const gasData =
      await response.json();

    console.log(
      "   ✅ GAS JSON response parsed successfully."
    );

    if (
      gasData.fileref ===
      "12TrRtJ9xfV4mo9O34MJ5_1YrHzjvirBR"
    ) {
      console.warn(
        "   ⚠️ GAS query succeeded, but the requested file was not found."
      );

      return;
    }

    if (!gasData.data) {
      console.warn(
        `   ⚠️ GAS returned no content data. ` +
        `Possible empty file or conversion failure. ` +
        `Message: ${gasData.error || "No payload content data string"}`
      );

      return;
    }

    console.log(
      `   ✅ GAS file data retrieved successfully (${gasData.data.length} characters).`
    );

    const pdfBuffer =
      Buffer.from(
        gasData.data,
        "base64"
      );

    console.log(
      `   📦 Received ${pdfBuffer.length} bytes from GAS.`
    );

    console.log(
      "   🗜️ Applying in-memory GZIP compression..."
    );

    const gzippedBuffer =
      zlib.gzipSync(
        pdfBuffer
      );

    console.log(
      `   📦 Compressed payload: ${gzippedBuffer.length} bytes.`
    );

    const newFragmentCount =
      Math.ceil(
        gzippedBuffer.length /
        CHUNK_SIZE
      );

    console.log(
      `   📊 New fragment count: ${newFragmentCount}`
    );

    /*
     * -------------------------------------------------------------------------
     * UPLOAD NEW FRAGMENTS
     * -------------------------------------------------------------------------
     */

    let offset = 0;
    let fragmentIndex = 0;

    while (
      offset < gzippedBuffer.length
    ) {
      const bytesLeft =
        gzippedBuffer.length -
        offset;

      const lengthToWrite =
        Math.min(
          CHUNK_SIZE,
          bytesLeft
        );

      const chunkSlice =
        gzippedBuffer.subarray(
          offset,
          offset + lengthToWrite
        );

      const fragmentName =
        `${fileBaseName}.${fragmentIndex}`;

      console.log(
        `      ☁️ Uploading segment: ${fragmentName} (${lengthToWrite} bytes)...`
      );

      const uploadResult =
        await uploadBufferToB2(
          b2Session.uploadUrl,
          b2Session.uploadToken,
          fragmentName,
          chunkSlice
        );

      console.log(
        `      ✅ Uploaded ${fragmentName} (fileId: ${uploadResult.fileId})`
      );

      offset += lengthToWrite;
      fragmentIndex++;
    }

    console.log(
      `✅ Uploaded ${newFragmentCount} new fragments.`
    );

    /*
     * -------------------------------------------------------------------------
     * REMOVE STALE B2 FRAGMENTS
     * -------------------------------------------------------------------------
     *
     * We use the previous KV count to determine whether there may be stale
     * fragments. If KV did not exist, we still inspect B2 only when necessary
     * to clean up old fragments.
     */

    if (
      previousKVCount !== null &&
      previousKVCount > newFragmentCount
    ) {
      console.log(
        `   🗑️ Removing ${previousKVCount - newFragmentCount} stale fragment(s)...`
      );

      const existingFiles =
        await listExistingPaperFragments(
          b2Session.apiUrl,
          b2Session.authToken,
          fileBaseName
        );

      for (
        const file of existingFiles
      ) {
        if (
          file.fragmentIndex >=
          newFragmentCount
        ) {
          console.log(
            `      🗑️ Deleting ${file.fileName}...`
          );

          await deleteB2FileVersion(
            b2Session.apiUrl,
            b2Session.authToken,
            file.fileName,
            file.fileId
          );
        }
      }
    }

    /*
     * -------------------------------------------------------------------------
     * KV CHANGE TEST
     * -------------------------------------------------------------------------
     */

    const kvChanged =
      previousKVCount === null ||
      previousKVCount !==
        newFragmentCount;

    if (!kvChanged) {
      console.log(
        `   ✅ KV count unchanged (${newFragmentCount}).`
      );

      console.log(
        "   ⏩ Skipping KV write."
      );

      console.log(
        "   ⏩ Skipping Cloudflare cache purge."
      );

      return;
    }

    /*
     * -------------------------------------------------------------------------
     * KV WRITE
     * -------------------------------------------------------------------------
     */

    console.log(
      `   🔄 KV count changed: ` +
      `${previousKVCount === null ? "missing" : previousKVCount} → ` +
      `${newFragmentCount}`
    );

    await putKVCount(
      kvKey,
      newFragmentCount
    );

    console.log(
      `   ✅ KV updated: ${kvKey} = ${newFragmentCount}`
    );

    /*
     * -------------------------------------------------------------------------
     * CLOUDFLARE PURGE
     * -------------------------------------------------------------------------
     *
     * Purge the greater of the old and new counts.
     *
     * This is important when a file shrinks:
     *
     * old = 15
     * new = 12
     *
     * We purge 0–14, including stale 12–14 URLs.
     */

    const purgeFragmentCount =
      Math.max(
        previousKVCount === null
          ? 0
          : previousKVCount,
        newFragmentCount
      );

    const purgeUrls =
      buildCloudflarePurgeUrls(
        viewNo,
        title,
        purgeFragmentCount
      );

    console.log(
      `☁️ Purging ${purgeUrls.length} Cloudflare URL(s)...`
    );

    /*
     * Print the COMPLETE purge list.
     */
    console.log(
      "\n----- CLOUDFLARE PURGE URL LIST -----"
    );

    for (
      const purgeUrl of purgeUrls
    ) {
      console.log(
        purgeUrl
      );
    }

    console.log(
      "----- END CLOUDFLARE PURGE URL LIST -----\n"
    );

    await purgeCloudflareUrls(
      purgeUrls
    );

    console.log(
      `✅ Cloudflare cache purge complete for "${title}".`
    );

  } catch (err) {
    console.error(
      `❌ Thread exception handling paper index mapping [${title}]:`,
      err.message
    );
  }
}


// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  if (
    !fs.existsSync(
      ATOM_FILE
    )
  ) {
    console.error(
      `❌ Execution Aborted: Target source feed cannot be found at path: ${ATOM_FILE}`
    );

    process.exit(1);
  }

  try {
    console.log(
      "📖 Loading and parsing database records from source: " +
      `${ATOM_FILE}...`
    );

    const feedXmlContent =
      fs.readFileSync(
        ATOM_FILE,
        "utf8"
      );

    console.log(
      `📄 feed.atom size: ${feedXmlContent.length} characters`
    );

    console.log(
      `🔍 Entry tags found: ${
        (
          feedXmlContent.match(
            /<(?:(?:\w+):)?entry\b/gi
          ) || []
        ).length
      }`
    );

    console.log(
      `🔍 Title tags found: ${
        (
          feedXmlContent.match(
            /<(?:(?:\w+):)?title\b/gi
          ) || []
        ).length
      }`
    );

    console.log(
      `🔍 Collection tags found: ${
        (
          feedXmlContent.match(
            /<(?:(?:\w+):)?collection\b/gi
          ) || []
        ).length
      }`
    );

    console.log(
      `🔍 Updated tags found: ${
        (
          feedXmlContent.match(
            /<(?:(?:\w+):)?updated\b/gi
          ) || []
        ).length
      }`
    );

    const {
      entries,
      globalFeedUpdatedTime
    } =
      parseAtomFeed(
        feedXmlContent
      );

    if (
      entries.length === 0
    ) {
      console.warn(
        "⚠️ Warning: No valid items extracted out of the feed file tags."
      );

      process.exit(0);
    }

    if (
      !globalFeedUpdatedTime ||
      Number.isNaN(
        globalFeedUpdatedTime
      )
    ) {
      console.warn(
        "⏩ Feed has no valid global updated timestamp. Nothing to process."
      );

      process.exit(0);
    }

    console.log(
      `🕐 Feed updated time: ${new Date(globalFeedUpdatedTime).toISOString()}`
    );

    console.log(
      "🔒 Connecting auth links to Backblaze B2 networks..."
    );

    const baseAuth =
      await getB2AuthTokens();

    const b2Upload =
      await getB2UploadUrl(
        baseAuth.apiInfo.storageApi.apiUrl,
        baseAuth.authorizationToken
      );

    const b2Session = {
      uploadUrl:
        b2Upload.uploadUrl,

      uploadToken:
        b2Upload.authorizationToken,

      apiUrl:
        baseAuth.apiInfo.storageApi.apiUrl,

      authToken:
        baseAuth.authorizationToken
    };

    console.log(
      "☁️ B2 upload target acquired successfully."
    );

    console.log(
      `📝 Discovered ${entries.length} active records inside feed. Beginning processing timelines...`
    );

    for (
      const paper of entries
    ) {
      console.log(
        `\n🔎 Evaluating entry timeline status for: "${paper.title}"`
      );

      if (
        paper.updatedTime ===
        globalFeedUpdatedTime
      ) {
        console.log(
          "🚀 Match! Item has a current batch timestamp. Launching execution pipeline..."
        );

        await processPaper(
          paper.viewNo,
          paper.title,
          b2Session
        );
      } else {
        console.log(
          "⏩ Skipped: Entry timestamp indicates this item belongs to a historic change layer."
        );
      }
    }

    console.log(
      "\n🏁 Execution complete. All data streams safely written to Backblaze."
    );

  } catch (err) {
    console.error(
      "❌ Fatal System Initialization Failure:",
      err.message
    );

    process.exit(1);
  }
}


main();
