class LemmingEffect {
  constructor(radar) {
    this.radar = radar;
    this.timers = [];
    this.active = false;
  }

  drawLemming(target, index = 0) {
    const sprite = target.append("g")
      .attr("class", "lemming-sprite")
      .attr("aria-hidden", "true")
      .style("--walk-distance", `${26 + (index % 3) * 4}px`)
      .style("--walk-lane", `${(index % 3) * 2 - 2}px`);

    sprite.append("text")
      .attr("class", "lemming-countdown-number")
      .attr("y", -22);

    const body = sprite.append("g")
      .attr("class", "lemming-body");

    body.append("rect")
      .attr("class", "lemming-hair")
      .attr("x", -10)
      .attr("y", -24)
      .attr("width", 20)
      .attr("height", 11)
      .attr("rx", 2);

    body.append("rect")
      .attr("class", "lemming-hair lemming-hair-top")
      .attr("x", -7)
      .attr("y", -31)
      .attr("width", 14)
      .attr("height", 8)
      .attr("rx", 2);

    body.append("rect")
      .attr("class", "lemming-face")
      .attr("x", -7)
      .attr("y", -15)
      .attr("width", 14)
      .attr("height", 12)
      .attr("rx", 2);

    body.append("rect")
      .attr("class", "lemming-tunic")
      .attr("x", -9)
      .attr("y", -4)
      .attr("width", 18)
      .attr("height", 19)
      .attr("rx", 2);

    body.append("rect")
      .attr("class", "lemming-belt")
      .attr("x", -9)
      .attr("y", 6)
      .attr("width", 18)
      .attr("height", 3);

    body.append("circle")
      .attr("class", "lemming-eye")
      .attr("cx", -3)
      .attr("cy", -9)
      .attr("r", 1.2);

    body.append("circle")
      .attr("class", "lemming-eye")
      .attr("cx", 4)
      .attr("cy", -9)
      .attr("r", 1.2);

    body.append("path")
      .attr("class", "lemming-arm lemming-arm-walk")
      .attr("d", "M -9,0 L -16,8 M 9,0 L 16,8");

    body.append("path")
      .attr("class", "lemming-arm lemming-arm-raised")
      .attr("d", "M -8,0 L -15,-10 M 8,0 L 15,-10");

    body.append("path")
      .attr("class", "lemming-leg")
      .attr("d", "M -5,15 L -12,24 M 5,15 L 12,24");

    body.append("path")
      .attr("class", "lemming-boot")
      .attr("d", "M -12,24 L -4,24 M 12,24 L 4,24");

    return sprite;
  }

  drawExplosion(target, position = { x: 0, y: 0 }) {
    const blast = target.append("g")
      .attr("class", "lemming-blast")
      .attr("aria-hidden", "true")
      .attr("transform", `translate(${position.x}, ${position.y})`);

    blast.append("path")
      .attr("class", "lemming-hole")
      .attr("d", "M -12,-4 L -7,-11 L 2,-9 L 11,-5 L 13,4 L 5,10 L -4,12 L -13,6 Z");

    const explosion = blast.append("g")
      .attr("class", "lemming-explosion");

    explosion.append("circle")
      .attr("class", "lemming-boom-core")
      .attr("r", 8);

    for (let index = 0; index < 12; index++) {
      const angle = (Math.PI * 2 * index) / 12;
      const inner = 9;
      const outer = index % 2 === 0 ? 42 : 31;

      explosion.append("line")
        .attr("class", "lemming-boom-ray")
        .attr("x1", Math.cos(angle) * inner)
        .attr("y1", Math.sin(angle) * inner)
        .attr("x2", Math.cos(angle) * outer)
        .attr("y2", Math.sin(angle) * outer);
    }

    for (let index = 0; index < 8; index++) {
      const angle = (Math.PI * 2 * index) / 8 + 0.25;

      explosion.append("circle")
        .attr("class", "lemming-smoke")
        .attr("cx", Math.cos(angle) * 22)
        .attr("cy", Math.sin(angle) * 18)
        .attr("r", 7);
    }

    return explosion;
  }

