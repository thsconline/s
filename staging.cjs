/**
 * staging.cjs
 *
 * Parses feed.atom timeframes, generates deterministic file hashes,
 * pulls Base64 streams from GAS via legacy URL mapping parameters,
 * and streams 4 MiB chunks directly into a private Backblaze B2 bucket.
 */

const fs = require("fs");
const zlib = require("zlib");
const crypto = require("crypto");

const { SHA256, selectworker } = require("./viewer.js");

console.log("viewer.js exports:", {
  SHA256,
  SHA256Type: typeof SHA256,
  selectworkerType: typeof selectworker
});

// -----------------------------------------------------------------------------
// 1. Structural Environment Mapping Configurations
// -----------------------------------------------------------------------------

const PASSWORD = process.env.GAS_SECRET_PASSWORD;
const ATOM_FILE = "./feed.atom";

// Backblaze Authorization Coordinates
const B2_KEY_ID = process.env.B2_APPLICATION_KEY_ID;
const B2_APP_KEY = process.env.B2_APPLICATION_KEY;
const B2_BUCKET_ID = process.env.B2_BUCKET_ID;

const CHUNK_SIZE = 4 * 1024 * 1024; // Exactly 4 MiB (4,194,304 bytes)


// -----------------------------------------------------------------------------
// 2. Backblaze B2 Authorization
// -----------------------------------------------------------------------------

