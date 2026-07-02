/* ═══════════════════════════════════════════════
   Study Buddy — Google Apps Script Backend
   
   SETUP:
   1. Create a Google Sheet with 3 tabs: "Users", "Progress", "Activity"
   2. Open Extensions > Apps Script
   3. Paste this code
   4. Deploy > New deployment > Web App
      - Execute as: Me
      - Who has access: Anyone
   5. Copy the Web App URL into app.js API_URL
   6. In Apps Script, go to Triggers > Add Trigger:
      - Function: sendDailyReminders
      - Event source: Time-driven
      - Type: Day timer
      - Time: 9pm to 10pm
   ═══════════════════════════════════════════════ */

var SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// ══════════ ROUTING ══════════

function doGet(e) {
  var action = e.parameter.action;
  var result;

  try {
    switch (action) {
      case "get_user":
        result = getUser(e.parameter.code);
        break;
      case "get_progress":
        result = getProgress(e.parameter.code);
        break;
      case "leaderboard":
        result = getLeaderboard();
        break;
      default:
        result = { error: "Unknown action" };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ error: "Invalid JSON" });
  }

  var result;
  try {
    switch (data.action) {
      case "register":
        result = registerUser(data);
        break;
      case "complete_topic":
        result = completeTopic(data);
        break;
      case "update_status":
        result = updateStatus(data);
        break;
      case "log_activity":
        result = logActivity(data);
        break;
      default:
        result = { error: "Unknown action" };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return jsonResponse(result);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════ USER OPERATIONS ══════════

function registerUser(data) {
  var sheet = getSheet("Users");
  var code = (data.code || "").toLowerCase().trim();
  var name = data.name || "";
  var email = data.email || "";
  var goal = data.goal || "";
  var targetDate = data.target_date || "";

  if (!code || !name) return { error: "Code and name are required" };

  // Check if code exists
  var existing = findUserRow(code);
  if (existing > 0) return { error: "Code already taken. Choose another." };

  var now = new Date().toISOString();
  var today = now.slice(0, 10);

  sheet.appendRow([
    code,           // A: user_code
    name,           // B: display_name
    goal,           // C: goal
    today,          // D: start_date
    targetDate,     // E: target_date
    0,              // F: current_streak
    0,              // G: longest_streak
    "",             // H: last_active
    0,              // I: total_topics_done
    now,            // J: created_at
    email           // K: email
  ]);

  return { status: "ok", message: "Registered successfully" };
}

function getUser(code) {
  code = (code || "").toLowerCase().trim();
  if (!code) return { error: "Code is required" };

  var sheet = getSheet("Users");
  var row = findUserRow(code);
  if (row < 0) return { error: "User not found. Register first." };

  var data = sheet.getRange(row, 1, 1, 11).getValues()[0];

  // Check streak decay (if last_active was before yesterday, reset streak)
  var lastActive = data[7] ? formatDate(data[7]) : "";
  var today = new Date().toISOString().slice(0, 10);
  var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  var currentStreak = data[5] || 0;
  if (lastActive && lastActive !== today && lastActive !== yesterday) {
    currentStreak = 0;
    sheet.getRange(row, 6).setValue(0);
  }

  var user = {
    code: data[0],
    name: data[1],
    goal: data[2],
    start_date: formatDate(data[3]),
    target_date: formatDate(data[4]),
    current_streak: currentStreak,
    longest_streak: data[6] || 0,
    last_active: lastActive,
    total_topics_done: data[8] || 0,
    email: data[10] || ""
  };

  // Get progress
  var progress = getProgressData(code);

  return { user: user, progress: progress };
}

// ══════════ PROGRESS OPERATIONS ══════════

function completeTopic(data) {
  var code = (data.code || "").toLowerCase().trim();
  var topicId = data.topic_id || "";
  var topicTitle = data.topic_title || "";
  var phase = data.phase || "";
  var status = data.status || "done";
  var notes = data.notes || "";

  if (!code || !topicId) return { error: "Code and topic_id required" };

  var sheet = getSheet("Progress");
  var row = findProgressRow(code, topicId);
  var now = new Date().toISOString();

  if (row > 0) {
    // Update existing
    sheet.getRange(row, 4).setValue(status);       // D: status
    sheet.getRange(row, 5).setValue(status === "done" ? now : ""); // E: completed_at
    sheet.getRange(row, 6).setValue(notes);         // F: notes
  } else {
    // New row
    sheet.appendRow([
      code,             // A: user_code
      phase,            // B: phase
      topicId,          // C: topic_id
      status,           // D: status
      status === "done" ? now : "",  // E: completed_at
      notes,            // F: notes
      topicTitle        // G: topic_title
    ]);
  }

  // Update streak and topic count
  var updatedUser = updateUserStats(code);

  return { status: "ok", user: updatedUser };
}

function updateStatus(data) {
  return completeTopic(data);
}

function getProgress(code) {
  code = (code || "").toLowerCase().trim();
  return { progress: getProgressData(code) };
}

function getProgressData(code) {
  var sheet = getSheet("Progress");
  var data = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === code) {
      result.push({
        phase: data[i][1],
        topic_id: data[i][2],
        status: data[i][3],
        completed_at: data[i][4] ? data[i][4].toString() : "",
        notes: data[i][5] || ""
      });
    }
  }
  return result;
}

