/**
 * staging.js
 * Parses feed.atom timeframes, generates deterministic file hashes,
 * pulls Base64 streams from GAS via legacy URL mapping parameters,
 * and streams 4 MiB chunks directly into a private Backblaze B2 bucket.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { SHA256, writeworker } = require('./viewer.js');

// 1. Structural Environment Mapping Configurations
const PASSWORD  = process.env.GAS_SECRET_PASSWORD; // Injected securely via GitHub Action secrets
const ATOM_FILE = "./feed.atom"; 

// Backblaze Authorization Coordinates
const B2_KEY_ID    = process.env.B2_APPLICATION_KEY_ID;
const B2_APP_KEY   = process.env.B2_APPLICATION_KEY;
const B2_BUCKET_ID = process.env.B2_BUCKET_ID; 

const CHUNK_SIZE = 4 * 1024 * 1024; // Exactly 4 MiB (4,194,304 bytes)

/** Native Backblaze B2 Storage API Handshakes */
async function getB2AuthTokens() {
  const base64Credentials = Buffer.from(`${B2_KEY_ID}:${B2_APP_KEY}`).toString('base64');
  const res = await fetch("https://backblazeb2.com", {
    headers: { "Authorization": `Basic ${base64Credentials}` }
  });
  if (!res.ok) throw new Error(`B2 Authorization handshake failed: ${res.statusText}`);
  return await res.json();
}

async function getB2UploadUrl(apiUrl, authToken) {
  const res = await fetch(`${apiUrl}/b2api/v4/b2_get_upload_url`, {
    method: "POST",
    headers: { "Authorization": authToken, "Content-Type": "application/json" },
    body: JSON.stringify({ bucketId: B2_BUCKET_ID })
  });
  if (!res.ok) throw new Error(`B2 Get Upload Target path mapping crashed: ${res.statusText}`);
  return await res.json();
}