async function getB2AuthTokens() {
  if (!B2_KEY_ID) {
    throw new Error("Missing B2_APPLICATION_KEY_ID environment variable.");
  }

  if (!B2_APP_KEY) {
    throw new Error("Missing B2_APPLICATION_KEY environment variable.");
  }

  if (!B2_BUCKET_ID) {
    throw new Error("Missing B2_BUCKET_ID environment variable.");
  }

  const base64Credentials = Buffer
    .from(`${B2_KEY_ID}:${B2_APP_KEY}`)
    .toString("base64");

  const response = await fetch(
    "https://api.backblazeb2.com/b2api/v4/b2_authorize_account",
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${base64Credentials}`
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
  
  
  if (!data.apiInfo.storageApi.apiUrl || !data.authorizationToken) {
	console.error("B2 authorization response:", responseText);
    throw new Error(
      "B2 authorization response is missing apiUrl or authorizationToken."
    );
  }

  return data;
}


// -----------------------------------------------------------------------------
// 3. Obtain B2 Upload URL
// -----------------------------------------------------------------------------

async function getB2UploadUrl(apiUrl, authToken) {
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

  if (!data.uploadUrl || !data.authorizationToken) {
    throw new Error(
      "B2 upload URL response is missing uploadUrl or authorizationToken."
    );
  }

  return data;
}


// -----------------------------------------------------------------------------
// 4. Upload One Binary Fragment to B2
// -----------------------------------------------------------------------------

async function uploadBufferToB2(
  uploadUrl,
  uploadAuthToken,
  filename,
  dataBuffer
) {
  /*
   * B2 expects the SHA-1 digest of the exact bytes being uploaded.
   */
  const contentSha1 = crypto
    .createHash("sha1")
    .update(dataBuffer)
    .digest("hex");

  /*
   * X-Bz-File-Name must contain a URL-encoded file name.
   */
  const encodedFilename = encodeURIComponent(filename);

  const response = await fetch(uploadUrl, {
    method: "POST",

    headers: {
      Authorization: uploadAuthToken,
      "X-Bz-File-Name": encodedFilename,
      "Content-Type": "application/octet-stream",
      "Content-Length": String(dataBuffer.length),
      "X-Bz-Content-Sha1": contentSha1
    },

    body: dataBuffer
  });

  if (!response.ok) {
    const errorDetails = await response.text();

    throw new Error(
      `B2 upload failed for ${filename} ` +
      `(${response.status} ${response.statusText}): ${errorDetails}`
    );
  }

  const result = await response.json();

  if (!result.fileId) {
    throw new Error(
      `B2 accepted ${filename}, but no fileId was returned.`
    );
  }

  return result;
}


// -----------------------------------------------------------------------------
// 5. Parse XML Structured Entry Blocks
// -----------------------------------------------------------------------------

function parseAtomFeed(xmlString) {
  const entries = [];

  /*
   * Extract the root/global feed updated timestamp first.
   */
  const rootUpdatedMatch = xmlString.match(
    /<feed[\s\S]*?<updated>([\s\S]*?)<\/updated>/
  );

  const globalFeedUpdatedTime = rootUpdatedMatch
    ? new Date(rootUpdatedMatch[1].trim()).getTime()
    : null;

  /*
   * Extract individual <entry> blocks.
   */
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;

  let match;

  while ((match = entryRegex.exec(xmlString)) !== null) {
    const entryBlock = match[1];

    const titleMatch = entryBlock.match(
      /<title>([\s\S]*?)<\/title>/
    );

    const collectionMatch = entryBlock.match(
      /<collection>([\s\S]*?)<\/collection>/
    );

    const updatedMatch = entryBlock.match(
      /<updated>([\s\S]*?)<\/updated>/
    );

    if (titleMatch && collectionMatch && updatedMatch) {
      const updatedTime = new Date(
        updatedMatch[1].trim()
      ).getTime();

      entries.push({
        viewNo: collectionMatch[1].trim(),
        title: titleMatch[1].trim(),
        updatedTime
      });
    }
  }

  return {
    entries,
    globalFeedUpdatedTime
  };
}


async function processPaper(viewNo, title, b2Session) {
  /*
   * Replicate viewer.js hashing signature rules to determine
   * the exact file name used for Backblaze.
   */
  const hashTemplate = `${viewNo}_${title}`;

  let filehash;

  try {
    filehash = SHA256(hashTemplate);
  } catch (err) {
    console.error(
      `❌ Cryptographic execution error on string template: ${hashTemplate}`,
      err
    );

    return;
  }

  /*
   * Select a valid operational Google Apps Script cluster endpoint.
   */
  const workerToken = selectworker(false);

  /*
   * Map legacy parameter targets using structured URL search parameters.
   */
  const legacyGasUrl = new URL(
    `https://script.google.com/macros/s/${workerToken}/exec`
  );

  legacyGasUrl.searchParams.set("export", "view");
  legacyGasUrl.searchParams.set("base", viewNo);
  legacyGasUrl.searchParams.set("field", title);
  legacyGasUrl.searchParams.set("hash", PASSWORD);

  try {
    console.log(
      `📡 Fetching from endpoint [${workerToken}] ` +
      `for target filehash: ${filehash}`
    );

    /*
     * Debug GAS request details.
     *
     * Password is deliberately redacted from the logged URL.
     */
    const debugGasUrl = new URL(legacyGasUrl);
    debugGasUrl.searchParams.set("hash", "***REDACTED***");

    console.log(
      `   🌐 GAS URL: ${debugGasUrl.toString()}`
    );

    console.log(
      `   📋 GAS parameters: ` +
      `export=view, base=${viewNo}, field="${title}", password=${PASSWORD ? "SET" : "MISSING"}`
    );

    console.log(
      `   ⏳ Sending GET request to script.google.com...`
    );

    const gasRequestStarted = Date.now();

    /*
     * Fetch handles Google 302 redirects natively.
     */
    const response = await fetch(
      legacyGasUrl.toString(),
      {
        method: "GET"
      }
    );

    const gasRequestDuration = Date.now() - gasRequestStarted;

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
      const errorBody = await response.text();

      console.error(
        `   ❌ GAS response body: ${errorBody}`
      );

      throw new Error(
        `HTTP Error Status: ${response.status} ${response.statusText}`
      );
    }

    console.log(
      `   📦 Parsing GAS JSON response...`
    );

    const gasData = await response.json();

    console.log(
      `   ✅ GAS JSON response parsed successfully.`
    );

    /*
     * Validate the expected GAS payload.
     */
    if (
      gasData.fileref !== "12TrRtJ9xfV4mo9O34MJ5_1YrHzjvirBR" ||
      !gasData.base64Data
    ) {
      console.warn(
        `   ⚠️ GAS node failed to supply matching data stream. ` +
        `Message: ${gasData.error || "No payload content data string"}`
      );

      console.warn(
        `   🔎 GAS response keys: ${Object.keys(gasData).join(", ")}`
      );

      return;
    }

    /*
     * Convert Base64 directly into a Buffer.
     */
    const pdfBuffer = Buffer.from(
      gasData.base64Data,
      "base64"
    );

    console.log(
      `   📦 Received ${pdfBuffer.length} bytes from GAS.`
    );

    /*
     * Apply in-memory GZIP compression.
     *
     * No temporary PDF or gzip files are written to disk.
     */
    console.log(
      `   🗜️ Applying in-memory GZIP compression...`
    );

    const gzippedBuffer = zlib.gzipSync(pdfBuffer);

    console.log(
      `   📦 Compressed payload: ${gzippedBuffer.length} bytes.`
    );

    /*
     * Binary fragmentation router.
     *
     * Each fragment is uploaded as:
     *
     *   filehash.0
     *   filehash.1
     *   filehash.2
     *   ...
     */
    let offset = 0;
    let fragmentIndex = 0;

    while (offset < gzippedBuffer.length) {
      const bytesLeft =
        gzippedBuffer.length - offset;

      const lengthToWrite = Math.min(
        CHUNK_SIZE,
        bytesLeft
      );

      const chunkSlice = gzippedBuffer.subarray(
        offset,
        offset + lengthToWrite
      );

      const fragmentName =
        `${filehash}.${fragmentIndex}`;

      console.log(
        `      ☁️ Uploading segment: ${fragmentName} ` +
        `(${lengthToWrite} bytes)...`
      );

      const uploadResult = await uploadBufferToB2(
        b2Session.uploadUrl,
        b2Session.uploadToken,
        fragmentName,
        chunkSlice
      );

      console.log(
        `      ✅ Uploaded ${fragmentName} ` +
        `(fileId: ${uploadResult.fileId})`
      );

      offset += lengthToWrite;
      fragmentIndex++;
    }

    console.log(
      `✅ File processing loop successful. ` +
      `Uploaded ${fragmentIndex} blocks for filehash: ${filehash}`
    );

  } catch (err) {
    console.error(
      `❌ Thread exception handling paper index mapping [${title}]:`,
      err.message
    );
  }
}