// ══════════ ACTIVITY LOGGING ══════════

function logActivity(data) {
  var code = (data.code || "").toLowerCase().trim();
  var hours = data.hours || 1;

  if (!code) return { error: "Code required" };

  var sheet = getSheet("Activity");
  var today = new Date().toISOString().slice(0, 10);

  // Check if already logged today
  var allData = sheet.getDataRange().getValues();
  var found = false;
  for (var i = 1; i < allData.length; i++) {
    if (allData[i][0] === code && formatDate(allData[i][1]) === today) {
      // Update existing entry
      var existingHours = allData[i][3] || 0;
      sheet.getRange(i + 1, 4).setValue(existingHours + hours);
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow([code, today, 0, hours]);
  }

  var updatedUser = updateUserStats(code);

  return { status: "ok", user: updatedUser };
}

// ══════════ LEADERBOARD ══════════

function getLeaderboard() {
  var sheet = getSheet("Users");
  var data = sheet.getDataRange().getValues();
  var users = [];

  // Get total topics from roadmap (approximate)
  var progressSheet = getSheet("Progress");
  var progressData = progressSheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var code = data[i][0];
    var doneTasks = 0;

    for (var j = 1; j < progressData.length; j++) {
      if (progressData[j][0] === code && progressData[j][3] === "done") {
        doneTasks++;
      }
    }

    users.push({
      name: data[i][1],
      current_streak: data[i][5] || 0,
      longest_streak: data[i][6] || 0,
      total_topics_done: doneTasks,
      progress_pct: Math.round((doneTasks / 75) * 100) // ~75 total topics in roadmap
    });
  }

  // Sort by streak * progress
  users.sort(function (a, b) {
    var scoreA = (a.current_streak || 0) * (a.progress_pct || 0);
    var scoreB = (b.current_streak || 0) * (b.progress_pct || 0);
    return scoreB - scoreA;
  });

  return { users: users.slice(0, 20) };
}

// ══════════ STREAK & STATS ══════════

function updateUserStats(code) {
  var sheet = getSheet("Users");
  var row = findUserRow(code);
  if (row < 0) return null;

  var today = new Date().toISOString().slice(0, 10);
  var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  var userData = sheet.getRange(row, 1, 1, 11).getValues()[0];
  var lastActive = userData[7] ? formatDate(userData[7]) : "";
  var currentStreak = userData[5] || 0;
  var longestStreak = userData[6] || 0;

  if (lastActive !== today) {
    if (lastActive === yesterday) {
      currentStreak++;
    } else {
      currentStreak = 1;
    }
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }
  }

  // Count done topics
  var progressSheet = getSheet("Progress");
  var progressData = progressSheet.getDataRange().getValues();
  var doneCount = 0;
  for (var i = 1; i < progressData.length; i++) {
    if (progressData[i][0] === code && progressData[i][3] === "done") {
      doneCount++;
    }
  }

  // Update user row
  sheet.getRange(row, 6).setValue(currentStreak);   // F
  sheet.getRange(row, 7).setValue(longestStreak);    // G
  sheet.getRange(row, 8).setValue(today);            // H
  sheet.getRange(row, 9).setValue(doneCount);        // I

  return {
    code: userData[0],
    name: userData[1],
    goal: userData[2],
    start_date: formatDate(userData[3]),
    target_date: formatDate(userData[4]),
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_active: today,
    total_topics_done: doneCount,
    email: userData[10] || ""
  };
}

