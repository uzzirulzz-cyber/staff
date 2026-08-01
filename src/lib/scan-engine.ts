// FORENSIQ simulated scan engine — advances a scan session through 4 stages
// and generates realistic evidence items on completion.

import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/auth";
import type { EvidenceCategory, RecoveryStatus } from "@/lib/types";

export const SCAN_STAGES = ["analysis", "discovery", "parsing", "carving"] as const;
export const SCAN_STAGE_LABELS: Record<string, string> = {
  analysis: "Analysis",
  discovery: "Discovery",
  parsing: "Parsing",
  carving: "Carving",
};
export const SCAN_STAGE_DESCRIPTIONS: Record<string, string> = {
  analysis: "Reading partition tables, file-system metadata, and journal entries.",
  discovery: "Cataloging existing files and identifying slack space and unallocated regions.",
  parsing: "Decoding SQLite databases, plists, JSON manifests, and application containers.",
  carving: "Recovering deleted fragments via signature-based carving and slack-space analysis.",
};

// Realistic log messages keyed to stage
export const STAGE_LOGS: Record<string, string[]> = {
  analysis: [
    "[ 0.012 ] forensiq-engine: initializing acquisition parser v4.2.1",
    "[ 0.089 ] partition: GPT header found at LBA 1, valid signature",
    "[ 0.142 ] partition: detected 1 EFI system partition (200 MiB)",
    "[ 0.187 ] partition: detected 1 APFS container (243.8 GiB)",
    "[ 0.234 ] apfs: volume 'System' mounted, encryption disabled",
    "[ 0.301 ] apfs: volume 'Data' mounted, encryption disabled",
    "[ 0.388 ] apfs: volume 'Preboot' skipped",
    "[ 0.442 ] apfs: snapshot 'com.apple.os.update-...' found",
    "[ 0.511 ] fs: traversing root inode tree",
    "[ 0.602 ] fs: counting file metadata entries",
    "[ 0.681 ] fs: 187,432 inodes discovered in primary volume",
    "[ 0.802 ] fs: building block-use bitmap",
    "[ 0.911 ] engine: analysis complete — handing off to discovery",
  ],
  discovery: [
    "[ 0.014 ] discovery: scanning for known forensic signatures",
    "[ 0.098 ] discovery: cataloging /private/var/mobile/Media/DCIM/",
    "[ 0.181 ] discovery: 2,847 image files in DCIM",
    "[ 0.243 ] discovery: 184 video files in DCIM",
    "[ 0.301 ] discovery: scanning /var/mobile/Library/SMS/Attachments/",
    "[ 0.388 ] discovery: 12,904 attachment objects found",
    "[ 0.452 ] discovery: scanning application containers",
    "[ 0.521 ] discovery: 327 app bundles identified",
    "[ 0.612 ] discovery: scanning cloud caches (iCloud, Google Drive)",
    "[ 0.688 ] discovery: 9,124 cached cloud objects",
    "[ 0.792 ] discovery: identifying unallocated regions",
    "[ 0.864 ] discovery: 4.2 GiB of unallocated/slack space available",
    "[ 0.952 ] engine: discovery complete — handing off to parsing",
  ],
  parsing: [
    "[ 0.012 ] parser: opening SMS sqlite database (sms.db)",
    "[ 0.092 ] parser: 14,832 messages parsed",
    "[ 0.181 ] parser: opening Contacts sqlite database (AddressBook.sqlitedb)",
    "[ 0.243 ] parser: 487 contacts parsed",
    "[ 0.311 ] parser: opening call_history.db",
    "[ 0.388 ] parser: 1,209 call records parsed",
    "[ 0.452 ] parser: decoding browser history (History.db)",
    "[ 0.521 ] parser: 8,940 URLs parsed",
    "[ 0.612 ] parser: parsing LocationServices cache",
    "[ 0.688 ] parser: 3,401 location points extracted",
    "[ 0.792 ] parser: decoding plist files (491 plists)",
    "[ 0.864 ] parser: parsing application manifests",
    "[ 0.952 ] engine: parsing complete — handing off to carving",
  ],
  carving: [
    "[ 0.018 ] carver: scanning unallocated space for JPEG signatures (FFD8FF)",
    "[ 0.121 ] carver: 421 JPEG fragments recovered",
    "[ 0.214 ] carver: scanning for PNG signatures (89504E47)",
    "[ 0.298 ] carver: 187 PNG fragments recovered",
    "[ 0.381 ] carver: scanning for MP4/MOV video signatures",
    "[ 0.452 ] carver: 34 video fragments recovered",
    "[ 0.531 ] carver: scanning for SMS body patterns in slack space",
    "[ 0.612 ] carver: 89 deleted SMS bodies recovered",
    "[ 0.698 ] carver: scanning for SQLite WAL journal remnants",
    "[ 0.781 ] carver: 12 orphaned database pages recovered",
    "[ 0.864 ] carver: scanning for application keychain remnants",
    "[ 0.952 ] engine: carving complete — finalizing evidence inventory",
  ],
};

interface EvidenceTemplate {
  category: EvidenceCategory;
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  recoveryStatus: RecoveryStatus;
  confidence: number;
  preview?: string;
  decodedContent?: Record<string, unknown>;
  createdAtDevice?: Date;
  modifiedAtDevice?: Date;
}

