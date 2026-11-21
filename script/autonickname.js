const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "autonickname",
  version: "1.0.0",
  hasPermission: 2,
  credits: "Ryuk",
  description: "Auto Change Nickname — Auto ON, Mabagal na Delay",
  usePrefix: false,
  commandCategory: "Auto",
  usages: "",
  cooldowns: 0
};

// ===== SETTINGS =====
const ENABLED_BY_DEFAULT = true;       // ✅ AYAW NA AGAD — HINDI KAILANGANG COMMAND
const MEMBER_DELAY = 15000;            // ⏱️ 15 segundo bawat member — HUWAG BILISAN!
const CYCLE_DELAY = 60000;             // ⏱️ 1 minuto bago umulit sa lahat

// ===== MGA PALIT NA NICKNAME — DAGDAGAN MO KUNG GUSTO MO =====
const NICKNAMES = [
  "✨ Gising na!",
  "🌟 Maging masaya 😊",
  "🔥 Magandang araw!",
  "💫 Huwag mahiya 😊",
  "⚡ Nandito lang ako",
  "🌈 Ngumiti ka naman",
  "🎯 Kaya mo 'yan!",
  "💎 Mahalaga ka ❤️",
  "🚀 Simulan na!",
  "🎪 Bawal malungkot 😊",
  "🦋 Ikaw ay espesyal ✨",
  "🌍 Mag-usap tayo 😊",
  "🔔 Hello po! 👋",
  "💡 May magandang araw!",
  "🍀 Good vibes lang ✨",
  "🎁 Ngiti mo, libre 'yan 😊",
  "🌙 Pahinga kung kailangan ✨",
  "☀️ Lakas ng loob tol!",
  "💪 Kaya natin 'to!",
  "🎊 Salamat sa pagsama ❤️"
];

let running = new Map();
let nicknameIndex = new Map();
let memberIndex = new Map();
let memberListCache = new Map();

function getRandomNickname(memberId) {
  if (!nicknameIndex.has(memberId)) {
    nicknameIndex.set(memberId, Math.floor(Math.random() * NICKNAMES.length));
  }
  let i = nicknameIndex.get(memberId);
  const name = NICKNAMES[i];
  i = (i + 1) % NICKNAMES.length;
  nicknameIndex.set(memberId, i);
  return name;
}

async function processMember(api, threadID, members, idx) {
  if (!running.get(threadID)) return;
  if (idx >= members.length) {
    // ✅ Natapos lahat — maghintay bago umulit
    setTimeout(() => {
      memberIndex.set(threadID, 0);
      processMember(api, threadID, members, 0);
    }, CYCLE_DELAY);
    return;
  }

  const member = members[idx];
  const memberID = member.userID;
  
  // ✅ Huwag baguhin ang sarili o admin
  if (memberID === api.getCurrentUserID() || member.isAdmin) {
    memberIndex.set(threadID, idx + 1);
    setTimeout(() => processMember(api, threadID, members, idx + 1), MEMBER_DELAY);
    return;
  }

  const newNick = getRandomNickname(memberID);
  
  api.changeNickname(newNick, threadID, memberID, (err) => {
    if (err) {
      console.log(`[AUTO-NICK] Error sa ${member.firstName}:`, err?.message || err);
    } else {
      console.log(`[AUTO-NICK] ✅ ${member.firstName} → ${newNick}`);
    }
    
    // ✅ Sunod na member pagkalipas ng delay
    memberIndex.set(threadID, idx + 1);
    setTimeout(() => processMember(api, threadID, members, idx + 1), MEMBER_DELAY);
  });
}

async function startLoop(api, threadID) {
  if (running.get(threadID)) return;
  running.set(threadID, true);
  memberIndex.set(threadID, 0);
  
  console.log(`[AUTO-NICK] ✅ Nagsimula sa GC: ${threadID}`);
  
  const loadAndStart = async () => {
    if (!running.get(threadID)) return;
    
    api.getThreadInfo(threadID, async (err, info) => {
      if (err || !info) {
        console.log("[AUTO-NICK] Hindi makuha ang thread info — susubukan ulit mamaya");
        setTimeout(loadAndStart, 30000);
        return;
      }
      
      const members = info.participants.filter(m => m.userID !== api.getCurrentUserID());
      memberListCache.set(threadID, members);
      console.log(`[AUTO-NICK] ${members.length} na miyembro ang naproseso`);
      
      processMember(api, threadID, members, 0);
    });
  };
  
  loadAndStart();
}

function stopLoop(threadID) {
  running.set(threadID, false);
  memberIndex.delete(threadID);
  nicknameIndex.delete(threadID);
  memberListCache.delete(threadID);
}

// ===== AUTO START — PAG MAY PASOK NA MENSAHE, SIMULA AGAD =====
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, body, isGroup } = event;
  if (!body || !isGroup) return;
  
  if (ENABLED_BY_DEFAULT && !running.get(threadID)) {
    startLoop(api, threadID);
  }
};

// ===== COMMAND — KUNG GUSTO MO ITIGIL O SIMULAN =====
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const sub = (args[0] || "").toLowerCase();

  if (sub === "off") {
    stopLoop(threadID);
    return api.sendMessage("🛑 Auto Nickname: OFF ✅", threadID, messageID);
  }

  if (sub === "on") {
    startLoop(threadID);
    return api.sendMessage("🏷️ Auto Nickname: ON ✅", threadID, messageID);
  }

  return api.sendMessage(
    "🏷️ Auto Nickname Commands:\n\n" +
    "/autonickname on — simulan\n" +
    "/autonickname off — itigil",
    threadID, messageID
  );
};
