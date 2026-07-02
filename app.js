/* ═══════════════════════════════════════════════
   Study Buddy — Complete App Logic
   All pages, settings, notes, resources, timer
   ═══════════════════════════════════════════════ */
(function () {
  "use strict";

  // ── CONFIG ──
  var DEFAULT_API = "https://script.google.com/macros/s/AKfycbyXD9t6BLx3fFQ2rbsR68_qTtwJd5_6ypOMQ2N1AIzL5JA2dj3mC905wyEp0Pbt-b26/exec";
  var API_URL = localStorage.getItem("sb_api_url") || DEFAULT_API;

  // ── QUOTES ──
  var QUOTES = [
    { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
    { text: "Discipline today leads to freedom tomorrow.", author: "Jocko Willink" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
    { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
    { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
    { text: "Don't wish it were easier. Wish you were better.", author: "Jim Rohn" },
    { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
    { text: "First, solve the problem. Then, write the code.", author: "John Johnson" }
  ];

  var RESOURCES = [
    { icon: "🐍", color: "var(--green-light)", title: "Python Official Docs", desc: "Complete Python language reference", url: "https://docs.python.org/3/" },
    { icon: "📘", color: "var(--primary-light)", title: "LeetCode", desc: "Practice DSA problems", url: "https://leetcode.com/" },
    { icon: "⚡", color: "var(--orange-light)", title: "FastAPI Docs", desc: "Modern Python web framework", url: "https://fastapi.tiangolo.com/" },
    { icon: "🐳", color: "var(--primary-light)", title: "Docker Docs", desc: "Containerization platform", url: "https://docs.docker.com/" },
    { icon: "🧠", color: "var(--purple-light)", title: "LangChain Docs", desc: "LLM application framework", url: "https://python.langchain.com/" },
    { icon: "🗃️", color: "var(--orange-light)", title: "PostgreSQL Tutorial", desc: "Database fundamentals", url: "https://www.postgresqltutorial.com/" },
    { icon: "📐", color: "var(--green-light)", title: "System Design Primer", desc: "System design interview prep", url: "https://github.com/donnemartin/system-design-primer" },
    { icon: "🤖", color: "var(--purple-light)", title: "RAG Tutorial", desc: "Retrieval Augmented Generation", url: "https://docs.llamaindex.ai/" },
    { icon: "🔑", color: "var(--red-light)", title: "Git Handbook", desc: "Version control basics", url: "https://guides.github.com/introduction/git-handbook/" },
    { icon: "🐧", color: "var(--border-light)", title: "Linux Journey", desc: "Learn Linux command line", url: "https://linuxjourney.com/" }
  ];

  // ── STATE ──
  var state = {
    userCode: localStorage.getItem("sb_user_code") || "",
    user: null,
    roadmap: null,
    progress: {},
    customTasks: JSON.parse(localStorage.getItem("sb_custom_tasks") || "[]"),
    todayCompleted: JSON.parse(localStorage.getItem("sb_today_done") || "[]"),
    sessions: JSON.parse(localStorage.getItem("sb_sessions") || "[]"),
    notes: JSON.parse(localStorage.getItem("sb_notes") || "[]"),
    settings: JSON.parse(localStorage.getItem("sb_settings") || "{}"),
    offline: !API_URL,
    activePhase: 0
  };

  var timer = { running: false, interval: null, totalSeconds: 25 * 60, remaining: 25 * 60 };

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return document.querySelectorAll(sel); };

  // ═══════════ INIT ═══════════
  function init() {
    applySettings();
    bindEvents();
    loadRoadmap(function () {
      if (state.userCode) {
        tryLogin(state.userCode);
      } else {
        showView("viewLogin");
      }
    });
    setQuote();
  }

  // ═══════════ VIEW SWITCHING ═══════════
  function showView(id) {
    $$(".view").forEach(function (v) { v.classList.remove("active"); });
    $("#" + id).classList.add("active");
  }

  function showPage(name) {
    $$(".page").forEach(function (p) { p.classList.remove("active"); });
    var pageEl = $("#page" + name.charAt(0).toUpperCase() + name.slice(1));
    if (pageEl) pageEl.classList.add("active");

    $$(".nav-item").forEach(function (n) { n.classList.remove("active"); });
    var navItem = document.querySelector('[data-page="' + name + '"]');
    if (navItem) navItem.classList.add("active");

    // Update header
    var titles = {
      dashboard: { title: getGreeting() + ", " + (state.user ? state.user.name : "User") + "! 👋", sub: "Let's continue your learning journey." },
      roadmap: { title: "📖 Full Roadmap", sub: "Your complete study path" },
      progress: { title: "📊 My Progress", sub: "Track your achievements" },
      topics: { title: "📚 All Topics", sub: "Browse and filter all study topics" },
      notes: { title: "📝 Notes", sub: "Your personal study notes" },
      leaderboard: { title: "🏆 Leaderboard", sub: "See how you compare" },
      resources: { title: "🔗 Resources", sub: "Helpful links and references" },
      settings: { title: "⚙️ Settings", sub: "Customize your experience" }
    };
    var t = titles[name] || titles.dashboard;
    $("#headerGreeting").textContent = t.title;
    $("#headerSub").textContent = t.sub;

    // Render page-specific content
    if (name === "roadmap") renderRoadmapPage();
    if (name === "progress") renderProgressPage();
    if (name === "topics") renderTopicsPage();
    if (name === "notes") renderNotesPage();
    if (name === "leaderboard") loadLeaderboard();
    if (name === "resources") renderResourcesPage();
    if (name === "settings") loadSettingsValues();

    // Close mobile sidebar
    $("#sidebar").classList.remove("open");
  }

  // ═══════════ EVENTS ═══════════
  function bindEvents() {
    // Login
    $("#btnLogin").addEventListener("click", function () {
      var code = $("#loginCode").value.trim().toLowerCase();
      if (!code) return showError("Enter your code");
      tryLogin(code);
    });
    $("#loginCode").addEventListener("keydown", function (e) { if (e.key === "Enter") $("#btnLogin").click(); });

    // Register toggle
    $("#showRegister").addEventListener("click", function (e) {
      e.preventDefault();
      $("#loginForm").style.display = "none";
      $("#registerForm").style.display = "block";
      $(".login-card-title").textContent = "Create Account";
      $(".login-card-sub").textContent = "Start tracking your study progress";
      hideError();
    });
    $("#showLogin").addEventListener("click", function (e) {
      e.preventDefault();
      $("#registerForm").style.display = "none";
      $("#loginForm").style.display = "block";
      $(".login-card-title").textContent = "Welcome back";
      $(".login-card-sub").textContent = "Enter your code to continue studying";
      hideError();
    });
    $("#btnRegister").addEventListener("click", function () {
      var code = $("#regCode").value.trim().toLowerCase();
      var name = $("#regName").value.trim();
      var email = $("#regEmail").value.trim();
      var goal = $("#regGoal").value.trim();
      if (!code || !name) return showError("Code and name are required");
      doRegister(code, name, email, goal);
    });

    // Logout
    $("#btnLogout").addEventListener("click", function () {
      if (!confirm("Log out?")) return;
      localStorage.removeItem("sb_user_code");
      state.userCode = "";
      state.user = null;
      state.progress = {};
      showView("viewLogin");
    });

    // Sidebar nav — ALL items
    $$(".nav-item").forEach(function (item) {
      item.addEventListener("click", function (e) {
        e.preventDefault();
        showPage(item.dataset.page);
      });
    });

    // Quick actions → navigate
    $$(".quick-action[data-nav]").forEach(function (btn) {
      btn.addEventListener("click", function () { showPage(btn.dataset.nav); });
    });

    // View all topics
    if ($("#btnViewAllTopics")) {
      $("#btnViewAllTopics").addEventListener("click", function () { showPage("topics"); });
    }

    // Topic modal
    $("#modalClose").addEventListener("click", closeTopicModal);
    $$(".pill").forEach(function (pill) {
      pill.addEventListener("click", function () {
        $$(".pill").forEach(function (p) { p.classList.remove("active-pill"); });
        pill.classList.add("active-pill");
      });
    });
    $("#btnSaveTopic").addEventListener("click", saveTopic);

    // Log hours
    $("#btnLogHours").addEventListener("click", function () { $("#logModal").style.display = "flex"; });
    $("#btnStartSession").addEventListener("click", function () { $("#logModal").style.display = "flex"; });
    $("#logModalClose").addEventListener("click", function () { $("#logModal").style.display = "none"; });
    $$(".hours-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var input = $("#logHours");
        var val = parseFloat(input.value) || 1;
        input.value = Math.max(0.5, Math.min(12, val + parseFloat(btn.dataset.delta)));
      });
    });
    $("#btnSaveLog").addEventListener("click", saveLog);

    // Add task
    $("#btnAddTask").addEventListener("click", function () { $("#addTaskModal").style.display = "flex"; });
    $("#addTaskClose").addEventListener("click", function () { $("#addTaskModal").style.display = "none"; });
    $("#btnSaveCustomTask").addEventListener("click", saveCustomTask);

    // Notes
    $("#btnNewNote").addEventListener("click", function () {
      $("#noteTitle").value = "";
      $("#noteContent").value = "";
      $("#noteModal").style.display = "flex";
    });
    $("#noteModalClose").addEventListener("click", function () { $("#noteModal").style.display = "none"; });
    $("#btnSaveNote").addEventListener("click", saveNote);

    // Shame close
    if ($("#shameClose")) $("#shameClose").addEventListener("click", function () { $("#shameBanner").style.display = "none"; });

    // Timer
    $("#btnTimerStart").addEventListener("click", toggleTimer);
    $("#btnTimerReset").addEventListener("click", resetTimer);
    $("#timerModeSelect").addEventListener("change", function () {
      var mins = parseInt(this.value) || 25;
      timer.totalSeconds = mins * 60;
      timer.remaining = mins * 60;
      timer.running = false;
      clearInterval(timer.interval);
      updateTimerDisplay();
      $("#btnTimerStart").innerHTML = '<i class="fa-solid fa-play"></i> Start';
      $("#btnTimerStart").classList.remove("running");
    });

    // Topics filter
    if ($("#topicsFilter")) {
      $("#topicsFilter").addEventListener("change", function () { renderTopicsPage(); });
    }

    // Modals close on bg click
    ["topicModal", "logModal", "addTaskModal", "noteModal"].forEach(function (id) {
      $("#" + id).addEventListener("click", function (e) { if (e.target === this) this.style.display = "none"; });
    });

    // Mobile sidebar
    if ($("#sidebarMobileToggle")) {
      $("#sidebarMobileToggle").addEventListener("click", function () { $("#sidebar").classList.toggle("open"); });
    }
    if ($("#sidebarToggle")) {
      $("#sidebarToggle").addEventListener("click", function () { $("#sidebar").classList.toggle("open"); });
    }

    // ── Settings events ──
    // Save profile
    $("#btnSaveProfile").addEventListener("click", function () {
      if (!state.user) return;
      state.user.name = $("#settingsName").value.trim() || state.user.name;
      state.user.email = $("#settingsEmail").value.trim();
      state.user.goal = $("#settingsGoal").value.trim();
      state.user.target_date = $("#settingsTargetDate").value || state.user.target_date;
      saveOffline();
      updateSidebarUser();
      toast("Profile saved!", "success");
    });

    // Dark mode
    $("#settingsDarkMode").addEventListener("change", function () {
      state.settings.darkMode = this.checked;
      document.body.classList.toggle("dark-mode", this.checked);
      saveSettings();
    });

    // Compact sidebar
    $("#settingsCompact").addEventListener("change", function () {
      state.settings.compact = this.checked;
      saveSettings();
      toast("Restart to apply compact mode", "success");
    });

    // Accent color
    $$(".color-dot").forEach(function (dot) {
      dot.addEventListener("click", function () {
        $$(".color-dot").forEach(function (d) { d.classList.remove("active"); });
        dot.classList.add("active");
        var color = dot.dataset.color;
        document.documentElement.style.setProperty("--primary", color);
        state.settings.accentColor = color;
        saveSettings();
      });
    });

    // Timer settings
    ["settingsPomodoro", "settingsShortBreak", "settingsLongBreak"].forEach(function (id) {
      if ($("#" + id)) {
        $("#" + id).addEventListener("change", function () {
          state.settings[id] = parseInt(this.value);
          saveSettings();
        });
      }
    });

    // Timer sound
    $("#settingsTimerSound").addEventListener("change", function () {
      state.settings.timerSound = this.checked;
      saveSettings();
    });

    // Notifications
    $("#settingsEmailRemind").addEventListener("change", function () {
      state.settings.emailRemind = this.checked;
      saveSettings();
    });
    $("#settingsShameBanner").addEventListener("change", function () {
      state.settings.shameBanner = this.checked;
      saveSettings();
    });

    // API URL / connection
    $("#btnTestConnection").addEventListener("click", testConnection);

    // Export
    $("#btnExportData").addEventListener("click", exportData);
    // Import
    $("#btnImportData").addEventListener("click", importData);

    // Danger zone
    $("#btnResetProgress").addEventListener("click", function () {
      if (!confirm("Reset ALL progress? This cannot be undone.")) return;
      state.progress = {};
      state.sessions = [];
      localStorage.setItem("sb_sessions", "[]");
      localStorage.removeItem("sb_hours_" + state.userCode);
      if (state.user) { state.user.current_streak = 0; state.user.total_topics_done = 0; state.user.last_active = ""; }
      saveOffline();
      renderDashboard();
      toast("Progress reset", "success");
    });
    $("#btnDeleteAccount").addEventListener("click", function () {
      if (!confirm("DELETE your account and ALL data? This cannot be undone.")) return;
      if (!confirm("Are you really sure? Type your code to confirm.")) return;
      localStorage.removeItem("sb_data_" + state.userCode);
      localStorage.removeItem("sb_user_code");
      localStorage.removeItem("sb_sessions");
      localStorage.removeItem("sb_notes");
      localStorage.removeItem("sb_custom_tasks");
      localStorage.removeItem("sb_today_done");
      localStorage.removeItem("sb_hours_" + state.userCode);
      state.userCode = "";
      state.user = null;
      state.progress = {};
      showView("viewLogin");
      toast("Account deleted", "error");
    });

    // Topic delegation (for all pages)
    document.addEventListener("click", function (e) {
      var item = e.target.closest(".topic-row");
      if (!item || item.classList.contains("locked")) return;
      var phaseIdx = parseInt(item.dataset.phase);
      var topicIdx = parseInt(item.dataset.topic);
      if (isNaN(phaseIdx) || isNaN(topicIdx)) return;
      openTopicModal(phaseIdx, topicIdx);
    });
  }

  // ═══════════ LOAD ROADMAP ═══════════
  function loadRoadmap(callback) {
    fetch("roadmap.json")
      .then(function (r) { return r.json(); })
      .then(function (data) { state.roadmap = data; callback(); })
      .catch(function () { showError("Failed to load roadmap"); });
  }

  // ═══════════ AUTH ═══════════
  function tryLogin(code) {
    showLoading(true); hideError();
    if (!API_URL) {
      var stored = localStorage.getItem("sb_data_" + code);
      if (stored) {
        var data = JSON.parse(stored);
        state.user = data.user;
        state.progress = data.progress || {};
        state.userCode = code;
        localStorage.setItem("sb_user_code", code);
        showLoading(false);
        showView("viewApp");
        showPage("dashboard");
        renderDashboard();
      } else {
        showLoading(false);
        showError("Code not found. Register first.");
        showView("viewLogin");
      }
      return;
    }
    apiCall("GET", { action: "get_user", code: code })
      .then(function (data) {
        showLoading(false);
        if (data.error) { showError(data.error); showView("viewLogin"); return; }
        state.user = data.user;
        state.progress = {};
        (data.progress || []).forEach(function (p) {
          state.progress[p.topic_id] = { status: p.status, notes: p.notes || "", completed_at: p.completed_at || "" };
        });
        state.userCode = code;
        localStorage.setItem("sb_user_code", code);
        showView("viewApp");
        showPage("dashboard");
        renderDashboard();
      })
      .catch(function () { showLoading(false); showError("Cannot connect to server."); showView("viewLogin"); });
  }

  function doRegister(code, name, email, goal) {
    showLoading(true); hideError();
    if (!API_URL) {
      state.user = {
        code: code, name: name, email: email, goal: goal,
        start_date: todayStr(), target_date: state.roadmap.target_date || "2026-12-31",
        current_streak: 0, longest_streak: 0, last_active: "", total_topics_done: 0
      };
      state.progress = {};
      state.userCode = code;
      localStorage.setItem("sb_user_code", code);
      saveOffline();
      showLoading(false);
      showView("viewApp");
      showPage("dashboard");
      renderDashboard();
      toast("Account created! Start studying 🚀", "success");
      return;
    }
    apiCall("POST", { action: "register", code: code, name: name, email: email, goal: goal, target_date: state.roadmap.target_date || "2026-12-31" })
      .then(function (data) {
        showLoading(false);
        if (data.error) return showError(data.error);
        state.userCode = code;
        localStorage.setItem("sb_user_code", code);
        // Use the returned user data directly instead of a separate API call
        if (data.user) {
          state.user = data.user;
          state.progress = {};
          saveOffline();
          showView("viewApp");
          showPage("dashboard");
          renderDashboard();
        } else {
          // Fallback for older backend that doesn't return user
          tryLogin(code);
        }
        toast("Account created! 🚀", "success");
      })
      .catch(function () { showLoading(false); showError("Registration failed."); });
  }

  // ═══════════ DASHBOARD ═══════════
  function renderDashboard() {
    if (!state.user || !state.roadmap) return;
    var u = state.user;

    // Date
    var dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    $("#headerDate").querySelector("span").textContent = dateStr;
    if ($("#todayDateLabel")) $("#todayDateLabel").textContent = dateStr;

    updateSidebarUser();

    // Stats
    var totalTopics = countAllTopics();
    var doneTopics = countDoneTopics();
    var inProgTopics = countByStatus("in_progress");
    var pct = totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;
    var hoursLogged = parseFloat(localStorage.getItem("sb_hours_" + state.userCode) || "0");

    $("#statTopics").textContent = doneTopics;
    $("#statTopicsTotal").textContent = " / " + totalTopics;
    $("#statTopicsBar").style.width = (totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0) + "%";
    $("#statHours").textContent = hoursLogged.toFixed(1);
    $("#statStreak").textContent = u.current_streak || 0;
    $("#statPercent").textContent = pct;

    // Sidebar streak
    $("#sidebarStreakNum").textContent = u.current_streak || 0;
    var streak = u.current_streak || 0;
    $("#sidebarStreakMsg").textContent = streak >= 30 ? "Legendary! 🏆" : streak >= 7 ? "On fire! 🔥" : streak > 0 ? "Keep it going!" : "Start studying!";
    $("#sidebarStreakBarFill").style.width = Math.min(100, (streak / 30) * 100) + "%";

    // Shame banner
    var shameSetting = state.settings.shameBanner !== false;
    var daysSinceActive = calcDaysSince(u.last_active);
    if (shameSetting && daysSinceActive > 1 && u.last_active) {
      $("#shameBanner").style.display = "flex";
      $("#shameText").textContent = "You haven't studied in " + daysSinceActive + " days. " +
        (streak > 0 ? "Your " + streak + "-day streak is at risk!" : "Your streak is dead. Start again.");
    } else {
      $("#shameBanner").style.display = "none";
    }

    $("#roadmapName").textContent = state.roadmap.goal || "Study Roadmap";

    renderPhaseStepper();
    renderActivePhaseTopics();
    renderTodayPlan();
    renderPhaseProgressBars("phaseProgressBars");
    renderRecentSessions();
    renderDonut(doneTopics, inProgTopics, totalTopics);
  }

  function updateSidebarUser() {
    if (!state.user) return;
    var u = state.user;
    var initials = (u.name || "U").charAt(0).toUpperCase();
    $("#sidebarAvatar").textContent = initials;
    $("#sidebarUserName").textContent = u.name || u.code;
    // Update greeting for dashboard
    var greetEl = $("#headerGreeting");
    if (greetEl && $('[data-page="dashboard"]').classList.contains("active")) {
      greetEl.textContent = getGreeting() + ", " + (u.name || u.code) + "! 👋";
    }
  }

  // ═══════════ PHASE STEPPER ═══════════
  function renderPhaseStepper() {
    var container = $("#phaseStepper");
    if (!container) return;
    container.innerHTML = "";
    var phases = state.roadmap.phases;
    state.activePhase = 0;
    for (var i = 0; i < phases.length; i++) {
      if (countPhaseDone(phases[i]) < phases[i].topics.length) { state.activePhase = i; break; }
      if (i === phases.length - 1) state.activePhase = i;
    }
    phases.forEach(function (phase, idx) {
      var done = countPhaseDone(phase);
      var total = phase.topics.length;
      var isComplete = done === total && total > 0;
      var isActive = idx === state.activePhase;
      var step = document.createElement("div");
      step.className = "stepper-step";
      var shortTitle = phase.title.replace(/Month \d+ — /, "").split(" ").slice(0, 2).join(" ");
      step.innerHTML =
        '<div class="stepper-node" data-phase="' + idx + '">' +
        '<div class="stepper-circle ' + (isComplete ? "completed" : (isActive ? "active" : "")) + '">' +
        (isComplete ? '<i class="fa-solid fa-check"></i>' : (idx + 1)) + '</div>' +
        '<div class="stepper-label ' + (isComplete ? "completed" : (isActive ? "active" : "")) + '">' + esc(shortTitle) + '</div></div>';
      if (idx < phases.length - 1) step.innerHTML += '<div class="stepper-line ' + (isComplete ? "completed" : "") + '"></div>';
      step.querySelector(".stepper-node").addEventListener("click", function () {
        state.activePhase = idx;
        renderPhaseStepper();
        renderActivePhaseTopics();
      });
      container.appendChild(step);
    });
  }

  // ═══════════ ACTIVE PHASE TOPICS ═══════════
  function renderActivePhaseTopics() {
    var container = $("#topicsList");
    if (!container) return;
    var phase = state.roadmap.phases[state.activePhase];
    if (!phase) return;
    var isLocked = false;
    if (state.activePhase > 0) {
      var prev = state.roadmap.phases[state.activePhase - 1];
      if (countPhaseDone(prev) / prev.topics.length < 0.8) isLocked = true;
    }
    container.innerHTML = buildTopicRows(phase, state.activePhase, isLocked, 5);
  }

  function buildTopicRows(phase, phaseIdx, isLocked, limit) {
    var html = "";
    var topics = limit ? phase.topics.slice(0, limit) : phase.topics;
    topics.forEach(function (topic, idx) {
      var p = state.progress[topic.id] || { status: "not_started", completed_at: "" };
      var status = isLocked ? "locked" : p.status;
      var iconHtml, badgeHtml, dateHtml = "";
      if (status === "done") {
        iconHtml = '<div class="topic-status-icon done"><i class="fa-solid fa-check"></i></div>';
        badgeHtml = '<span class="topic-status-badge badge-completed">Completed</span>';
        if (p.completed_at) dateHtml = '<span class="topic-date">' + fmtShortDate(p.completed_at) + '</span>';
      } else if (status === "in_progress") {
        iconHtml = '<div class="topic-status-icon in_progress"><i class="fa-solid fa-spinner"></i></div>';
        badgeHtml = '<span class="topic-status-badge badge-in-progress">In Progress</span>';
      } else if (status === "locked") {
        iconHtml = '<div class="topic-status-icon locked-icon"><i class="fa-solid fa-lock"></i></div>';
        badgeHtml = '<span class="topic-status-badge badge-locked">Locked</span>';
      } else {
        iconHtml = '<div class="topic-status-icon not_started"><i class="fa-regular fa-circle"></i></div>';
        badgeHtml = '';
      }
      html += '<div class="topic-row status-' + status + (isLocked ? ' locked' : '') + '" data-phase="' + phaseIdx + '" data-topic="' + idx + '">' +
        iconHtml + '<div class="topic-info"><div class="topic-name">' + (idx + 1) + '. ' + esc(topic.title) + '</div>' +
        '<div class="topic-desc">' + esc(topic.resource || "") + '</div></div>' + badgeHtml + dateHtml +
        '<span class="topic-chevron"><i class="fa-solid fa-chevron-down"></i></span></div>';
    });
    return html;
  }

  // ═══════════ ROADMAP PAGE ═══════════
  function renderRoadmapPage() {
    var container = $("#roadmapTimeline");
    if (!container || !state.roadmap) return;
    var phases = state.roadmap.phases;
    var totalTopics = countAllTopics();
    $("#roadmapBadge").textContent = totalTopics + " topics";
    var html = "";
    phases.forEach(function (phase, phaseIdx) {
      var done = countPhaseDone(phase);
      var total = phase.topics.length;
      var pct = total > 0 ? Math.round((done / total) * 100) : 0;
      var dotClass = done === total && total > 0 ? "completed" : (phaseIdx > 0 && countPhaseDone(phases[phaseIdx - 1]) / phases[phaseIdx - 1].topics.length < 0.8 ? "locked" : "");
      html += '<div class="timeline-phase"><div class="timeline-dot ' + dotClass + '">' + (phaseIdx + 1) + '</div>';
      html += '<div class="timeline-phase-header">' + esc(phase.title) + ' <span style="color:var(--primary);font-weight:600;font-size:13px">' + pct + '%</span></div>';
      html += '<div class="timeline-phase-sub">' + (phase.subtitle || total + " topics") + '</div>';
      html += '<div class="timeline-topic-list">' + buildTopicRows(phase, phaseIdx, false, null) + '</div>';
      html += '</div>';
    });
    container.innerHTML = html;
  }

  // ═══════════ PROGRESS PAGE ═══════════
  function renderProgressPage() {
    renderPhaseProgressBars("progressPhaseDetails");
    var grid = $("#progressStatsGrid");
    if (!grid) return;
    var total = countAllTopics();
    var done = countDoneTopics();
    var inProg = countByStatus("in_progress");
    var hours = parseFloat(localStorage.getItem("sb_hours_" + state.userCode) || "0");
    var streak = state.user ? (state.user.current_streak || 0) : 0;
    var longest = state.user ? (state.user.longest_streak || 0) : 0;
    var daysLeft = state.user ? calcDaysLeft(state.user.target_date) : 0;
    grid.innerHTML =
      '<div class="progress-stat-item"><div class="stat-value">' + done + '</div><div class="stat-label">Completed</div></div>' +
      '<div class="progress-stat-item"><div class="stat-value">' + inProg + '</div><div class="stat-label">In Progress</div></div>' +
      '<div class="progress-stat-item"><div class="stat-value">' + hours.toFixed(1) + '</div><div class="stat-label">Total Hours</div></div>' +
      '<div class="progress-stat-item"><div class="stat-value">' + streak + '</div><div class="stat-label">Current Streak</div></div>' +
      '<div class="progress-stat-item"><div class="stat-value">' + longest + '</div><div class="stat-label">Longest Streak</div></div>' +
      '<div class="progress-stat-item"><div class="stat-value">' + Math.max(0, daysLeft) + '</div><div class="stat-label">Days Left</div></div>';

    // Activity history from sessions
    var container = $("#activityHistory");
    if (!container) return;
    if (state.sessions.length === 0) {
      container.innerHTML = '<div class="empty-state-mini">No activity yet. Start studying!</div>';
      return;
    }
    var html = "";
    state.sessions.slice(0, 15).forEach(function (s) {
      html += '<div class="activity-item"><div class="activity-dot" style="background:var(--green)"></div>' +
        '<span class="activity-text">' + esc(s.name) + ' (' + (s.hours || 1) + 'h)</span>' +
        '<span class="activity-time">' + fmtTimeAgo(s.time) + '</span></div>';
    });
    container.innerHTML = html;
  }

  // ═══════════ TOPICS PAGE ═══════════
  function renderTopicsPage() {
    var container = $("#allTopicsContainer");
    if (!container || !state.roadmap) return;
    var filter = ($("#topicsFilter") ? $("#topicsFilter").value : "all");
    var html = "";
    state.roadmap.phases.forEach(function (phase, phaseIdx) {
      var filteredTopics = phase.topics.filter(function (t) {
        if (filter === "all") return true;
        var s = (state.progress[t.id] || { status: "not_started" }).status;
        return s === filter;
      });
      if (filteredTopics.length === 0) return;
      var done = countPhaseDone(phase);
      var pct = phase.topics.length > 0 ? Math.round((done / phase.topics.length) * 100) : 0;
      html += '<div class="all-topics-phase"><div class="all-topics-phase-title"><span>' + (phase.icon || "📖") + '</span> ' +
        esc(phase.title) + ' <span style="color:var(--text-muted);font-weight:500;font-size:13px">(' + pct + '%)</span></div>';
      filteredTopics.forEach(function (topic) {
        var origIdx = phase.topics.indexOf(topic);
        var p = state.progress[topic.id] || { status: "not_started" };
        var iconHtml = p.status === "done" ? '<div class="topic-status-icon done"><i class="fa-solid fa-check"></i></div>' :
          p.status === "in_progress" ? '<div class="topic-status-icon in_progress"><i class="fa-solid fa-spinner"></i></div>' :
            '<div class="topic-status-icon not_started"><i class="fa-regular fa-circle"></i></div>';
        html += '<div class="topic-row status-' + p.status + '" data-phase="' + phaseIdx + '" data-topic="' + origIdx + '">' +
          iconHtml + '<div class="topic-info"><div class="topic-name">' + esc(topic.title) + '</div>' +
          '<div class="topic-desc">' + esc(topic.resource || "") + '</div></div>' +
          '<span class="topic-hours" style="font-size:12px;color:var(--text-muted)">' + (topic.hours || "?") + 'h</span>' +
          '<span class="topic-chevron"><i class="fa-solid fa-chevron-right"></i></span></div>';
      });
      html += '</div>';
    });
    container.innerHTML = html || '<div class="empty-state-mini">No topics match this filter</div>';
  }

  // ═══════════ NOTES PAGE ═══════════
  function renderNotesPage() {
    var container = $("#notesContainer");
    if (!container) return;
    if (state.notes.length === 0) {
      container.innerHTML = '<div class="notes-empty"><i class="fa-solid fa-sticky-note"></i>No notes yet.<br>Click "New Note" to create one.</div>';
      return;
    }
    var html = "";
    state.notes.forEach(function (note, idx) {
      html += '<div class="note-card" data-note-idx="' + idx + '">' +
        '<button class="note-card-delete" data-delete="' + idx + '"><i class="fa-solid fa-trash"></i></button>' +
        '<div class="note-card-title">' + esc(note.title) + '</div>' +
        '<div class="note-card-content">' + esc(note.content) + '</div>' +
        '<div class="note-card-date">' + fmtShortDate(note.date) + '</div></div>';
    });
    container.innerHTML = html;
    // Delete buttons
    container.querySelectorAll(".note-card-delete").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var idx = parseInt(btn.dataset.delete);
        if (confirm("Delete this note?")) {
          state.notes.splice(idx, 1);
          localStorage.setItem("sb_notes", JSON.stringify(state.notes));
          renderNotesPage();
          toast("Note deleted", "success");
        }
      });
    });
  }

  function saveNote() {
    var title = $("#noteTitle").value.trim();
    var content = $("#noteContent").value.trim();
    if (!title && !content) return;
    state.notes.unshift({ title: title || "Untitled", content: content, date: new Date().toISOString() });
    localStorage.setItem("sb_notes", JSON.stringify(state.notes));
    $("#noteModal").style.display = "none";
    renderNotesPage();
    toast("Note saved!", "success");
  }

  // ═══════════ LEADERBOARD ═══════════
  function loadLeaderboard() {
    var list = $("#leaderboardList");
    if (!list) return;
    if (!API_URL) {
      var u = state.user || {};
      var pct = countAllTopics() > 0 ? Math.round((countDoneTopics() / countAllTopics()) * 100) : 0;
      list.innerHTML = renderLbItem(1, u.name || u.code || "You", u.current_streak || 0, pct);
      return;
    }
    list.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading...</span></div>';
    apiCall("GET", { action: "leaderboard" })
      .then(function (data) {
        var users = data.users || [];
        if (!users.length) { list.innerHTML = '<div class="empty-state-mini">No users yet</div>'; return; }
        var html = "";
        users.forEach(function (u, i) { html += renderLbItem(i + 1, u.name, u.current_streak || 0, u.progress_pct || 0); });
        list.innerHTML = html;
      }).catch(function () { list.innerHTML = '<div class="empty-state-mini">Cannot load leaderboard</div>'; });
  }

  function renderLbItem(rank, name, streak, pct) {
    var medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
    var cls = rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "";
    return '<div class="lb-item"><span class="lb-rank ' + cls + '">' + medal + '</span>' +
      '<div class="lb-info"><div class="lb-name">' + esc(name) + '</div><div class="lb-streak">🔥 ' + streak + ' day streak</div></div>' +
      '<span class="lb-progress">' + pct + '%</span></div>';
  }

  // ═══════════ RESOURCES PAGE ═══════════
  function renderResourcesPage() {
    var container = $("#resourcesList");
    if (!container) return;
    var html = "";
    RESOURCES.forEach(function (r) {
      html += '<div class="resource-card"><div class="resource-icon" style="background:' + r.color + '">' + r.icon + '</div>' +
        '<div class="resource-info"><div class="resource-title">' + esc(r.title) + '</div>' +
        '<div class="resource-desc">' + esc(r.desc) + '</div>' +
        '<a href="' + r.url + '" target="_blank" rel="noopener" class="resource-link"><i class="fa-solid fa-external-link-alt"></i> Open</a></div></div>';
    });
    container.innerHTML = html;
  }

  // ═══════════ SETTINGS ═══════════
  function loadSettingsValues() {
    if (!state.user) return;
    $("#settingsName").value = state.user.name || "";
    $("#settingsEmail").value = state.user.email || "";
    $("#settingsGoal").value = state.user.goal || "";
    $("#settingsTargetDate").value = state.user.target_date || "";
    $("#settingsDarkMode").checked = !!state.settings.darkMode;
    $("#settingsCompact").checked = !!state.settings.compact;
    $("#settingsTimerSound").checked = state.settings.timerSound !== false;
    $("#settingsEmailRemind").checked = state.settings.emailRemind !== false;
    $("#settingsShameBanner").checked = state.settings.shameBanner !== false;
    $("#settingsPomodoro").value = state.settings.settingsPomodoro || 25;
    $("#settingsShortBreak").value = state.settings.settingsShortBreak || 5;
    $("#settingsLongBreak").value = state.settings.settingsLongBreak || 15;
    $("#settingsApiUrl").value = API_URL || "";
    $("#settingsReminderDays").value = state.settings.reminderDays || 1;
    // Color
    $$(".color-dot").forEach(function (d) {
      d.classList.toggle("active", d.dataset.color === (state.settings.accentColor || "#4F6EF7"));
    });
  }

  function testConnection() {
    var url = $("#settingsApiUrl").value.trim();
    var status = $("#connectionStatus");
    if (!url) {
      status.textContent = "No URL provided. Running in offline mode.";
      status.className = "connection-status error";
      return;
    }
    status.textContent = "Testing...";
    status.className = "connection-status testing";
    // Save URL
    localStorage.setItem("sb_api_url", url);
    API_URL = url;
    state.offline = false;

    fetch(url + "?action=get_user&code=__test__")
      .then(function (r) { return r.json(); })
      .then(function () {
        status.textContent = "✓ Connected to Google Sheets!";
        status.className = "connection-status success";
      })
      .catch(function () {
        status.textContent = "✗ Connection failed. Check the URL.";
        status.className = "connection-status error";
      });
  }

  function exportData() {
    var data = {
      user: state.user,
      progress: state.progress,
      notes: state.notes,
      sessions: state.sessions,
      settings: state.settings,
      exportDate: new Date().toISOString()
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "study-buddy-export-" + todayStr() + ".json";
    a.click();
    toast("Data exported!", "success");
  }

  function importData() {
    var file = $("#importFile").files[0];
    if (!file) return toast("Select a file first", "error");
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        if (data.progress) { state.progress = data.progress; }
        if (data.notes) { state.notes = data.notes; localStorage.setItem("sb_notes", JSON.stringify(state.notes)); }
        if (data.sessions) { state.sessions = data.sessions; localStorage.setItem("sb_sessions", JSON.stringify(state.sessions)); }
        saveOffline();
        renderDashboard();
        toast("Data imported!", "success");
      } catch (err) {
        toast("Invalid file format", "error");
      }
    };
    reader.readAsText(file);
  }

  function applySettings() {
    if (state.settings.darkMode) document.body.classList.add("dark-mode");
    if (state.settings.accentColor) document.documentElement.style.setProperty("--primary", state.settings.accentColor);
  }
  function saveSettings() { localStorage.setItem("sb_settings", JSON.stringify(state.settings)); }

  // ═══════════ TOPIC MODAL ═══════════
  var currentTopic = null;
  function openTopicModal(phaseIdx, topicIdx) {
    var phase = state.roadmap.phases[phaseIdx];
    var topic = phase.topics[topicIdx];
    var p = state.progress[topic.id] || { status: "not_started", notes: "" };
    currentTopic = { phaseIdx: phaseIdx, topicIdx: topicIdx, id: topic.id };
    $("#modalPhaseBadge").textContent = "Phase " + (phaseIdx + 1) + " · " + phase.title.replace(/Month \d+ — /, "");
    $("#modalTopicTitle").textContent = topic.title;
    $("#modalResource").innerHTML = '<i class="fa-solid fa-link"></i> ' + esc(topic.resource || "—");
    $("#modalHours").innerHTML = '<i class="fa-solid fa-clock"></i> ' + (topic.hours || "?") + " hours";
    $("#modalNotes").value = p.notes || "";
    $$(".pill").forEach(function (pill) {
      pill.classList.toggle("active-pill", pill.dataset.status === p.status);
    });
    $("#topicModal").style.display = "flex";
  }
  function closeTopicModal() { $("#topicModal").style.display = "none"; currentTopic = null; }

  function saveTopic() {
    if (!currentTopic) return;
    var activePill = $(".pill.active-pill");
    var status = activePill ? activePill.dataset.status : "not_started";
    var notes = $("#modalNotes").value.trim();
    var topic = state.roadmap.phases[currentTopic.phaseIdx].topics[currentTopic.topicIdx];
    var phase = state.roadmap.phases[currentTopic.phaseIdx];
    var prev = state.progress[topic.id] || { status: "not_started" };
    var isNewDone = prev.status !== "done" && status === "done";

    state.progress[topic.id] = { status: status, notes: notes, completed_at: status === "done" ? new Date().toISOString() : (prev.completed_at || "") };

    if (isNewDone && state.user) {
      updateStreak();
      state.user.total_topics_done = countDoneTopics();
      addSession(topic.title, topic.hours || 1);
    }

    if (!API_URL) {
      saveOffline(); closeTopicModal(); renderDashboard();
      if (isNewDone) toast("Topic completed! 🎉", "success");
      return;
    }

    $("#modalLoading").style.display = "flex";
    $("#btnSaveTopic").disabled = true;
    apiCall("POST", { action: "complete_topic", code: state.userCode, phase: phase.title, topic_id: topic.id, topic_title: topic.title, status: status, notes: notes })
      .then(function (data) {
        $("#modalLoading").style.display = "none"; $("#btnSaveTopic").disabled = false;
        if (data.user) state.user = data.user;
        closeTopicModal(); renderDashboard();
        if (isNewDone) toast("Topic completed! 🎉", "success");
      }).catch(function () {
        $("#modalLoading").style.display = "none"; $("#btnSaveTopic").disabled = false;
        saveOffline(); closeTopicModal(); renderDashboard();
        toast("Saved locally", "error");
      });
  }

  // ═══════════ LOG ACTIVITY ═══════════
  function saveLog() {
    var hours = parseFloat($("#logHours").value) || 1;
    if (state.user) updateStreak();
    var key = "sb_hours_" + state.userCode;
    localStorage.setItem(key, (parseFloat(localStorage.getItem(key) || "0") + hours).toFixed(1));
    addSession("Study session", hours);

    if (!API_URL) {
      saveOffline(); $("#logModal").style.display = "none"; renderDashboard();
      toast("Logged " + hours + "h! 🔥", "success"); return;
    }
    $("#logLoading").style.display = "flex"; $("#btnSaveLog").disabled = true;
    apiCall("POST", { action: "log_activity", code: state.userCode, hours: hours })
      .then(function (data) {
        $("#logLoading").style.display = "none"; $("#btnSaveLog").disabled = false;
        if (data.user) state.user = data.user;
        $("#logModal").style.display = "none"; renderDashboard();
        toast("Logged " + hours + "h! 🔥", "success");
      }).catch(function () {
        $("#logLoading").style.display = "none"; $("#btnSaveLog").disabled = false;
        saveOffline(); $("#logModal").style.display = "none"; renderDashboard();
        toast("Saved locally", "error");
      });
  }

  // ═══════════ SESSIONS ═══════════
  function addSession(name, hours) {
    state.sessions.unshift({ name: name, hours: hours, time: new Date().toISOString(), status: "Completed" });
    if (state.sessions.length > 30) state.sessions = state.sessions.slice(0, 30);
    localStorage.setItem("sb_sessions", JSON.stringify(state.sessions));
  }
  function renderRecentSessions() {
    var container = $("#recentSessions");
    if (!container) return;
    if (!state.sessions.length) { container.innerHTML = '<div class="empty-state-mini">No sessions logged yet</div>'; return; }
    var html = "";
    state.sessions.slice(0, 3).forEach(function (s) {
      html += '<div class="session-item"><div class="session-icon" style="background:var(--primary-light);color:var(--primary)"><i class="fa-solid fa-book"></i></div>' +
        '<div class="session-info"><div class="session-name">' + esc(s.name) + '</div><div class="session-time">' + (s.hours || 1) + 'h · ' + fmtTimeAgo(s.time) + '</div></div>' +
        '<span class="session-badge">' + s.status + '</span></div>';
    });
    container.innerHTML = html;
  }

  // ═══════════ TODAY'S PLAN ═══════════
  function renderTodayPlan() {
    var container = $("#todayPlanList");
    if (!container) return;
    var tasks = getTodayTasks();
    if (!tasks.length) {
      container.innerHTML = '<div class="empty-state-mini">Add tasks to your daily plan</div>';
      $("#todayProgressLabel").textContent = "0 / 0 completed";
      $("#todayProgressFill").style.width = "0%";
      return;
    }
    var todayKey = todayStr();
    var completedIds = state.todayCompleted.filter(function (c) { return c.date === todayKey; }).map(function (c) { return c.id; });
    var html = "";
    var doneCount = 0;
    tasks.forEach(function (task) {
      var isDone = completedIds.indexOf(task.id) !== -1;
      if (isDone) doneCount++;
      html += '<div class="today-task' + (isDone ? " completed" : "") + '" data-task-id="' + task.id + '">' +
        '<div class="today-check' + (isDone ? " checked" : "") + '"><i class="fa-solid fa-check"></i></div>' +
        '<div class="today-task-info"><div class="today-task-name">' + esc(task.name) + '</div></div>' +
        '<span class="today-task-time">' + task.time + ' min</span></div>';
    });
    container.innerHTML = html;
    container.querySelectorAll(".today-check").forEach(function (check) {
      check.addEventListener("click", function () {
        var taskId = check.closest(".today-task").dataset.taskId;
        toggleTodayTask(taskId);
      });
    });
    var pct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;
    $("#todayProgressLabel").textContent = doneCount + " / " + tasks.length + " completed";
    $("#todayProgressFill").style.width = pct + "%";
  }
  function getTodayTasks() {
    var tasks = [];
    if (!state.roadmap) return tasks;
    for (var i = 0; i < state.roadmap.phases.length && tasks.length < 4; i++) {
      for (var j = 0; j < state.roadmap.phases[i].topics.length && tasks.length < 4; j++) {
        var t = state.roadmap.phases[i].topics[j];
        if ((state.progress[t.id] || { status: "not_started" }).status !== "done") {
          tasks.push({ id: t.id, name: t.title, time: (t.hours || 1) * 60 });
        }
      }
    }
    state.customTasks.forEach(function (ct) { tasks.push({ id: "custom_" + ct.title, name: ct.title, time: ct.time || 45 }); });
    return tasks;
  }
  function toggleTodayTask(taskId) {
    var todayKey = todayStr();
    var idx = -1;
    state.todayCompleted.forEach(function (c, i) { if (c.id === taskId && c.date === todayKey) idx = i; });
    if (idx !== -1) state.todayCompleted.splice(idx, 1); else state.todayCompleted.push({ id: taskId, date: todayKey });
    localStorage.setItem("sb_today_done", JSON.stringify(state.todayCompleted));
    renderTodayPlan();
  }
  function saveCustomTask() {
    var title = $("#customTaskTitle").value.trim();
    var time = parseInt($("#customTaskTime").value) || 45;
    if (!title) return;
    state.customTasks.push({ title: title, time: time });
    localStorage.setItem("sb_custom_tasks", JSON.stringify(state.customTasks));
    $("#addTaskModal").style.display = "none";
    $("#customTaskTitle").value = "";
    renderTodayPlan();
    toast("Task added!", "success");
  }

  // ═══════════ PHASE PROGRESS BARS ═══════════
  function renderPhaseProgressBars(containerId) {
    var container = $("#" + containerId);
    if (!container || !state.roadmap) return;
    var colors = ["#22C55E", "#4F6EF7", "#8B5CF6", "#F97316", "#EF4444", "#EAB308"];
    var html = "";
    state.roadmap.phases.forEach(function (phase, idx) {
      var done = countPhaseDone(phase);
      var total = phase.topics.length;
      var pct = total > 0 ? Math.round((done / total) * 100) : 0;
      var shortName = "Phase " + (idx + 1) + " - " + phase.title.replace(/Month \d+ — /, "").split(" ").slice(0, 2).join(" ");
      html += '<div class="phase-bar-row"><span class="phase-bar-label">' + esc(shortName) + '</span>' +
        '<div class="phase-bar-track"><div class="phase-bar-fill" style="width:' + pct + '%;background:' + (colors[idx] || colors[0]) + '"></div></div>' +
        '<span class="phase-bar-pct">' + pct + '%</span></div>';
    });
    container.innerHTML = html;
  }

  // ═══════════ DONUT CHART ═══════════
  function renderDonut(done, inProg, total) {
    var notStarted = total - done - inProg;
    var pct = total > 0 ? Math.round((done / total) * 100) : 0;
    var circumference = 314;
    var donePct = total > 0 ? done / total : 0;
    var inProgPct = total > 0 ? inProg / total : 0;
    setTimeout(function () {
      $("#donutDone").style.strokeDashoffset = circumference * (1 - donePct);
      $("#donutInProg").style.strokeDashoffset = circumference * (1 - inProgPct);
      $("#donutInProg").style.transform = "rotate(" + (donePct * 360) + "deg)";
      $("#donutInProg").style.transformOrigin = "60px 60px";
    }, 200);
    $("#donutPct").textContent = pct + "%";
    var ip = total > 0 ? Math.round((inProg / total) * 100) : 0;
    var ns = total > 0 ? Math.round((notStarted / total) * 100) : 0;
    $("#legendDone").textContent = done + " (" + pct + "%)";
    $("#legendInProg").textContent = inProg + " (" + ip + "%)";
    $("#legendNotStarted").textContent = notStarted + " (" + ns + "%)";
  }

  // ═══════════ TIMER ═══════════
  function toggleTimer() {
    var btn = $("#btnTimerStart");
    if (timer.running) {
      clearInterval(timer.interval); timer.running = false;
      btn.innerHTML = '<i class="fa-solid fa-play"></i> Start';
      btn.classList.remove("running");
    } else {
      timer.running = true;
      btn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
      btn.classList.add("running");
      timer.interval = setInterval(function () {
        timer.remaining--;
        if (timer.remaining <= 0) {
          clearInterval(timer.interval); timer.running = false; timer.remaining = 0;
          btn.innerHTML = '<i class="fa-solid fa-play"></i> Start'; btn.classList.remove("running");
          toast("⏰ Timer complete! Take a break.", "success");
          addSession("Pomodoro (" + (timer.totalSeconds / 60) + " min)", parseFloat((timer.totalSeconds / 60 / 60).toFixed(1)));
          renderRecentSessions();
        }
        updateTimerDisplay();
      }, 1000);
    }
  }
  function resetTimer() {
    clearInterval(timer.interval); timer.running = false;
    timer.remaining = timer.totalSeconds;
    updateTimerDisplay();
    $("#btnTimerStart").innerHTML = '<i class="fa-solid fa-play"></i> Start';
    $("#btnTimerStart").classList.remove("running");
  }
  function updateTimerDisplay() {
    var m = Math.floor(timer.remaining / 60), s = timer.remaining % 60;
    $("#timerDisplay").textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  // ═══════════ STREAK ═══════════
  function updateStreak() {
    if (!state.user) return;
    var today = todayStr();
    var last = state.user.last_active || "";
    if (last === today) return;
    var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    state.user.current_streak = last === yesterday ? (state.user.current_streak || 0) + 1 : 1;
    if (state.user.current_streak > (state.user.longest_streak || 0)) state.user.longest_streak = state.user.current_streak;
    state.user.last_active = today;
  }

  // ═══════════ QUOTE ═══════════
  function setQuote() {
    var q = QUOTES[new Date().getDate() % QUOTES.length];
    if ($("#motivationText")) $("#motivationText").textContent = '"' + q.text + '"';
    if ($("#motivationAuthor")) $("#motivationAuthor").textContent = "— " + q.author;
    if ($(".sidebar-quote-text")) $(".sidebar-quote-text").textContent = q.text;
    if ($(".sidebar-quote-author")) $(".sidebar-quote-author").textContent = "— " + q.author;
  }

  // ═══════════ HELPERS ═══════════
  function countAllTopics() { if (!state.roadmap) return 0; var c = 0; state.roadmap.phases.forEach(function (p) { c += p.topics.length; }); return c; }
  function countDoneTopics() { var c = 0; Object.keys(state.progress).forEach(function (id) { if (state.progress[id].status === "done") c++; }); return c; }
  function countByStatus(s) { var c = 0; Object.keys(state.progress).forEach(function (id) { if (state.progress[id].status === s) c++; }); return c; }
  function countPhaseDone(phase) { var c = 0; phase.topics.forEach(function (t) { if (state.progress[t.id] && state.progress[t.id].status === "done") c++; }); return c; }
  function calcDaysLeft(d) { return d ? Math.ceil((new Date(d) - new Date()) / 86400000) : 0; }
  function calcDaysSince(d) { return d ? Math.floor((new Date() - new Date(d)) / 86400000) : 999; }
  function todayStr() { return new Date().toISOString().slice(0, 10); }
  function getGreeting() { var h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }
  function esc(s) { if (!s) return ""; var d = document.createElement("div"); d.appendChild(document.createTextNode(s)); return d.innerHTML; }
  function fmtShortDate(iso) { try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } }
  function fmtTimeAgo(iso) {
    if (!iso) return "";
    var diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return "Just now"; if (diff < 60) return diff + "m ago"; if (diff < 1440) return Math.floor(diff / 60) + "h ago"; return Math.floor(diff / 1440) + "d ago";
  }

  // ═══════════ API ═══════════
  function apiCall(method, params) {
    if (method === "GET") {
      return fetch(API_URL + "?" + Object.keys(params).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); }).join("&")).then(function (r) { return r.json(); });
    }
    return fetch(API_URL, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(params) }).then(function (r) { return r.json(); });
  }
  function saveOffline() { if (state.userCode) localStorage.setItem("sb_data_" + state.userCode, JSON.stringify({ user: state.user, progress: state.progress })); }
  function showLoading(s) { $("#loginLoading").style.display = s ? "flex" : "none"; }
  function showError(m) { var el = $("#loginError"); el.textContent = m; el.style.display = "block"; }
  function hideError() { $("#loginError").style.display = "none"; }
  function toast(msg, type) {
    var existing = document.querySelector(".toast"); if (existing) existing.remove();
    var t = document.createElement("div"); t.className = "toast " + (type || ""); t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("show"); });
    setTimeout(function () { t.classList.remove("show"); setTimeout(function () { t.remove(); }, 300); }, 3000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