// Realistic evidence templates — generated for each completed scan
export function generateEvidenceTemplates(deviceId?: string): EvidenceTemplate[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  const devicePrefix = deviceId ? `device/${deviceId.slice(-4)}/` : "device/unknown/";

  const templates: EvidenceTemplate[] = [];

  // Photos — real viewable images generated as SVG data URLs with actual visual content
  const photoScenes = [
    { bg1: "#1a2a3a", bg2: "#0d1a2a", scene: "cityscape", shapes: "buildings" },
    { bg1: "#2d1a0d", bg2: "#1a0d05", scene: "sunset", shapes: "sun" },
    { bg1: "#0d2a1a", bg2: "#051a0d", scene: "landscape", shapes: "mountains" },
    { bg1: "#2a0d1a", bg2: "#1a0510", scene: "indoor", shapes: "room" },
    { bg1: "#0d1a2a", bg2: "#050d1a", scene: "night", shapes: "stars" },
    { bg1: "#1a2a0d", bg2: "#0d1a05", scene: "nature", shapes: "trees" },
  ];
  for (let i = 0; i < 24; i++) {
    const lat = pick([37.7749, 40.7128, 34.0522, 41.8781]);
    const lon = pick([-122.4194, -74.0060, -118.2437, -87.6298]);
    const scene = pick(photoScenes);
    // Generate a real viewable SVG image with gradient + shapes
    const svgImage = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>
      <defs><linearGradient id='g${i}' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='${scene.bg1}'/><stop offset='100%' stop-color='${scene.bg2}'/>
      </linearGradient></defs>
      <rect width='400' height='300' fill='url(#g${i})'/>
      ${scene.shapes === "buildings" ? `<rect x='20' y='150' width='60' height='150' fill='#000' opacity='0.6'/><rect x='90' y='100' width='70' height='200' fill='#000' opacity='0.5'/><rect x='170' y='130' width='50' height='170' fill='#000' opacity='0.7'/><rect x='230' y='80' width='80' height='220' fill='#000' opacity='0.5'/><rect x='320' y='120' width='60' height='180' fill='#000' opacity='0.6'/>` : ""}
      ${scene.shapes === "sun" ? `<circle cx='200' cy='150' r='60' fill='#ffaa00' opacity='0.8'/><circle cx='200' cy='150' r='80' fill='#ff8800' opacity='0.3'/>` : ""}
      ${scene.shapes === "mountains" ? `<polygon points='0,300 100,120 200,200 300,80 400,300' fill='#000' opacity='0.5'/>` : ""}
      ${scene.shapes === "stars" ? Array.from({length: 20}, () => `<circle cx='${rand(0,400)}' cy='${rand(0,200)}' r='${rand(1,3)}' fill='white' opacity='${Math.random()}'/>`).join("") : ""}
      ${scene.shapes === "trees" ? `<polygon points='50,300 80,150 110,300' fill='#0d2a0d'/><polygon points='150,300 180,100 210,300' fill='#0d2a0d'/><polygon points='280,300 310,180 340,300' fill='#0d2a0d'/>` : ""}
      ${scene.shapes === "room" ? `<rect x='50' y='80' width='300' height='180' fill='none' stroke='#444' stroke-width='3'/><rect x='120' y='120' width='60' height='80' fill='#222'/><rect x='220' y='120' width='60' height='80' fill='#222'/>` : ""}
      <text x='200' y='285' font-size='10' fill='white' opacity='0.5' text-anchor='middle' font-family='monospace'>${scene.scene} · ${rand(1,90)}d ago</text>
    </svg>`;
    const fullImage = `data:image/svg+xml;base64,${Buffer.from(svgImage).toString("base64")}`;
    templates.push({
      category: "photos",
      fileName: `IMG_${rand(1000, 9999)}.JPG`,
      filePath: `${devicePrefix}Media/DCIM/100APPLE/IMG_${rand(1000, 9999)}.JPG`,
      mimeType: "image/jpeg",
      sizeBytes: rand(800_000, 4_500_000),
      recoveryStatus: pick<EvidenceTemplate["recoveryStatus"]>(["existing", "existing", "existing", "deleted", "carved"]),
      confidence: pick([85, 92, 78, 67, 95, 88]),
      createdAtDevice: new Date(now - rand(1, 90) * day),
      modifiedAtDevice: new Date(now - rand(0, 30) * day),
      decodedContent: {
        dimensions: pick(["4032×3024", "3024×4032", "4032×3024"]),
        cameraMake: "Apple",
        cameraModel: pick(["iPhone 15 Pro", "iPhone 14", "iPhone 13 Pro"]),
        focalLength: pick(["5.7mm", "6.8mm", "7.5mm"]),
        aperture: pick(["f/1.8", "f/2.2", "f/2.8"]),
        iso: rand(32, 800),
        exposureTime: pick(["1/120", "1/250", "1/60", "1/500"]),
        gps: { lat, lon, altitude: rand(0, 200) },
        locationName: pick(["San Francisco, CA", "New York, NY", "Los Angeles, CA", "Chicago, IL"]),
        sceneType: scene.scene,
        thumbnail: fullImage,
        fullImage: fullImage,
        encrypted: true,
        encryptionBot: "FORENSIQ-SecureBot-v2",
      },
    });
  }

  // Videos — with poster image, streaming URL, and decoded metadata
  const videoScenes = [
    { title: "Street footage", bg: "#1a1a2e" },
    { title: "Office recording", bg: "#0d1a2a" },
    { title: "Meeting capture", bg: "#1a0d2a" },
    { title: "Outdoor scene", bg: "#0d2a1a" },
    { title: "Vehicle dashcam", bg: "#2a1a0d" },
    { title: "Surveillance feed", bg: "#0a0a0a" },
  ];
  for (let i = 0; i < 6; i++) {
    const scene = pick(videoScenes);
    const durationSec = rand(15, 300);
    const posterSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='225'>
      <rect width='400' height='225' fill='${scene.bg}'/>
      <polygon points='170,90 170,135 215,112' fill='white' opacity='0.9'/>
      <text x='200' y='170' font-size='12' fill='white' opacity='0.6' text-anchor='middle' font-family='monospace'>${scene.title} · ${Math.floor(durationSec/60)}:${String(durationSec%60).padStart(2,'0')}</text>
    </svg>`;
    templates.push({
      category: "videos",
      fileName: `VID_${rand(1000, 9999)}.MOV`,
      filePath: `${devicePrefix}Media/DCIM/100APPLE/VID_${rand(1000, 9999)}.MOV`,
      mimeType: "video/quicktime",
      sizeBytes: rand(15_000_000, 320_000_000),
      recoveryStatus: pick<EvidenceTemplate["recoveryStatus"]>(["existing", "deleted", "carved"]),
      confidence: pick([88, 74, 91, 82]),
      preview: `${scene.title} · ${Math.floor(durationSec/60)}:${String(durationSec%60).padStart(2,'0')}`,
      createdAtDevice: new Date(now - rand(1, 60) * day),
      decodedContent: {
        title: scene.title,
        durationSec: durationSec,
        durationLabel: `${Math.floor(durationSec/60)}:${String(durationSec%60).padStart(2,'0')}`,
        resolution: pick(["1920×1080", "3840×2160", "1280×720"]),
        fps: pick([30, 60, 24]),
        codec: pick(["H.264", "H.265/HEVC", "ProRes"]),
        bitrate: pick(["8 Mbps", "12 Mbps", "45 Mbps"]),
        posterImage: `data:image/svg+xml;base64,${Buffer.from(posterSvg).toString("base64")}`,
        streamUrl: null, // No real stream — poster is shown with play overlay
        hasAudio: true,
        location: pick(["San Francisco, CA", "New York, NY", "Los Angeles, CA"]),
        encrypted: true,
        encryptionBot: "FORENSIQ-SecureBot-v2",
      },
    });
  }

  // Audio — decoded with waveform + speech-to-text transcription
  for (let i = 0; i < 4; i++) {
    const durationSec = rand(15, 600);
    templates.push({
      category: "audio",
      fileName: `voice_memo_${rand(1, 99)}.m4a`,
      filePath: `${devicePrefix}Media/Voice Memos/voice_memo_${rand(1, 99)}.m4a`,
      mimeType: "audio/mp4",
      sizeBytes: rand(200_000, 8_000_000),
      recoveryStatus: pick<EvidenceTemplate["recoveryStatus"]>(["existing", "deleted"]),
      confidence: pick([90, 85]),
      createdAtDevice: new Date(now - rand(1, 45) * day),
      decodedContent: {
        durationSec,
        durationLabel: `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`,
        sampleRate: 44100,
        channels: 1,
        codec: "AAC",
        bitrate: pick(["64kbps", "128kbps"]),
        transcription: pick([
          "Hey, it's me. Just calling to confirm the meeting tomorrow at 9 AM. Bring the documents we discussed. Talk soon.",
          "I need you to delete those files from the server before anyone finds out. Do it tonight. Don't call me back on this number.",
          "This is a recording of the conversation that took place on July 15th. The subject admitted to accessing the accounts without authorization.",
          "Wire transfer confirmation number 8829-A. The funds have been moved to the offshore account as discussed. Keep this confidential.",
          "Meet me at the usual spot at 9 PM sharp. Don't be late this time. And for god's sake, don't tell anyone about this.",
        ]),
        waveform: Array.from({ length: 40 }, () => rand(10, 100)),
        language: "en-US",
        transcriptionConfidence: rand(82, 99),
        decoded: true,
        encrypted: true,
        encryptionBot: "FORENSIQ-SecureBot-v2",
      },
    });
  }

  // SMS — decoded as conversation thread with sender, timestamp, readable text
  const smsBodies = [
    "Hey, are we still on for tonight? I was thinking we could grab dinner at that new place on 5th Street around 8pm. Let me know if that works for you! 🍕",
    "I'll be there in 15 mins, traffic is awful on the 101. There was an accident near the Bay Bridge exit. Should I pick anything up on the way?",
    "Did you see the news about the merger? The board approved it this morning. Stock is up 12% already. This is huge for our portfolio. Call me when you can.",
    "Please don't tell anyone about this. It's confidential. If this gets out before the announcement, we could face SEC investigation. Delete this message after reading.",
    "Wire transfer completed. Confirmation #8829-A. Amount: $48,500. Recipient: Offshore Holdings LLC. Account ending 4421. Posted at 2:34 PM EST.",
    "Meet me at the usual spot, 9pm sharp. Come alone. Don't park in the front — use the side entrance off Maple Street. Bring the documents we discussed.",
    "I deleted those files like you asked. The server logs show clean. But I'm worried about the backup tapes — they might have a copy from Tuesday. What should I do?",
    "Don't reply to this number. This is a burner phone. If you need to reach me, use Signal with the code we set up. The new number will be active after 6pm.",
    "The package is ready for pickup. Storage unit #147, code is 8829. Ask for Mark — he knows what it is. Bring cash, $5K as discussed. Available after 3pm tomorrow.",
    "Made reservations at the place you like. Friday 7:30pm, party of 4. They have the private room in the back. I already gave them the credit card on file. Can't wait! 🍷",
    "Just landed at JFK. Flight was delayed 2 hours — weather. Taking a cab to the hotel now. Meeting still on for 10am tomorrow? Text me the conference room number.",
    "The lawyer called. They want to settle out of court. $250K, non-disclosure agreement, no admission of guilt. We have 48 hours to respond. What do you think?",
    "I found the flash drive. It was in the desk drawer all along. There are about 340 files on it — spreadsheets, emails, some photos. I'll bring it to the office tomorrow.",
    "Crypto wallet updated. Moved 2.5 BTC to cold storage as discussed. New address: bc1qxy...3k9m. Keep this private. The remaining 1.2 BTC stays on the exchange for liquidity.",
    "My phone is acting weird. Battery draining fast, getting hot. I think someone installed something on it. Can you check it tomorrow? I'm worried about the messages.",
  ];
  const smsContactNames = ["Alex Morgan", "Jamie Rivera", "Sam Chen", "Unknown +1 555-0142", "Taylor Brooks"];
  for (let i = 0; i < 30; i++) {
    const body = pick(smsBodies);
    const sender = pick(smsContactNames);
    const isOutgoing = Math.random() > 0.5;
    templates.push({
      category: "sms",
      fileName: `message_${rand(1000, 9999)}.json`,
      filePath: `${devicePrefix}Library/SMS/sms.db:row:${rand(1, 99999)}`,
      mimeType: "application/x-sms-record",
      sizeBytes: rand(180, 2200),
      recoveryStatus: pick<EvidenceTemplate["recoveryStatus"]>(["existing", "existing", "deleted", "carved"]),
      confidence: pick([95, 88, 72, 65]),
      preview: body,
      createdAtDevice: new Date(now - rand(1, 120) * day),
      modifiedAtDevice: new Date(now - rand(0, 60) * day),
      decodedContent: {
        direction: isOutgoing ? "outgoing" : "incoming",
        sender: isOutgoing ? "Device Owner" : sender,
        recipient: isOutgoing ? sender : "Device Owner",
        phoneNumber: `+1 ${rand(200, 999)}-${rand(200, 999)}-${rand(1000, 9999)}`,
        body,
        readStatus: pick(["read", "unread", "delivered"]),
        messageType: "SMS",
        decoded: true,
        encrypted: true,
        encryptionBot: "FORENSIQ-SecureBot-v2",
        language: "en",
      },
    });
  }

  // Contacts — decoded with full name, phone, email, company, address
  const contactNames = [
    "Alex Morgan", "Jamie Rivera", "Sam Chen", "Taylor Brooks", "Jordan Lee",
    "Casey Park", "Morgan Davis", "Riley Foster", "Drew Kennedy", "Quinn Adler",
    "Avery Stone", "Reese Walker",
  ];
  const companies = ["Acme Corp", "TechStart Inc", "Global Holdings LLC", "Summit Partners", "Pinnacle Group", "Vertex Solutions", "Nexus Dynamics", "Apex Industries"];
  for (let i = 0; i < 12; i++) {
    const name = pick(contactNames);
    const phone = `+1 ${rand(200, 999)}-${rand(200, 999)}-${rand(1000, 9999)}`;
    const email = name.toLowerCase().replace(/\s+/g, ".") + "@" + pick(["gmail.com", "outlook.com", "protonmail.com", "yahoo.com", "icloud.com"]);
    templates.push({
      category: "contacts",
      fileName: `contact_${rand(1, 999)}.vcf`,
      filePath: `${devicePrefix}Library/AddressBook/AddressBook.sqlitedb:row:${rand(1, 9999)}`,
      mimeType: "text/vcard",
      sizeBytes: rand(220, 900),
      recoveryStatus: "existing",
      confidence: 99,
      preview: name,
      createdAtDevice: new Date(now - rand(30, 365) * day),
      decodedContent: {
        fullName: name,
        firstName: name.split(" ")[0],
        lastName: name.split(" ").slice(1).join(" "),
        phoneNumber: phone,
        email: email,
        company: pick(companies),
        jobTitle: pick(["Software Engineer", "Product Manager", "Analyst", "Director", "Consultant", "Associate", "VP of Operations", "CFO"]),
        address: `${rand(100, 9999)} ${pick(["Main St", "Oak Ave", "Pine Dr", "Elm St", "Cedar Ln", "Park Blvd"])} ${pick(["San Francisco, CA 94102", "New York, NY 10001", "Los Angeles, CA 90001", "Chicago, IL 60601"])}`,
        birthday: `${rand(1, 12)}/${rand(1, 28)}/${rand(1970, 2000)}`,
        notes: pick(["Met at conference 2024", "Business contact", "Reference check", "Legal counsel", "Financial advisor", ""]),
        decoded: true,
        encrypted: true,
        encryptionBot: "FORENSIQ-SecureBot-v2",
      },
    });
  }

  // Browser History — decoded with full URL, title, visit count, timestamp
  const urls = [
    { url: "https://www.google.com/search?q=how+to+delete+browsing+history", title: "how to delete browsing history - Google Search" },
    { url: "https://mail.protonmail.com/", title: "ProtonMail - Secure Email" },
    { url: "https://www.torproject.org/", title: "Tor Project | Privacy Online" },
    { url: "https://telegram.org/", title: "Telegram Messenger" },
    { url: "https://signal.org/", title: "Signal — Say hello to privacy" },
    { url: "https://www.reddit.com/r/privacy/", title: "r/privacy - Reddit" },
    { url: "https://wiki.onion-router.net/", title: "Tor Wiki - Onion Routing" },
    { url: "https://www.wired.com/story/encryption-backdoors/", title: "Encryption Backdoors Are a Bad Idea | WIRED" },
    { url: "https://github.com/", title: "GitHub: Let's build from here" },
    { url: "https://stackoverflow.com/questions/tagged/forensics", title: "Newest 'forensics' Questions - Stack Overflow" },
    { url: "https://www.binance.com/", title: "Binance — Buy/Sell Bitcoin, Ether and Altcoins" },
    { url: "https://coinbase.com/", title: "Coinbase — Buy & Sell Bitcoin, Ethereum, and more" },
    { url: "https://www.cointracker.io/", title: "CoinTracker — Crypto Portfolio & Tax Calculator" },
    { url: "https://aws.amazon.com/s3/", title: "Amazon S3 — Cloud Storage" },
    { url: "https://www.icloud.com/", title: "iCloud — Apple" },
  ];
  for (let i = 0; i < 18; i++) {
    const u = pick(urls);
    templates.push({
      category: "browser_history",
      fileName: `history_${rand(1, 9999)}.json`,
      filePath: `${devicePrefix}Library/Safari/History.db:row:${rand(1, 99999)}`,
      mimeType: "application/x-history-record",
      sizeBytes: rand(120, 600),
      recoveryStatus: pick<EvidenceTemplate["recoveryStatus"]>(["existing", "existing", "deleted", "cached"]),
      confidence: pick([97, 88, 76, 84]),
      preview: u.url,
      createdAtDevice: new Date(now - rand(0, 60) * day),
      decodedContent: {
        url: u.url,
        title: u.title,
        visitCount: rand(1, 48),
        lastVisit: new Date(now - rand(0, 60) * day).toISOString(),
        browser: pick(["Safari", "Chrome", "Firefox"]),
        deviceType: "Mobile",
        decoded: true,
        encrypted: true,
        encryptionBot: "FORENSIQ-SecureBot-v2",
      },
    });
  }

  // Call Logs — decoded with full phone number, contact name, duration, type
  for (let i = 0; i < 14; i++) {
    const callType = pick(["incoming", "outgoing", "missed"]);
    const duration = rand(3, 1800);
    const contactName = pick(contactNames);
    const phoneNumber = `+1 ${rand(200, 999)}-${rand(200, 999)}-${rand(1000, 9999)}`;
    templates.push({
      category: "call_logs",
      fileName: `call_${rand(1, 9999)}.json`,
      filePath: `${devicePrefix}Library/CallHistoryDB/call_history.db:row:${rand(1, 9999)}`,
      mimeType: "application/x-call-record",
      sizeBytes: rand(80, 200),
      recoveryStatus: pick<EvidenceTemplate["recoveryStatus"]>(["existing", "existing", "deleted"]),
      confidence: pick([97, 86]),
      preview: `${callType} call • duration ${duration}s`,
      createdAtDevice: new Date(now - rand(0, 90) * day),
      decodedContent: {
        callType: callType,
        direction: callType,
        phoneNumber: phoneNumber,
        contactName: contactName,
        durationSec: duration,
        durationLabel: `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`,
        startTime: new Date(now - rand(0, 90) * day).toISOString(),
        endTime: new Date(now - rand(0, 90) * day + duration * 1000).toISOString(),
        decoded: true,
        encrypted: true,
        encryptionBot: "FORENSIQ-SecureBot-v2",
      },
    });
  }

  // App Data
  const appNames = ["WhatsApp", "Telegram", "Signal", "Instagram", "TikTok", "Snapchat", "Discord", "Slack", "Cash App", "Venmo"];
  for (let i = 0; i < 12; i++) {
    templates.push({
      category: "app_data",
      fileName: `${pick(appNames)}_db_${rand(1, 999)}.sqlite`,
      filePath: `${devicePrefix}Containers/Data/Application/${rand(1000, 9999)}/Documents/${pick(appNames)}.sqlite`,
      mimeType: "application/x-sqlite3",
      sizeBytes: rand(50_000, 8_000_000),
      recoveryStatus: pick<EvidenceTemplate["recoveryStatus"]>(["existing", "existing", "orphaned", "cached"]),
      confidence: pick([92, 88, 74, 81]),
      createdAtDevice: new Date(now - rand(1, 120) * day),
    });
  }

  // Location Data — decoded with full coordinates, address, altitude, speed
  const locations = [
    { lat: 37.7749, lon: -122.4194, name: "San Francisco, CA", area: "Union Square" },
    { lat: 40.7128, lon: -74.0060, name: "New York, NY", area: "Times Square" },
    { lat: 34.0522, lon: -118.2437, name: "Los Angeles, CA", area: "Hollywood Blvd" },
    { lat: 41.8781, lon: -87.6298, name: "Chicago, IL", area: "Magnificent Mile" },
    { lat: 47.6062, lon: -122.3321, name: "Seattle, WA", area: "Pike Place" },
    { lat: 25.7617, lon: -80.1918, name: "Miami, FL", area: "South Beach" },
  ];
  for (let i = 0; i < 15; i++) {
    const loc = pick(locations);
    templates.push({
      category: "location_data",
      fileName: `location_${rand(1, 9999)}.json`,
      filePath: `${devicePrefix}Library/Caches/locationd/Cache.plist:row:${rand(1, 99999)}`,
      mimeType: "application/x-location-record",
      sizeBytes: rand(160, 400),
      recoveryStatus: pick<EvidenceTemplate["recoveryStatus"]>(["existing", "cached", "deleted"]),
      confidence: pick([94, 88, 71]),
      preview: `lat ${loc.lat}°, lon ${loc.lon}°`,
      createdAtDevice: new Date(now - rand(0, 30) * day),
      decodedContent: {
        latitude: loc.lat,
        longitude: loc.lon,
        altitude: rand(0, 200),
        accuracy: rand(5, 50),
        speed: rand(0, 65),
        heading: rand(0, 359),
        timestamp: new Date(now - rand(0, 30) * day).toISOString(),
        locationName: loc.name,
        areaName: loc.area,
        decoded: true,
        encrypted: true,
        encryptionBot: "FORENSIQ-SecureBot-v2",
      },
    });
  }

  // Emails — decoded with full subject, sender, recipient, body, date
  const emailSubjects = [
    "RE: Q3 Financial Report — Action Required",
    "Meeting Agenda: Strategic Planning Session — July 25",
    "Wire Transfer Confirmation #8829-A — Completed",
    "CONFIDENTIAL: Legal Update Regarding Case #2026-0142",
    "Your Order Has Shipped — Tracking Available",
    "Security Alert: New Login from Unknown Device",
    "Board Meeting Minutes — Confidential",
    "RE: Contract Review — Please Review by Friday",
  ];
  const emailBodies = [
    "Hi, Please find attached the Q3 financial report. We need your sign-off by end of week. The numbers look strong — revenue is up 23% YoY. Let me know if you have any questions. Best, Sarah",
    "Team, Please review the attached agenda for our strategic planning session on July 25th. We'll be covering market expansion, product roadmap, and budget allocation for Q4. Come prepared with your team's priorities. Thanks, Michael",
    "This is to confirm that your wire transfer of $48,500.00 has been completed successfully. Confirmation number: 8829-A. Recipient: Offshore Holdings LLC. Account ending in 4421. Please keep this for your records.",
    "Per our discussion, I've reviewed the case file. The evidence is sufficient to proceed. I recommend we file the motion by end of week. The opposing counsel has not responded to our discovery requests. Regards, Legal Team",
    "Your order #ORDER-2026-3471 has shipped via FedEx. Tracking number: 771234567890. Expected delivery: 3-5 business days. Items: 2x Forensic Toolkit Pro, 1x Write-Blocker. Thank you for your business.",
    "We detected a new login to your account from an unknown device. Location: San Francisco, CA. Device: iPhone 15 Pro. Time: July 28, 2026 at 2:34 AM. If this was you, no action is needed. If not, please secure your account immediately.",
    "Attached are the minutes from the July board meeting. Key decisions: 1) Approved acquisition of Target Corp, 2) Q4 dividend increased to $0.52/share, 3) New board member elected. Please keep confidential until public announcement.",
    "Please review the attached contract by Friday. Key terms: 2-year engagement, $480K retainer, quarterly deliverables. The indemnification clause has been updated per your request. Let's discuss on Monday. Best, Jennifer",
  ];
  for (let i = 0; i < 8; i++) {
    const subject = emailSubjects[i % emailSubjects.length];
    const body = emailBodies[i % emailBodies.length];
    const sender = pick(contactNames);
    const senderEmail = sender.toLowerCase().replace(/\s+/g, ".") + "@" + pick(["gmail.com", "outlook.com", "protonmail.com", "company.com"]);
    templates.push({
      category: "emails",
      fileName: `email_${rand(1, 9999)}.eml`,
      filePath: `${devicePrefix}Library/Mail/MailData/Envelope\ Index:row:${rand(1, 9999)}`,
      mimeType: "message/rfc822",
      sizeBytes: rand(2000, 28000),
      recoveryStatus: pick<EvidenceTemplate["recoveryStatus"]>(["existing", "deleted"]),
      confidence: pick([93, 78]),
      preview: subject,
      createdAtDevice: new Date(now - rand(1, 200) * day),
      decodedContent: {
        subject: subject,
        from: { name: sender, email: senderEmail },
        to: "crdbix@gmail.com",
        date: new Date(now - rand(1, 200) * day).toISOString(),
        body: body,
        hasAttachments: pick([true, false]),
        priority: pick(["normal", "high"]),
        read: pick([true, false]),
        decoded: true,
        encrypted: true,
        encryptionBot: "FORENSIQ-SecureBot-v2",
      },
    });
  }

  // Documents
  const docTypes = ["pdf", "docx", "xlsx", "pptx", "txt"];
  for (let i = 0; i < 8; i++) {
    templates.push({
      category: "documents",
      fileName: `document_${rand(1, 999)}.${pick(docTypes)}`,
      filePath: `${devicePrefix}Documents/document_${rand(1, 999)}.${pick(docTypes)}`,
      mimeType: `application/${pick(["pdf", "msword", "vnd.ms-excel", "vnd.ms-powerpoint", "text"])}`,
      sizeBytes: rand(40_000, 5_000_000),
      recoveryStatus: pick<EvidenceTemplate["recoveryStatus"]>(["existing", "deleted", "carved"]),
      confidence: pick([96, 84, 71]),
      createdAtDevice: new Date(now - rand(1, 180) * day),
    });
  }

  // Social Media
  for (let i = 0; i < 6; i++) {
    templates.push({
      category: "social_media",
      fileName: `social_post_${rand(1, 9999)}.json`,
      filePath: `${devicePrefix}Containers/Data/Application/${rand(1000, 9999)}/Documents/social_${rand(1, 9999)}.json`,
      mimeType: "application/json",
      sizeBytes: rand(500, 4500),
      recoveryStatus: pick<EvidenceTemplate["recoveryStatus"]>(["existing", "cached", "deleted"]),
      confidence: pick([89, 76, 82]),
      createdAtDevice: new Date(now - rand(0, 60) * day),
    });
  }

  // Financial — decoded with full transaction details
  for (let i = 0; i < 5; i++) {
    const amount = rand(5, 2500) + rand(10, 99) / 100;
    const type = pick(["transfer", "purchase", "deposit", "withdrawal"]);
    templates.push({
      category: "financial",
      fileName: `transaction_${rand(10000, 99999)}.json`,
      filePath: `${devicePrefix}Library/Finances/transactions_${rand(1, 99)}.db:row:${rand(1, 9999)}`,
      mimeType: "application/x-financial-record",
      sizeBytes: rand(150, 900),
      recoveryStatus: pick<EvidenceTemplate["recoveryStatus"]>(["existing", "cached"]),
      confidence: pick([98, 90]),
      preview: `$${amount.toFixed(2)} • ${type}`,
      createdAtDevice: new Date(now - rand(0, 90) * day),
      decodedContent: {
        amount: amount,
        currency: "USD",
        transactionType: type,
        merchant: pick(["Amazon", "Apple Store", "Tesla Supercharger", "Whole Foods", "Starbucks", "Shell Gas", "Airbnb", "Uber", "Netflix", "Costco"]),
        category: pick(["shopping", "food", "transport", "entertainment", "utilities", "transfer"]),
        accountNumber: `****${rand(1000, 9999)}`,
        routingNumber: `0210000${rand(100, 999)}`,
        timestamp: new Date(now - rand(0, 90) * day).toISOString(),
        status: pick(["completed", "pending", "completed", "completed"]),
        location: pick(["San Francisco, CA", "New York, NY", "Online", "Los Angeles, CA"]),
        decoded: true,
        encrypted: true,
        encryptionBot: "FORENSIQ-SecureBot-v2",
      },
    });
  }

  // Calendar
  for (let i = 0; i < 8; i++) {
    templates.push({
      category: "calendar",
      fileName: `event_${rand(1, 999)}.ics`,
      filePath: `${devicePrefix}Library/Calendar/Calendar.sqlitedb:row:${rand(1, 9999)}`,
      mimeType: "text/calendar",
      sizeBytes: rand(200, 800),
      recoveryStatus: "existing",
      confidence: 99,
      preview: pick(["Meeting", "Travel", "Appointment", "Conference call", "Deadline", "Lunch", "Workout"]),
      createdAtDevice: new Date(now - rand(0, 60) * day),
    });
  }

  // Notes — decoded with full title, body, creation/modification dates
  const noteBodies = [
    { title: "Project Outline Q3", body: "Project outline Q3 — confidential\n\nKey objectives:\n1. Launch new product line by Sept 15\n2. Hire 3 new engineers\n3. Secure $2M Series A funding\n4. File patents for core technology\n5. Expand to European markets\n\nBudget: $1.2M allocated\nTeam: 12 people\nDeadline: September 30, 2026" },
    { title: "Passwords", body: "Passwords (do NOT share): see keychain\n\nImportant: All passwords are stored in the iOS Keychain. Do NOT write them down here.\n\nIf you need access, use the Touch ID or Face ID.\n\nFor emergency access, contact: security@company.com\n\nLast changed: July 15, 2026" },
    { title: "Meeting Notes — Strategic Planning", body: "Meeting notes — strategic planning session\n\nAttendees: CEO, CFO, CTO, Board Members\nDate: July 20, 2026\n\nKey decisions:\n1. Approve acquisition of Target Corp for $48M\n2. Q4 budget increased by 15%\n3. New product launch pushed to Q1 2027\n4. Hire VP of Engineering by August\n5. Board meeting scheduled for Sept 5\n\nAction items:\n- CFO to prepare acquisition paperwork\n- CTO to finalize tech roadmap\n- HR to start VP search" },
    { title: "To-Do List", body: "Things to do: confirm wire transfer, update crypto wallet\n\n1. Call bank about wire transfer #8829-A ($48,500)\n2. Update Bitcoin wallet — move 2.5 BTC to cold storage\n3. Renew domain names (3 expiring Aug 15)\n4. Schedule dentist appointment\n5. Pay quarterly taxes\n6. Review contract from Jennifer\n7. Book flight to NYC for Aug 12\n8. Cancel Netflix subscription" },
    { title: "Travel Itinerary", body: "Travel itinerary, departure Tuesday 6am\n\nFlight: UA 287 — SFO → JFK\nDeparture: Tue Aug 12, 6:00 AM\nArrival: Tue Aug 12, 2:30 PM EST\nGate: B12, Terminal 2\n\nHotel: Marriott Marquis Times Square\nCheck-in: Aug 12, 4:00 PM\nCheck-out: Aug 15, 11:00 AM\nConfirmation: MM-887423\n\nMeetings:\n- Wed 10am: Board presentation\n- Wed 2pm: Investor lunch\n- Thu 9am: Legal team review" },
    { title: "Offshore Account Restructuring", body: "Idea: restructure the offshore accounts\n\nCurrent structure:\n- Cayman Islands: $2.4M (account ending 4421)\n- Switzerland: $1.8M (account ending 8893)\n- Singapore: $900K (account ending 2275)\n\nProposed changes:\n1. Move $1M from Cayman to Singapore (tax efficiency)\n2. Close Swiss account by Q4 (regulatory concerns)\n3. Open new account in Dubai (0% tax jurisdiction)\n4. Set up trust structure for asset protection\n\nContact: offshore@holdings-llc.com\nLast updated: July 18, 2026" },
  ];
  for (let i = 0; i < 6; i++) {
    const note = pick(noteBodies);
    templates.push({
      category: "notes",
      fileName: `note_${rand(1, 999)}.html`,
      filePath: `${devicePrefix}Library/Notes/Notes.sqlite:row:${rand(1, 9999)}`,
      mimeType: "text/html",
      sizeBytes: rand(400, 4500),
      recoveryStatus: pick<EvidenceTemplate["recoveryStatus"]>(["existing", "deleted", "carved"]),
      confidence: pick([95, 79, 68]),
      preview: note.title,
      createdAtDevice: new Date(now - rand(1, 100) * day),
      decodedContent: {
        title: note.title,
        body: note.body,
        folder: pick(["All iCloud", "Work", "Personal", "Confidential"]),
        createdAt: new Date(now - rand(1, 100) * day).toISOString(),
        modifiedAt: new Date(now - rand(0, 30) * day).toISOString(),
        decoded: true,
        encrypted: true,
        encryptionBot: "FORENSIQ-SecureBot-v2",
      },
    });
  }

  // System Logs
  for (let i = 0; i < 10; i++) {
    templates.push({
      category: "system_logs",
      fileName: `system_log_${rand(1, 99)}.log`,
      filePath: `${devicePrefix}var/log/system.log:${rand(1, 99999)}`,
      mimeType: "text/plain",
      sizeBytes: rand(800, 25000),
      recoveryStatus: "existing",
      confidence: 100,
      preview: pick([
        "kernel: APFS transition complete",
        "locationd: location services enabled",
        "bluetoothd: device connected",
        "kernel: USB device enumerated",
        "networkd: Wi-Fi associated",
      ]),
      createdAtDevice: new Date(now - rand(0, 14) * day),
    });
  }

  // Network Data
  for (let i = 0; i < 7; i++) {
    templates.push({
      category: "network_data",
      fileName: `network_${rand(1, 9999)}.pcap`,
      filePath: `${devicePrefix}Library/Caches/networkd/NetworkInterfaces.plist:row:${rand(1, 9999)}`,
      mimeType: "application/vnd.tcpdump.pcap",
      sizeBytes: rand(1000, 90000),
      recoveryStatus: pick<EvidenceTemplate["recoveryStatus"]>(["existing", "cached", "deleted"]),
      confidence: pick([94, 85, 71]),
      preview: `${rand(10, 250)}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)} → ${rand(10, 250)}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`,
      createdAtDevice: new Date(now - rand(0, 30) * day),
    });
  }

  // Credentials — extracted keychain entries with decoded passwords
  const credServices = [
    "com.apple.accounts", "com.apple.iCloud", "WhatsApp", "Telegram",
    "Instagram", "Facebook", "Twitter/X", "Gmail", "Outlook", "ProtonMail",
    "Cash App", "Venmo", "PayPal", "Coinbase", "Binance", "Discord",
    "Slack", "Netflix", "Spotify", "Amazon", "AppleID",
  ];
  for (let i = 0; i < 18; i++) {
    const service = pick(credServices);
    templates.push({
      category: "credentials",
      fileName: `keychain_${service.toLowerCase().replace(/[^a-z]/g, "_")}_${rand(1, 999)}.json`,
      filePath: `${devicePrefix}Library/Keychains/keychain.db:entry:${rand(1, 9999)}`,
      mimeType: "application/x-keychain-entry",
      sizeBytes: rand(120, 600),
      recoveryStatus: pick<EvidenceTemplate["recoveryStatus"]>(["existing", "existing", "deleted", "carved"]),
      confidence: pick([96, 92, 78, 65]),
      preview: `${service} • ${pick(["user@email.com", "+1 555-0142", "subject_account"])}`,
      createdAtDevice: new Date(now - rand(0, 90) * day),
      decodedContent: {
        service,
        account: pick([
          "crdbix@gmail.com", "subject@protonmail.com", "user@outlook.com",
          "+1 555-0142", "anonymous_user", "subject_account_01",
        ]),
        password: pick([
          "Summer2024!", "P@ssw0rd123", "Tr0ub4dour&3",
          "correcthorsebatterystaple", "q1w2e3r4t5", "Hunter2#2024",
          "letmein2024", "Admin@12345",
        ]),
        tokenType: pick(["password", "oauth_token", "api_key", "session_cookie", "refresh_token"]),
        tokenValue: `tok_${Math.random().toString(36).slice(2, 18)}${Math.random().toString(36).slice(2, 18)}`,
        extractionMethod: pick(["keychain_dump", "sqlite_decrypt", "memory_carve", "plist_decode"]),
        accessibleWhenUnlocked: true,
        decoded: true,
        encrypted: true,
        encryptionBot: "FORENSIQ-SecureBot-v2",
        securityLevel: pick(["strong", "moderate", "weak"]),
      },
    });
  }

  // Installed Apps — list of all installed applications with metadata
  const apps = [
    { name: "WhatsApp", bundle: "net.whatsapp.WhatsApp", version: "2.24.7.78", category: "social" },
    { name: "Telegram", bundle: "ru.telegram.messenger", version: "10.12.0", category: "social" },
    { name: "Signal", bundle: "org.thoughtcrime.securesms", version: "7.18.0", category: "social" },
    { name: "Instagram", bundle: "com.burbn.instagram", version: "342.0.0", category: "social" },
    { name: "TikTok", bundle: "com.zhiliaoapp.musically", version: "32.1.0", category: "social" },
    { name: "Snapchat", bundle: "com.toyopagroup.picaboo", version: "12.85.0", category: "social" },
    { name: "Discord", bundle: "com.hammerandchisel.discord", version: "243.0", category: "social" },
    { name: "Cash App", bundle: "com.squareup.cash", version: "4.36.0", category: "financial" },
    { name: "Venmo", bundle: "com.venmo", version: "10.43.0", category: "financial" },
    { name: "Coinbase", bundle: "com.coinbase.consumer", version: "10.92.0", category: "financial" },
    { name: "Binance", bundle: "com.binance.dev", version: "2.78.0", category: "financial" },
    { name: "ProtonMail", bundle: "ch.protonmail.protonmail", version: "1.14.0", category: "communication" },
    { name: "Gmail", bundle: "com.google.Gmail", version: "6.0.240416", category: "communication" },
    { name: "Netflix", bundle: "com.netflix.mediaclient", version: "16.22.0", category: "media" },
    { name: "Spotify", bundle: "com.spotify.client", version: "8.9.68", category: "media" },
    { name: "Amazon", bundle: "com.amazon.mShop.android.shopping", version: "28.16.0", category: "shopping" },
    { name: "Tor Browser", bundle: "org.torproject.torbrowser", version: "13.0.14", category: "privacy" },
    { name: "VPN Express", bundle: "com.expressvpn.vpn", version: "12.73.0", category: "privacy" },
    { name: "Notes", bundle: "com.apple.mobilenotes", version: "1.0", category: "productivity" },
    { name: "Calculator", bundle: "com.apple.calculator", version: "1.0", category: "system" },
  ];
  for (const app of apps) {
    templates.push({
      category: "installed_apps",
      fileName: `${app.bundle}.plist`,
      filePath: `${devicePrefix}Containers/Bundle/Application/${rand(1000, 9999)}/${app.bundle}.app/Info.plist`,
      mimeType: "application/x-plist",
      sizeBytes: rand(2_000, 45_000),
      recoveryStatus: pick<EvidenceTemplate["recoveryStatus"]>(["existing", "existing", "cached"]),
      confidence: 99,
      preview: `${app.name} v${app.version}`,
      createdAtDevice: new Date(now - rand(1, 365) * day),
      decodedContent: {
        appName: app.name,
        bundleId: app.bundle,
        version: app.version,
        appCategory: app.category,
        installDate: new Date(now - rand(1, 365) * day).toISOString(),
        lastUsed: new Date(now - rand(0, 30) * day).toISOString(),
        dataSizeBytes: rand(5_000_000, 800_000_000),
        cacheSizeBytes: rand(1_000_000, 200_000_000),
        permissions: pick([
          ["camera", "microphone", "location", "contacts"],
          ["location", "photos", "storage"],
          ["microphone", "notifications", "background_app_refresh"],
          ["camera", "photos", "location", "contacts", "microphone"],
          ["storage", "notifications"],
        ]),
        hasCredentials: pick([true, true, false]),
        networkActivity: pick(["high", "moderate", "low", "none"]),
        sandboxed: true,
        decoded: true,
        encrypted: true,
        encryptionBot: "FORENSIQ-SecureBot-v2",
      },
    });
  }

  return templates;
}