// -----------------------------------------------------------------------------
// 7. Main Orchestration Entry Point
// -----------------------------------------------------------------------------

async function main() {
  if (!fs.existsSync(ATOM_FILE)) {
    console.error(
      `❌ Execution Aborted: Target source feed cannot be found at path: ${ATOM_FILE}`
    );

    process.exit(1);
  }

  try {
    /*
     * Load and parse feed.
     */
    console.log(
      `📖 Loading and parsing database records from source: ${ATOM_FILE}...`
    );

    const feedXmlContent = fs.readFileSync(
      ATOM_FILE,
      "utf8"
    );

    const {
      entries,
      globalFeedUpdatedTime
    } = parseAtomFeed(feedXmlContent);

    if (entries.length === 0) {
      console.warn(
        "⚠️ Warning: No valid items extracted out of the feed file tags."
      );

      process.exit(0);
    }

    /*
     * Authenticate against Backblaze.
     */
    console.log(
      "🔒 Connecting auth links to Backblaze B2 networks..."
    );

    const baseAuth = await getB2AuthTokens();

    /*
     * Request an upload target for the bucket.
     */
    const b2Upload = await getB2UploadUrl(
      baseAuth.apiInfo.storageApi.apiUrl,
      baseAuth.authorizationToken
    );

    /*
     * Important:
     *
     * b2_get_upload_url returns:
     *
     *   uploadUrl
     *   authorizationToken
     *
     * The token is NOT named uploadAuthorizationToken.
     */
    const b2Session = {
      uploadUrl: b2Upload.uploadUrl,
      uploadToken: b2Upload.authorizationToken
    };

    console.log(
      `☁️ B2 upload target acquired successfully.`
    );

    console.log(
      `📝 Discovered ${entries.length} active records inside feed. ` +
      `Beginning processing timelines...`
    );

    /*
     * Iterate through items found in the XML feed sequentially.
     */
    for (const paper of entries) {
      console.log(
        `\n🔎 Evaluating entry timeline status for: "${paper.title}"`
      );

      /*
       * Only process entries whose updated timestamp matches
       * the global feed timestamp.
       */
      if (
        globalFeedUpdatedTime &&
        paper.updatedTime === globalFeedUpdatedTime
      ) {
        console.log(
          `🚀 Match! Item has a current batch timestamp. ` +
          `Launching execution pipeline...`
        );

        await processPaper(
          paper.viewNo,
          paper.title,
          b2Session
        );
      } else {
        console.log(
          `⏩ Skipped: Entry timestamp indicates this item ` +
          `belongs to a historic change layer.`
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


// -----------------------------------------------------------------------------
// 8. Execute
// -----------------------------------------------------------------------------

main();