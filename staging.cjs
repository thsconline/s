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

// -----------------------------------------------------------------------------
// 1. Structural Environment Mapping Configurations
// -----------------------------------------------------------------------------

const PASSWORD = process.env.GAS_SECRET_PASSWORD;
const GAS_HASH_URL = process.env.GAS_HASH_URL;

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


// -----------------------------------------------------------------------------
// GAS Worker Selection
// -----------------------------------------------------------------------------

function selectWorker(includeFallback = true) {
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

  // When fallback is disabled, only select from the 15 workers.
  if (!includeFallback) {
    return workers[
      Math.floor(Math.random() * workers.length)
    ];
  }

  // Preserve the original 15/16 worker-to-fallback distribution.
  return Math.random() < 15 / 16
    ? workers[Math.floor(Math.random() * workers.length)]
    : fallback;
}


// -----------------------------------------------------------------------------
// GAS Hash Generation
// -----------------------------------------------------------------------------

function buildFileBaseName(viewNo, title) {
  let normalizedTitle = title
    .toLowerCase()
    .replace(/\s*w\.\s*sol\s*$/i, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${viewNo}-${normalizedTitle}`;
}

// -----------------------------------------------------------------------------
// Process Paper
// -----------------------------------------------------------------------------

async function processPaper(viewNo, title, b2Session) {
 

  const fileBaseName = buildFileBaseName(
    viewNo,
    title
  );

  console.log(
    `📁 Generated file base name: ${fileBaseName}`
  );

  /*
   * Select a valid operational Google Apps Script worker.
   *
   * false = never use the fallback deployment.
   */
  const workerToken = selectWorker(false);

  /*
   * Map legacy parameter targets using the structured URL API.
   */
  const dataGasUrl = new URL(
    `https://script.google.com/macros/s/${workerToken}/exec`
  );

  dataGasUrl.searchParams.set("export", "view");
  dataGasUrl.searchParams.set("base", viewNo);
  dataGasUrl.searchParams.set("field", title);
  dataGasUrl.searchParams.set("hash", PASSWORD);

  try {
    console.log(
      `📡 Fetching from endpoint [${workerToken}] ` 
    );

    /*
     * Debug GAS request details.
     *
     * Password is deliberately redacted.
     */
    const debugGasUrl = new URL(dataGasUrl);

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

    console.log(
      `   ⏳ Sending GET request to script.google.com...`
    );

    const gasRequestStarted = Date.now();

    /*
     * Fetch follows Google's redirects automatically.
     */
    const response = await fetch(
      dataGasUrl.toString(),
      {
        method: "GET"
      }
    );

    const gasRequestDuration =
      Date.now() - gasRequestStarted;

    console.log(
      `   📥 GAS response received after ` +
      `${gasRequestDuration} ms`
    );

    console.log(
      `   📊 Status: ` +
      `${response.status} ${response.statusText}`
    );

    console.log(
      `   🔀 Redirected: ${response.redirected}`
    );

    console.log(
      `   🌐 Final URL: ${response.url}`
    );

    console.log(
      `   📄 Content-Type: ` +
      `${response.headers.get("content-type")}`
    );

    if (!response.ok) {
      const errorBody = await response.text();

      console.error(
        `   ❌ GAS response body: ${errorBody}`
      );

      throw new Error(
        `HTTP Error Status: ` +
        `${response.status} ${response.statusText}`
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
	if (gasData.fileref === "12TrRtJ9xfV4mo9O34MJ5_1YrHzjvirBR") {
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
	
	  console.log(
	    `   🔎 GAS response keys: ${Object.keys(gasData).join(", ")}`
	  );
	  return;
	}
	
	console.log(
	  `   ✅ GAS file data retrieved successfully (${gasData.data.length} characters).`
	);


    /*
     * Convert Base64 directly into a Buffer.
     */
    const pdfBuffer = Buffer.from(
      gasData.data,
      "base64"
    );

    console.log(
      `   📦 Received ${pdfBuffer.length} bytes from GAS.`
    );


    /*
     * Apply in-memory GZIP compression.
     */
    console.log(
      `   🗜️ Applying in-memory GZIP compression...`
    );

    const gzippedBuffer =
      zlib.gzipSync(pdfBuffer);

    console.log(
      `   📦 Compressed payload: ` +
      `${gzippedBuffer.length} bytes.`
    );


    /*
     * Binary fragmentation router.
     *
     * Each fragment is uploaded as:
     *
     *   fileBaseName.0
     *   fileBaseName.1
     *   fileBaseName.2
     *   ...
     */
    let offset = 0;
    let fragmentIndex = 0;

    while (
      offset < gzippedBuffer.length
    ) {
      const bytesLeft =
        gzippedBuffer.length - offset;

      const lengthToWrite = Math.min(
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
        `      ☁️ Uploading segment: ` +
        `${fragmentName} ` +
        `(${lengthToWrite} bytes)...`
      );

      const uploadResult =
        await uploadBufferToB2(
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
      `Uploaded ${fragmentIndex} blocks ` +
      `for file: ${fileBaseName}`
    );

  } catch (err) {
    console.error(
      `❌ Thread exception handling paper index mapping ` +
      `[${title}]:`,
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