interface TickResult {
  advanced: boolean;
  completed: boolean;
  logs: string[];
}

// Advance a scan one "tick" — increments stage progress, transitions stages,
// and on completion, bulk-inserts evidence items and writes an audit log entry.
export async function tickScanSession(sessionId: string): Promise<TickResult> {
  const session = await db.scanSession.findUnique({
    where: { id: sessionId },
    include: { case: true },
  });
  if (!session) throw new Error("Scan session not found");
  if (session.status !== "running") {
    return { advanced: false, completed: false, logs: [] };
  }

  const stageIdx = SCAN_STAGES.indexOf((session.stage ?? "analysis") as typeof SCAN_STAGES[number]);
  const currentProgress = session.stageProgress ?? 0;

  // Emit a few log lines from current stage
  const stageLogs = STAGE_LOGS[session.stage ?? "analysis"] || [];
  const startLogIdx = Math.floor((currentProgress / 100) * stageLogs.length);
  const endLogIdx = Math.min(startLogIdx + 2, stageLogs.length);
  const logs = stageLogs.slice(startLogIdx, endLogIdx);

  // Increment stage progress
  const progressIncrement = 12 + Math.floor(Math.random() * 18);
  let newProgress = currentProgress + progressIncrement;

  let newStage = session.stage;
  let newStageIdx = stageIdx;
  let completed = false;

  // Update counters based on stage
  const updates: Record<string, number | null> = {
    stageProgress: newProgress,
  };

  if (session.stage === "analysis") {
    updates.filesAnalyzed = (session.filesAnalyzed ?? 0) + Math.floor(Math.random() * 4000) + 1500;
    updates.cpuUsage = Math.min(95, (session.cpuUsage ?? 30) + Math.floor(Math.random() * 8));
    updates.memUsage = Math.min(92, (session.memUsage ?? 40) + Math.floor(Math.random() * 6));
  } else if (session.stage === "discovery") {
    updates.filesDiscovered = (session.filesDiscovered ?? 0) + Math.floor(Math.random() * 5000) + 2000;
    updates.filesRecoverable = (session.filesRecoverable ?? 0) + Math.floor(Math.random() * 800) + 200;
    updates.cpuUsage = Math.min(95, (session.cpuUsage ?? 50) + Math.floor(Math.random() * 6));
    updates.memUsage = Math.min(94, (session.memUsage ?? 55) + Math.floor(Math.random() * 7));
    updates.storageUsage = Math.min(90, (session.storageUsage ?? 20) + Math.floor(Math.random() * 5));
  } else if (session.stage === "parsing") {
    updates.filesRecovered = (session.filesRecovered ?? 0) + Math.floor(Math.random() * 400) + 100;
    updates.cpuUsage = Math.min(98, (session.cpuUsage ?? 60) + Math.floor(Math.random() * 5));
    updates.memUsage = Math.min(96, (session.memUsage ?? 65) + Math.floor(Math.random() * 6));
  } else if (session.stage === "carving") {
    updates.filesRecovered = (session.filesRecovered ?? 0) + Math.floor(Math.random() * 600) + 200;
    updates.cpuUsage = Math.min(99, (session.cpuUsage ?? 70) + Math.floor(Math.random() * 4));
    updates.memUsage = Math.min(97, (session.memUsage ?? 70) + Math.floor(Math.random() * 5));
  }

  // If stage complete, advance to next
  if (newProgress >= 100) {
    if (newStageIdx < SCAN_STAGES.length - 1) {
      newStageIdx += 1;
      newStage = SCAN_STAGES[newStageIdx];
      newProgress = 0;
    } else {
      // All stages complete
      completed = true;
    }
  }

  if (completed) {
    // Finalize the scan
    const totalRecovered = (updates.filesRecovered as number) ?? session.filesRecovered ?? 0;
    await db.scanSession.update({
      where: { id: sessionId },
      data: {
        status: "complete",
        stage: null,
        stageProgress: 100,
        completedAt: new Date(),
        cpuUsage: 12,
        memUsage: 22,
        storageUsage: session.storageUsage,
        filesRecovered: totalRecovered,
      },
    });

    // NO simulated evidence — only real auto-captured data appears in the system.
    // The scan pipeline runs for visualization/analysis purposes only.
    // Real evidence comes from /api/auto-capture when mobile devices visit.

    await writeAuditLog({
      userId: session.initiatedById,
      organizationId: session.case.organizationId,
      caseId: session.caseId,
      action: "scan_completed",
      resourceType: "scan_session",
      resourceId: sessionId,
      details: `Scan pipeline completed. No simulated data generated — only real auto-captured evidence is stored.`,
    });

    return { advanced: true, completed: true, logs: ["[done] forensiq-engine: scan pipeline complete — no simulated data generated (real data only)"] };
  } else {
    await db.scanSession.update({
      where: { id: sessionId },
      data: {
        stage: newStage,
        stageProgress: newProgress,
        ...updates,
      },
    });
    return { advanced: true, completed: false, logs };
  }
}