  drawLemmingCountdown(value, entries) {
    this.updateLemmingButtonCountdown(value);

    entries.forEach(entry => {
      const blip = this.radar.root.select(`#blip-${entry.id}`);

      if (blip.empty()) return;

      blip.select(".lemming-sprite .lemming-countdown-number")
        .text(value);
    });
  }

  updateLemmingButtonCountdown(value) {
    const button = this.radar.element("ohNoButtonId");

    if (!button) return;

    const icon = button.querySelector("[aria-hidden='true']");

    if (icon) {
      icon.textContent = value ? String(value) : "☠︎";
    }
  }

  queueLemmingStep(callback, delay) {
    const timer = window.setTimeout(() => {
      this.timers = this.timers.filter(item => item !== timer);
      callback();
    }, delay);

    this.timers.push(timer);
  }

  clear() {
    this.timers.forEach(timer => window.clearTimeout(timer));
    this.timers = [];
    this.active = false;
    this.updateLemmingButtonCountdown("");

    if (document.body) {
      document.body.dataset.lemmingActive = "false";
    }

    this.radar.root?.selectAll(".lemming-sprite,.lemming-blast").remove();
    this.radar.root?.classed("lemming-active", false);
    this.radar.root?.selectAll(".blip")
      .classed("lemming-target", false)
      .selectAll("circle,path,text")
      .classed("lemming-marker-hidden", false);

    const button = this.radar.element("ohNoButtonId");

    if (button) {
      button.disabled = !this.outerRingEntries().length;
      button.removeAttribute("aria-busy");
    }
  }

  outerRingEntries() {
    const outerRing = this.radar.config.rings.length - 1;

    return this.radar.entries.filter(entry => entry.ring === outerRing);
  }

  updateButtonVisibility() {
    const button = this.radar.element("ohNoButtonId");

    if (!button) return;

    const hasOuterRingEntries = this.radar.display.ohno && this.outerRingEntries().length > 0;
    const controls = button.closest(".ohno-controls");

    button.hidden = !hasOuterRingEntries;
    button.disabled = !hasOuterRingEntries;

    if (controls) {
      controls.hidden = !hasOuterRingEntries;
    }
  }

  start() {
    if (!this.radar.root) return;

    const entries = this.outerRingEntries();

    if (!entries.length) return;

    const button = this.radar.element("ohNoButtonId");

    this.clear();
    this.radar.clearSelection();
    this.active = true;

    if (document.body) {
      document.body.dataset.lemmingActive = "true";
    }

    this.radar.root.classed("lemming-active", true);

    const targets = new Set(entries);
    for (const selection of [this.radar.root.selectAll(".blip"), this.radar.legend.selectAll(".legend-item")]) {
      selection
        .classed("highlight", entry => targets.has(entry))
        .classed("dimmed", entry => !targets.has(entry));
    }

    this.radar.scrollLegendToEntry(entries[0]);

    if (button) {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
    }

    entries.forEach((entry, index) => {
      const blip = this.radar.root.select(`#blip-${entry.id}`);

      if (blip.empty()) return;

      blip.classed("lemming-target", true)
        .selectAll("circle,path,text")
        .classed("lemming-marker-hidden", true);

      this.drawLemming(blip, index);
    });

    [5, 4, 3, 2, 1].forEach((value, index) => {
      this.queueLemmingStep(() => this.drawLemmingCountdown(value, entries), index * 850);
    });

    this.queueLemmingStep(() => {
      this.radar.root.selectAll(".lemming-sprite")
        .classed("lemming-wobble", true)
        .select(".lemming-countdown-number")
        .text("");
      this.updateLemmingButtonCountdown("");
    }, 4250);

    this.queueLemmingStep(() => {
      entries.forEach(entry => {
        const blip = this.radar.root.select(`#blip-${entry.id}`);

        if (blip.empty()) return;

        blip.select(".lemming-sprite").remove();
        this.drawExplosion(blip);
      });
    }, 5400);

    this.queueLemmingStep(() => {
      this.clear();
      this.radar.clearSelection();
    }, 6800);
  }

}

window.LemmingEffect = LemmingEffect;