// ══════════ EMAIL NOTIFICATIONS ══════════
// Set this as a daily time-driven trigger (9pm IST)

function sendDailyReminders() {
  var sheet = getSheet("Users");
  var data = sheet.getDataRange().getValues();
  var today = new Date().toISOString().slice(0, 10);

  for (var i = 1; i < data.length; i++) {
    var code = data[i][0];
    var name = data[i][1];
    var email = data[i][10]; // K column
    var lastActive = data[i][7] ? formatDate(data[i][7]) : "";
    var currentStreak = data[i][5] || 0;

    // Skip if no email or already active today
    if (!email || lastActive === today) continue;

    var daysMissed = lastActive ? Math.floor((new Date() - new Date(lastActive)) / 86400000) : 0;

    var subject, body;

    if (daysMissed === 1) {
      subject = "⚠️ Study Buddy: You haven't studied today!";
      body = "Hey " + name + ",\n\n" +
        "You haven't logged any study time today.\n" +
        "Your current streak is " + currentStreak + " day(s) — don't let it break!\n\n" +
        "Even 30 minutes counts. Open Study Buddy and mark at least one topic.\n\n" +
        "— Study Buddy 📚";
    } else if (daysMissed === 2) {
      subject = "🚨 Study Buddy: 2 days missed — streak broken!";
      body = "Hey " + name + ",\n\n" +
        "You've missed 2 days in a row. Your streak has been reset to 0.\n\n" +
        "Your previous streak was " + currentStreak + " days. " +
        "Get back on track today — the longer you wait, the harder it gets.\n\n" +
        "— Study Buddy 📚";
    } else if (daysMissed >= 3) {
      subject = "😤 Study Buddy: " + daysMissed + " days without studying";
      body = "Hey " + name + ",\n\n" +
        "It's been " + daysMissed + " days since you last studied.\n\n" +
        "You set a goal. You started this. Are you going to let it go?\n\n" +
        "Open Study Buddy. Do ONE topic. That's all it takes to restart.\n\n" +
        "— Study Buddy 📚";
    } else {
      continue; // Active today or yesterday, no reminder needed
    }

    try {
      MailApp.sendEmail({
        to: email,
        subject: subject,
        body: body
      });
    } catch (err) {
      Logger.log("Failed to send email to " + email + ": " + err.message);
    }
  }
}

// ══════════ HELPERS ══════════

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Add headers
    if (name === "Users") {
      sheet.appendRow(["user_code", "display_name", "goal", "start_date", "target_date",
        "current_streak", "longest_streak", "last_active", "total_topics_done", "created_at", "email"]);
    } else if (name === "Progress") {
      sheet.appendRow(["user_code", "phase", "topic_id", "status", "completed_at", "notes", "topic_title"]);
    } else if (name === "Activity") {
      sheet.appendRow(["user_code", "date", "topics_completed", "time_logged"]);
    }
  }
  return sheet;
}

function findUserRow(code) {
  var sheet = getSheet("Users");
  var data = sheet.getRange("A:A").getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === code) return i + 1; // 1-indexed row
  }
  return -1;
}

function findProgressRow(code, topicId) {
  var sheet = getSheet("Progress");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === code && data[i][2] === topicId) return i + 1;
  }
  return -1;
}

function formatDate(d) {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  try {
    return d.toISOString().slice(0, 10);
  } catch (e) {
    return d.toString().slice(0, 10);
  }
}
