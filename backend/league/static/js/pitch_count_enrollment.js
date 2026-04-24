"use strict";

/**
 * WTLL Admin — Dynamic Enrollment Dropdown
 *
 * Listens for changes on the player select (matched by name, not id —
 * Django admin does not always render id attributes on select widgets).
 * Fetches /api/players/<id>/enrollments/ and rebuilds the enrollment dropdown.
 */
(function () {

  const API_URL = "/api/players/{id}/enrollments/";

  function playerSelect() {
    return document.querySelector("select[name='player']");
  }

  function enrollmentSelect() {
    return document.getElementById("id_player_enrollment");
  }

  function setDisabled(select, message) {
    select.innerHTML = `<option value="">${message}</option>`;
    select.disabled = true;
  }

  function buildOptions(select, enrollments, preserveId) {
    select.innerHTML = "";

    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "---------";
    select.appendChild(blank);

    enrollments.forEach(function (e) {
      const opt = document.createElement("option");
      opt.value = e.id;
      opt.textContent = e.label;
      if (preserveId && String(e.id) === String(preserveId)) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    if (enrollments.length === 1) {
      select.value = enrollments[0].id;
    }

    select.disabled = false;
  }

  async function fetchEnrollments(playerId) {
    const url = API_URL.replace("{id}", playerId);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    return json.data || [];
  }

  async function onPlayerChange(preserveEnrollmentId) {
    const enrollment = enrollmentSelect();
    if (!enrollment) return;

    const playerId = playerSelect().value;

    if (!playerId) {
      setDisabled(enrollment, "---------");
      return;
    }

    setDisabled(enrollment, "Loading…");

    try {
      const enrollments = await fetchEnrollments(playerId);
      if (enrollments.length === 0) {
        setDisabled(enrollment, "No enrollments found for this player");
        return;
      }
      buildOptions(enrollment, enrollments, preserveEnrollmentId || null);
    } catch (err) {
      console.error("[WTLL] Failed to load enrollments:", err);
      setDisabled(enrollment, "Error loading enrollments — check console");
    }
  }

  function init() {
    const player     = playerSelect();
    const enrollment = enrollmentSelect();

    if (!player) {
      console.warn("[WTLL] Could not find player select (name='player')");
      return;
    }
    if (!enrollment) {
      console.warn("[WTLL] Could not find enrollment select (id='id_player_enrollment')");
      return;
    }

    player.addEventListener("change", function () {
      onPlayerChange(null);
    });

    if (player.value) {
      const savedEnrollmentId = enrollment.value;
      onPlayerChange(savedEnrollmentId);
    } else {
      setDisabled(enrollment, "Select a player first");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();