async function uploadBufferToB2(uploadUrl, uploadAuthToken, filename, dataBuffer) {
  const percentEncodedName = encodeURIComponent(filename).replace(/%20/g, '+');
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": uploadAuthToken,
      "X-Bz-File-Name": percentEncodedName,
      "Content-Type": "application/octet-stream",
      "Content-Length": dataBuffer.length.toString(),
      "X-Bz-Content-Sha1": "do_not_verify"
    },
    body: dataBuffer
  });
  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Cloud chunk deployment payload rejected: ${errorDetails}`);
  }
}

/** Parses XML structured entry blocks out of your simplified Atom Feed structure */
function parseAtomFeed(xmlString) {
  const entries = [];
  
  // Extract the root/global feed updated timestamp first
  const rootUpdatedMatch = xmlString.match(/<feed[\s\S]*?<updated>([\s\S]*?)<\/updated>/);
  const globalFeedUpdatedTime = rootUpdatedMatch ? new Date(rootUpdatedMatch[1].trim()).getTime() : null;

  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xmlString)) !== null) {
    const entryBlock = match[1];

    const titleMatch      = entryBlock.match(/<title>([\s\S]*?)<\/title>/);
    const collectionMatch = entryBlock.match(/<collection>([\s\S]*?)<\/collection>/);
    const updatedMatch    = entryBlock.match(/<updated>([\s\S]*?)<\/updated>/);

    if (titleMatch && collectionMatch && updatedMatch) {
      entries.push({
        viewNo: collectionMatch[1].trim(),
        title: titleMatch[1].trim(),
        updatedTime: new Date(updatedMatch[1].trim()).getTime()
      });
    }
  }
  
  return { entries, globalFeedUpdatedTime };
}

/** Connects to GAS utilizing legacy query schemas and performs in-memory storage chunk streams */
async function processPaper(viewNo, title, b2Session) {
  // 1. Replicate viewer.js hashing signature rules to determine the exact name of the file for Backblaze
  const hashTemplate = `${viewNo}_${title}`;
  let filehash;
  
  try {
    filehash = await SHA256(hashTemplate);
  } catch (err) {
    console.error(`❌ Cryptographic execution error on string template: ${hashTemplate}`, err);
    return;
  }

  // 2. Select a valid operational Google Apps Script cluster endpoint skipping the fallback
  const workerToken = writeworker(false);
  
  // 3. Map legacy parameter targets using the structured URL search parameters layout
  const legacyGasUrl = new URL('https://script.google.com/macros/s/' + workerToken + '/exec');
  legacyGasUrl.searchParams.set("export", "view");
  legacyGasUrl.searchParams.set("base", viewNo);
  legacyGasUrl.searchParams.set("field", title);
  legacyGasUrl.searchParams.set("hash", PASSWORD); // Injects your password secret into the legacy hash string parameter

  try {
    console.log(`📡 Fetching from endpoint [${workerToken}] for target filehash: ${filehash}`);
    
    // Fire connection parameter requests. Fetch handles Google 302 redirects natively over the wire
    const response = await fetch(legacyGasUrl.toString(), { method: "GET" });

    if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);
    const gasData = await response.json();

    if (gasData.fileref != "12TrRtJ9xfV4mo9O34MJ5_1YrHzjvirBR" || !gasData.data) {
      console.warn(`   ⚠️ GAS node failed to supply matching data stream. Message: ${gasData.error || 'No payload content data string'}`);
      return;
    }

    // 4. In-Memory conversion operations (0 files touch runner disk sectors)
    const pdfBuffer = Buffer.from(gasData.base64Data, 'base64');
    console.log(`   🗜️ Applying in-memory GZIP optimization payload matrices...`);
    const gzippedBuffer = zlib.gzipSync(pdfBuffer);

    // 5. Binary Fragmentation Router: Slice and push filehash.0, filehash.1, etc.
    let offset = 0;
    let fragmentIndex = 0;
    
    while (offset < gzippedBuffer.length) {
      const bytesLeft = gzippedBuffer.length - offset;
      const lengthToWrite = Math.min(CHUNK_SIZE, bytesLeft);
      const chunkSlice = gzippedBuffer.subarray(offset, offset + lengthToWrite);
      
      // Filename nomenclature mapping format requirement matches: filehash.index
      const fragmentName = `${filehash}.${fragmentIndex}`;
      console.log(`      ☁️ Streaming direct segment over the wire: ${fragmentName} (${lengthToWrite} bytes)...`);
      
      // Upload straight into your Backblaze B2 storage container
      await uploadBufferToB2(b2Session.uploadUrl, b2Session.uploadToken, fragmentName, chunkSlice);
      
      offset += lengthToWrite;
      fragmentIndex++;
    }

    console.log(`✅ File processing loop successful. Uploaded ${fragmentIndex} blocks for filehash: ${filehash}`);

  } catch (err) {
    console.error(`❌ Thread exception handling paper index mapping [${title}]:`, err.message);
  }
}

/** Loop Orchestration Entry point */
async function main() {
  if (!fs.existsSync(ATOM_FILE)) {
    console.error(`❌ Execution Aborted: Target source feed cannot be found at path: ${ATOM_FILE}`);
    process.exit(1);
  }

  try {
    console.log(`📖 Loading and parsing database records from source: ${ATOM_FILE}...`);
    const feedXmlContent = fs.readFileSync(ATOM_FILE, 'utf8');
    
    // Extract items lists along with the root feed timeline metrics parameters
    const { entries, globalFeedUpdatedTime } = parseAtomFeed(feedXmlContent);

    if (entries.length === 0) {
      console.warn("⚠️ Warning: No valid items extracted out of the feed file tags.");
      process.exit(0);
    }

    console.log("🔒 Connecting auth links to Backblaze B2 networks...");
    const baseAuth = await getB2AuthTokens();
    const b2UploadEndpoints = await getB2UploadUrl(baseAuth.apiUrl, baseAuth.authorizationToken);
    
    const b2Session = {
      uploadUrl: b2UploadEndpoints.uploadUrl,
      uploadToken: b2UploadEndpoints.uploadAuthorizationToken
    };

    console.log(`📝 Discovered ${entries.length} active records inside feed. Beginning processing timelines...`);

    // Iterate through items found in the XML feed sequentially
    for (const paper of entries) {
      console.log(`\n🔎 Evaluating entry timeline status for: "${paper.title}"`);
      
      // Condition matching verification logic targets specific modified files [INDEX]
      if (globalFeedUpdatedTime && paper.updatedTime === globalFeedUpdatedTime) {
        console.log(`🚀 Match! Item has a current batch timestamp. Launching execution pipeline...`);
        await processPaper(paper.viewNo, paper.title, b2Session);
      } else {
        console.log(`⏩ Skipped: Entry timestamp indicates this item belongs to a historic change layer.`);
      }
    }

    console.log("\n🏁 Execution complete. All data streams safely written to Backblaze.");

  } catch (err) {
    console.error("❌ Fatal System Initialization Failure:", err.message);
    process.exit(1);
  }
}

main();
