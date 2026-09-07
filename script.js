/* =========================================================
   MindScore AI — script.js
   Handles navigation, validation, API calls and the
   animated result gauge. Vanilla JS only.
   ========================================================= */

(function () {
  "use strict";

  const API_URL = "/predict";

  /* ---------------- Mobile nav ---------------- */
  const navToggle = document.getElementById("navToggle");
  const primaryNav = document.getElementById("primaryNav");

  navToggle.addEventListener("click", function () {
    const isOpen = primaryNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  primaryNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      primaryNav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------------- Scroll reveal (single orchestrated pass) ---------------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.animationPlayState = "running";
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach(function (el) {
      el.style.animationPlayState = "paused";
      io.observe(el);
    });
  }

  /* ---------------- Form + validation ---------------- */
  const form = document.getElementById("predictForm");
  const predictBtn = document.getElementById("predictBtn");
  const apiStatus = document.getElementById("apiStatus");
  const resultCard = document.getElementById("resultCard");
  const errorCard = document.getElementById("errorCard");
  const errorMessage = document.getElementById("errorMessage");

  const numericRules = {
    age: { min: 10, max: 100, label: "Age" },
    avg_daily_usage_hours: { min: 0, max: 24, label: "Average daily usage hours" },
    daily_unlocks: { min: 0, max: Infinity, label: "Daily unlocks" },
    study_hours: { min: 0, max: 24, label: "Study hours" },
    physical_activity_hours: { min: 0, max: 24, label: "Physical activity hours" },
    sleep_hours_per_night: { min: 0, max: 24, label: "Sleep hours per night" }
  };

  const selectFields = ["gender", "academic_level", "most_used_platform", "purpose_of_use", "stress_level"];

  function setFieldError(name, message) {
    const input = document.getElementById(name);
    const errorEl = document.getElementById("err-" + name);
    const field = input.closest(".field");
    if (message) {
      field.classList.add("has-error");
      errorEl.textContent = message;
    } else {
      field.classList.remove("has-error");
      errorEl.textContent = "";
    }
  }

  function clearAllErrors() {
    Object.keys(numericRules).concat(selectFields, ["country"]).forEach(function (name) {
      setFieldError(name, "");
    });
  }

  function validateForm() {
    let isValid = true;
    clearAllErrors();

    // Numeric fields
    Object.keys(numericRules).forEach(function (name) {
      const rule = numericRules[name];
      const input = document.getElementById(name);
      const raw = input.value.trim();

      if (raw === "") {
        setFieldError(name, rule.label + " is required.");
        isValid = false;
        return;
      }
      const value = Number(raw);
      if (Number.isNaN(value)) {
        setFieldError(name, "Enter a valid number.");
        isValid = false;
        return;
      }
      if (value < rule.min || value > rule.max) {
        const maxText = rule.max === Infinity ? "" : " and " + rule.max;
        setFieldError(name, rule.label + " must be between " + rule.min + maxText + ".");
        isValid = false;
      }
    });

    // Select fields
    selectFields.forEach(function (name) {
      const input = document.getElementById(name);
      if (!input.value) {
        setFieldError(name, "Please make a selection.");
        isValid = false;
      }
    });

    // Country
    const countryInput = document.getElementById("country");
    if (!countryInput.value.trim()) {
      setFieldError("country", "Country is required.");
      isValid = false;
    }

    return isValid;
  }

  function collectPayload() {
    return {
      age: Number(document.getElementById("age").value),
      gender: document.getElementById("gender").value,
      country: document.getElementById("country").value.trim(),
      academic_level: document.getElementById("academic_level").value,
      most_used_platform: document.getElementById("most_used_platform").value,
      purpose_of_use: document.getElementById("purpose_of_use").value,
      avg_daily_usage_hours: Number(document.getElementById("avg_daily_usage_hours").value),
      daily_unlocks: Number(document.getElementById("daily_unlocks").value),
      study_hours: Number(document.getElementById("study_hours").value),
      physical_activity_hours: Number(document.getElementById("physical_activity_hours").value),
      sleep_hours_per_night: Number(document.getElementById("sleep_hours_per_night").value),
      stress_level: document.getElementById("stress_level").value
    };
  }

  function setLoading(isLoading) {
    predictBtn.disabled = isLoading;
    predictBtn.classList.toggle("loading", isLoading);
    predictBtn.querySelector(".btn-label").textContent = isLoading
      ? "Analyzing..."
      : "Predict mental health score";
  }

  function hideResultAndError() {
    resultCard.hidden = true;
    errorCard.hidden = true;
  }

  function showError(message) {
    hideResultAndError();
    errorMessage.textContent = message;
    errorCard.hidden = false;
    errorCard.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function interpretScore(score) {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Moderate";
    if (score >= 20) return "Needs attention";
    return "High risk";
  }

  /* ---------------- Animated gauge ---------------- */
  const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 94; // r = 94, matches CSS
  const gaugeFill = document.getElementById("gaugeFill");
  const gaugeValue = document.getElementById("gaugeValue");
  const resultInterpretation = document.getElementById("resultInterpretation");

  function animateResult(score) {
    const clamped = Math.max(0, Math.min(100, score));
    const offset = GAUGE_CIRCUMFERENCE * (1 - clamped / 100);

    // colour the arc based on band
    let arcColor = "#5B8C7B"; // sage: good/excellent
    if (clamped < 40) arcColor = "#B8674B"; // clay: needs attention / high risk
    else if (clamped < 60) arcColor = "#D9A441"; // amber: moderate
    gaugeFill.style.stroke = arcColor;

    // reset then trigger CSS transition
    gaugeFill.style.strokeDashoffset = String(GAUGE_CIRCUMFERENCE);
    // force reflow so the transition re-triggers on repeated predictions
    void gaugeFill.getBoundingClientRect();
    requestAnimationFrame(function () {
      gaugeFill.style.strokeDashoffset = String(offset);
    });

    // count up the number
    const duration = 1200;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      gaugeValue.textContent = (clamped * eased).toFixed(1);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        gaugeValue.textContent = clamped.toFixed(2);
      }
    }
    requestAnimationFrame(tick);

    resultInterpretation.textContent = interpretScore(clamped) + " — " + clamped.toFixed(2) + " / 100";
  }

  /* ---------------- Submit handler ---------------- */
  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (predictBtn.disabled) return; // guard against double submits

    if (!validateForm()) {
      apiStatus.textContent = "Please fix the highlighted fields.";
      const firstError = form.querySelector(".has-error input, .has-error select");
      if (firstError) firstError.focus();
      return;
    }

    hideResultAndError();
    apiStatus.textContent = "";
    setLoading(true);

    const payload = collectPayload();

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        if (!response.ok) {
          if (response.status === 422) {
            return response.json().then(function () {
              throw new Error("The backend rejected some values. Please review your entries and try again.");
            });
          }
          throw new Error("Something went wrong while generating your prediction. Please try again.");
        }
        return response.json();
      })
      .then(function (data) {
        setLoading(false);
        const score = Number(data.predicted_mental_health_score);
        if (Number.isNaN(score)) {
          throw new Error("Something went wrong while generating your prediction. Please try again.");
        }
        resultCard.hidden = false;
        animateResult(score);
        resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
      })
      .catch(function (err) {
        setLoading(false);
        if (err instanceof TypeError) {
          // Network-level failure (server down, CORS, etc.)
          showError("Unable to connect to the prediction server. Please make sure the FastAPI backend is running.");
        } else {
          showError(err.message || "Something went wrong while generating your prediction. Please try again.");
        }
      });
  });

  /* ---------------- Result actions ---------------- */
  document.getElementById("retakeBtn").addEventListener("click", function () {
    form.reset();
    clearAllErrors();
    apiStatus.textContent = "";
    hideResultAndError();
    document.getElementById("assessment").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("scrollTopBtn").addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();
