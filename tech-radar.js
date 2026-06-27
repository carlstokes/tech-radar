const THEME_STORAGE_KEY = "tech-radar-theme";

const DEFAULT_ELEMENTS = {
  svgId: "radar",
  legendId: "legend",
  guidanceId: "guidance",
  tooltipId: "tooltip",
  titleId: "title",
  captionId: "caption",
  dateId: "date",
  titleContainerId: "title-container",
  controlsId: "controls",
  mainId: "radar-layout",
  themeToggleId: "theme-toggle",
  quadrantControlsId: "quadrant-controls",
  searchId: "search",
  searchOptionsId: "search-options"
};

const DEFAULT_DISPLAY_OPTIONS = {
  sidebar: true,
  guidance: true,
  controls: true,
  title: true,
  theme: "system"
};

class TechRadar {
  constructor(config, options = {}) {
    this.selectionActive = false;
    this.selectedEntry = undefined;

    this.config = config;
    this.elements = { ...DEFAULT_ELEMENTS, ...(options.elements || {}) };
    this.display = { ...DEFAULT_DISPLAY_OPTIONS, ...(options.display || {}) };

    this.width = 1000;
    this.height = 1000;
    this.centre = { x: 500, y: 500 };
    this.innerRadius = 30;
    this.ringRadii = [130, 220, 310, 400];

    this.quadrants = [
      { start: Math.PI, end: Math.PI * 1.5, box: [0, 0, 500, 500] },       // 0 Top Left
      { start: Math.PI * 1.5, end: Math.PI * 2, box: [500, 0, 500, 500] }, // 1 Top Right
      { start: Math.PI / 2, end: Math.PI, box: [0, 500, 500, 500] },       // 2 Bottom Left
      { start: 0, end: Math.PI / 2, box: [500, 500, 500, 500] }            // 3 Bottom Right
    ];

    this.entries = this.config.entries.map((entry, index) => {
      const point = this.pointForEntry(entry, index);

      return {
        ...entry,
        x: point.x,
        y: point.y,
        initialX: point.x,
        initialY: point.y
      };
    });

    this.assignNumbers(this.entries);

    this.entryLookup = new Map(
      this.entries.map(entry => [entry.label.toLowerCase(), entry])
    );
  }

  render() {
    this.svg = this.selectElement("svgId");
    this.legend = this.selectElement("legendId");
    this.guidance = this.selectElement("guidanceId");
    this.tooltip = this.selectElement("tooltipId");

    this.applyInitialTheme();
    this.applyDisplayOptions();
    this.setHeaderText();

    this.svg.selectAll("*").remove();
    this.legend.html("");
    this.guidance.html("");

    this.viewport = this.svg.append("g").attr("id", "viewport");
    this.root = this.viewport.append("g").attr("id", "radar-root");

    this.configureZoom();
    this.drawGrid();
    this.buildLegend();
    this.buildSearchOptions();
    this.buildGuidance();
    this.drawBlips();
    this.buildQuadrantControls();
    this.bindControls();
    this.bindTooltipPositioning();
    this.bindSelectionClearing();

    return this;
  }

  element(name) {
    return document.getElementById(this.elements[name]);
  }

  selectElement(name) {
    return d3.select(this.element(name));
  }

  setHeaderText() {
    const title = this.element("titleId");
    const caption = this.element("captionId");
    const date = this.element("dateId");

    if (title) title.textContent = this.config.title;
    if (caption) caption.textContent = this.config.caption;
    if (date) date.textContent = this.config.date;
  }

  getSystemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  getInitialTheme() {
    return localStorage.getItem(THEME_STORAGE_KEY) || this.getSystemTheme();
  }

  applyTheme(theme, persist = false) {
    document.body.dataset.theme = theme;

    if (persist) {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }

    const toggle = this.element("themeToggleId");

    if (toggle) {
      const isDark = theme === "dark";
      toggle.textContent = isDark ? "Light mode" : "Dark mode";
      toggle.setAttribute("aria-pressed", String(isDark));
    }
  }

  applyInitialTheme() {
    if (this.display.theme === "light" || this.display.theme === "dark") {
      this.applyTheme(this.display.theme);
      return;
    }

    this.applyTheme(this.getInitialTheme());

    window.matchMedia("(prefers-color-scheme: dark)").onchange = event => {
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        this.applyTheme(event.matches ? "dark" : "light");
        this.refreshThemeColours();
      }
    };
  }

  applyDisplayOptions() {
    document.body.dataset.showTitle = String(this.display.title);
    document.body.dataset.showControls = String(this.display.controls);
    document.body.dataset.showSidebar = String(this.display.sidebar);
    document.body.dataset.showGuidance = String(this.display.guidance);
  }

  cssVar(name) {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
  }

  ringColour(index) {
    return this.cssVar(`--ring-${index}`);
  }

  seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  segmentFor(entry) {
    const quadrant = this.quadrants[entry.quadrant];

    return {
      angleMin: quadrant.start,
      angleMax: quadrant.end,
      radiusMin: entry.ring === 0 ? this.innerRadius : this.ringRadii[entry.ring - 1],
      radiusMax: this.ringRadii[entry.ring]
    };
  }

  toPolar(x, y) {
    const dx = x - this.centre.x;
    const dy = y - this.centre.y;

    let angle = Math.atan2(dy, dx);

    if (angle < 0) {
      angle += Math.PI * 2;
    }

    return {
      angle,
      radius: Math.sqrt(dx * dx + dy * dy)
    };
  }

  toCartesian(angle, radius) {
    return {
      x: this.centre.x + Math.cos(angle) * radius,
      y: this.centre.y + Math.sin(angle) * radius
    };
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  clampToSegment(entry) {
    const segment = this.segmentFor(entry);
    const point = this.toPolar(entry.x, entry.y);

    const angle = this.clamp(point.angle, segment.angleMin + 0.03, segment.angleMax - 0.03);
    const radius = this.clamp(point.radius, segment.radiusMin + 16, segment.radiusMax - 16);

    const cartesian = this.toCartesian(angle, radius);

    entry.x = cartesian.x;
    entry.y = cartesian.y;
  }

  pointForEntry(entry, index) {
    const segment = this.segmentFor(entry);

    const angle =
      segment.angleMin +
      0.08 +
      this.seededRandom(index + 11) * (segment.angleMax - segment.angleMin - 0.16);

    const radius =
      segment.radiusMin +
      20 +
      this.seededRandom(index + 101) * (segment.radiusMax - segment.radiusMin - 40);

    return this.toCartesian(angle, radius);
  }

  assignNumbers(entries) {
    let id = 1;

    for (const quadrant of [0, 1, 2, 3]) {
      for (let ring = 0; ring < this.config.rings.length; ring++) {
        entries
          .filter(entry => entry.quadrant === quadrant && entry.ring === ring)
          .sort((a, b) => a.label.localeCompare(b.label))
          .forEach(entry => {
            entry.id = id++;
          });
      }
    }
  }

  quadrantLabelPosition(index) {
    const outer = this.ringRadii[this.ringRadii.length - 1];

    const positions = [
      {
        x: this.centre.x - outer + 40,
        y: this.centre.y - outer + 85,
        anchor: "start"
      },
      {
        x: this.centre.x + outer - 40,
        y: this.centre.y - outer + 85,
        anchor: "end"
      },
      {
        x: this.centre.x - outer + 40,
        y: this.centre.y + outer - 85,
        anchor: "start"
      },
      {
        x: this.centre.x + outer - 40,
        y: this.centre.y + outer - 85,
        anchor: "end"
      }
    ];

    return positions[index];
  }

  buildQuadrantControls() {
    const container = this.element("quadrantControlsId");

    if (!container) return;

    container.innerHTML = "";

    this.config.quadrants.forEach((quadrant, index) => {
      const button = document.createElement("button");

      button.type = "button";
      button.dataset.zoom = String(index);
      button.textContent = quadrant.name;

      container.appendChild(button);
    });
  }

  drawGrid() {
    this.root.append("rect")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("fill", this.cssVar("--surface"));

    this.root.append("line")
      .attr("x1", this.centre.x)
      .attr("y1", this.centre.y - this.ringRadii[3])
      .attr("x2", this.centre.x)
      .attr("y2", this.centre.y + this.ringRadii[3])
      .attr("stroke", this.cssVar("--grid"));

    this.root.append("line")
      .attr("x1", this.centre.x - this.ringRadii[3])
      .attr("y1", this.centre.y)
      .attr("x2", this.centre.x + this.ringRadii[3])
      .attr("y2", this.centre.y)
      .attr("stroke", this.cssVar("--grid"));

    this.config.rings.forEach((ring, index) => {
      this.root.append("circle")
        .attr("cx", this.centre.x)
        .attr("cy", this.centre.y)
        .attr("r", this.ringRadii[index])
        .attr("fill", "none")
        .attr("stroke", this.cssVar("--grid"));

      this.root.append("text")
        .attr("class", "ring-label")
        .attr("x", this.centre.x)
        .attr("y", this.centre.y - this.ringRadii[index] + 70)
        .attr("text-anchor", "middle")
        .attr("fill", this.ringColour(index))
        .text(ring.name);
    });

    this.config.quadrants.forEach((quadrant, index) => {
      const label = this.quadrantLabelPosition(index);

      this.root.append("text")
        .attr("class", "quadrant-label")
        .attr("x", label.x)
        .attr("y", label.y)
        .attr("text-anchor", label.anchor)
        .text(quadrant.name)
        .on("click", () => this.zoomToQuadrant(index));
    });
  }

  setLinkedHighlight(entry, active, options = {}) {
    this.root.selectAll(".blip")
      .classed("highlight", d => active && d.id === entry.id)
      .classed("dimmed", d => active && d.id !== entry.id);

    d3.selectAll(".legend-item")
      .classed("highlight", function () {
        return active && this.id === `legend-item-${entry.id}`;
      })
      .classed("dimmed", function () {
        return active && this.id !== `legend-item-${entry.id}`;
      });

    if (active && options.scrollLegend) {
      this.scrollLegendToEntry(entry);
    }
  }

  bindHighlightEvents(selection, getEntry, options = {}) {
    selection
      .on("mouseenter.highlight focus.highlight", (event, d) => {
        if (this.selectionActive) return;

        const entry = getEntry(d);

        this.setLinkedHighlight(entry, true, {
          scrollLegend: options.scrollLegend
        });

        if (options.onShow) {
          options.onShow(event, entry);
        }
      })
      .on("mouseleave.highlight blur.highlight", (event, d) => {
        if (this.selectionActive) return;

        const entry = getEntry(d);

        this.setLinkedHighlight(entry, false);

        if (options.onHide) {
          options.onHide(event, entry);
        }
      });
  }

  isBlipVisible(entry) {
    const blip = document.getElementById(`blip-${entry.id}`);
    const svgElement = this.element("svgId");

    if (!blip || !svgElement) return false;

    const blipBox = blip.getBoundingClientRect();
    const svgBox = svgElement.getBoundingClientRect();
    const blipCentre = {
      x: blipBox.left + blipBox.width / 2,
      y: blipBox.top + blipBox.height / 2
    };

    return (
      blipCentre.x >= svgBox.left &&
      blipCentre.x <= svgBox.right &&
      blipCentre.y >= svgBox.top &&
      blipCentre.y <= svgBox.bottom &&
      blipCentre.x >= 0 &&
      blipCentre.x <= window.innerWidth &&
      blipCentre.y >= 0 &&
      blipCentre.y <= window.innerHeight
    );
  }

  positionTooltip(entry) {
    const blip = document.getElementById(`blip-${entry.id}`);

    if (!blip || !this.isBlipVisible(entry)) {
      this.tooltip.style("opacity", 0);
      return false;
    }

    const box = blip.getBoundingClientRect();

    this.tooltip
      .style("left", `${box.left + box.width + 12}px`)
      .style("top", `${box.top + box.height / 2}px`);

    return true;
  }

  showTooltip(entry, options = {}) {
    const visible = this.positionTooltip(entry);

    this.tooltip
      .style("opacity", visible ? 1 : 0)
      .classed("selected", Boolean(options.selected));

    this.tooltip.html("");

    const title = entry.link
      ? this.tooltip.append("a")
        .attr("href", entry.link)
        .attr("target", "_blank")
        .attr("rel", "noopener noreferrer")
      : this.tooltip.append("strong");

    title.text(`${entry.id}. ${entry.label}`);

    this.tooltip.append("br");

    this.tooltip.append("span")
      .text(entry.reason || "");
  }

  hideTooltip() {
    this.tooltip
      .style("opacity", 0)
      .classed("selected", false);
  }

  selectEntry(entry, options = {}) {
    this.selectionActive = true;
    this.selectedEntry = entry;

    if (options.zoomToEntry) {
      this.zoomToEntry(entry);
    } else if (options.zoom !== false) {
      this.zoomToQuadrant(entry.quadrant);
    }

    if (options.scrollLegend !== false) {
      this.scrollLegendToEntry(entry);
    }

    this.setLinkedHighlight(entry, true);
    this.showTooltip(entry, { selected: true });
  }

  updateSelectedTooltip() {
    if (!this.selectedEntry) return;

    const visible = this.positionTooltip(this.selectedEntry);
    this.tooltip.style("opacity", visible ? 1 : 0);
  }

  bindTooltipPositioning() {
    if (this.tooltipPositioningBound) return;

    this.tooltipPositioningBound = true;

    window.addEventListener("scroll", () => this.updateSelectedTooltip(), { passive: true });
    window.addEventListener("resize", () => this.updateSelectedTooltip());
  }

  bindSelectionClearing() {
    if (this.selectionClearingBound) return;

    this.selectionClearingBound = true;

    document.addEventListener("click", event => {
      if (!this.selectionActive) return;

      const target = event.target;

      if (!(target instanceof Element)) return;
      if (target.closest(`#${this.elements.controlsId}`)) return;
      if (target.closest(`#${this.elements.tooltipId}`)) return;
      if (target.closest(".blip")) return;
      if (target.closest(".legend-item")) return;
      if (target.closest("a, button, input, select, textarea")) return;

      this.clearSelection();
    });
  }

  drawMarker(target, entry) {
    const colour = this.ringColour(entry.ring);

    if (entry.moved === 1) {
      target.append("path")
        .attr("d", "M -11,7 L 11,7 L 0,-14 Z")
        .attr("fill", colour);
    } else if (entry.moved === -1) {
      target.append("path")
        .attr("d", "M -11,-7 L 11,-7 L 0,14 Z")
        .attr("fill", colour);
    } else if (entry.moved === 2) {
      target.append("path")
        .attr("d", d3.symbol().type(d3.symbolStar).size(220)())
        .attr("fill", colour);
    } else {
      target.append("circle")
        .attr("r", 10)
        .attr("fill", colour);
    }

    target.append("text").text(entry.id);
  }

  drawBlips() {
    const blips = this.root.selectAll(".blip")
      .data(this.entries, d => d.id)
      .enter()
      .append("g")
      .attr("class", "blip")
      .attr("id", d => `blip-${d.id}`)
      .attr("tabindex", 0)
      .attr("transform", d => `translate(${d.x}, ${d.y})`)
      .on("pointerdown", event => event.preventDefault())
      .on("click", (event, d) => {
        event.preventDefault();
        event.stopPropagation();
        this.selectEntry(d, { zoom: false });
      });

    this.bindHighlightEvents(blips, d => d, {
      scrollLegend: true,
      onShow: (event, entry) => this.showTooltip(entry),
      onHide: () => this.hideTooltip()
    });

    blips.each((d, index, nodes) => {
      const group = d3.select(nodes[index]);

      this.drawMarker(group, d);
    });

    d3.forceSimulation(this.entries)
      .force("x", d3.forceX(d => d.initialX).strength(0.13))
      .force("y", d3.forceY(d => d.initialY).strength(0.13))
      .force("collide", d3.forceCollide(14).strength(0.95))
      .alpha(0.9)
      .alphaDecay(0.025)
      .on("tick", () => {
        this.entries.forEach(entry => this.clampToSegment(entry));
        blips.attr("transform", d => `translate(${d.x}, ${d.y})`);

        this.updateSelectedTooltip();
      });
  }

  buildLegend() {
    const legend = this.legend;
    legend.html("");

    this.config.quadrants.forEach((quadrant, qIndex) => {
      const section = legend.append("div")
        .attr("class", "legend-section");

      const quadrantCount = this.entries.filter(
        entry => entry.quadrant === qIndex
      ).length;

      section.append("h2")
        .text(`${quadrant.name} (${quadrantCount})`);

      this.config.rings.forEach((ring, rIndex) => {
        const items = this.entries
          .filter(entry => entry.quadrant === qIndex && entry.ring === rIndex)
          .sort((a, b) => a.id - b.id);

        if (!items.length) return;

        const ringBlock = section.append("div")
          .attr("class", "legend-ring");

        ringBlock.append("h3")
          .attr("class", `guidance-name ring-name-${rIndex}`)
          .text(`${ring.name} (${items.length})`);

        items.forEach(item => {
          const row = ringBlock.append("div")
            .attr("class", "legend-item")
            .attr("id", `legend-item-${item.id}`)
            .attr("tabindex", 0);

          this.bindHighlightEvents(row, () => item);

          row.on("click", event => {
            if (event.target.closest("a")) return;

            event.stopPropagation();
            this.selectEntry(item, {
              zoomToEntry: true,
              scrollLegend: false
            });
          });

          row.append("span")
            .attr("class", "num")
            .text(`${item.id}.`);

          const label = item.link
            ? row.append("a")
              .attr("href", item.link)
              .attr("target", "_blank")
              .attr("rel", "noopener noreferrer")
            : row.append("span");

          label.text(item.label);

          if (item.reason) {
            row.append("div")
              .attr("class", "legend-reason")
              .text(item.reason);
          }
        });
      });
    });
  }

  buildGuidance() {
    const guidance = this.guidance;
    guidance.html("");

    const grid = guidance.append("div")
      .attr("class", "guidance-grid");

    const ringsSection = grid.append("section");

    ringsSection.append("h2")
      .text("Ring Assignments");

    const ringsTable = ringsSection.append("table");

    ringsTable.append("thead")
      .append("tr")
      .selectAll("th")
      .data(["Ring", "Description"])
      .enter()
      .append("th")
      .text(d => d);

    const ringsBody = ringsTable.append("tbody");

    this.config.rings.forEach((ring, index) => {
      const row = ringsBody.append("tr");

      row.append("td")
        .attr("class", `guidance-name ring-name-${index}`)
        .text(ring.name);

      row.append("td")
        .text(ring.description);
    });

    const quadrantsSection = grid.append("section");

    quadrantsSection.append("h2")
      .text("Quadrants");

    const quadrantsTable = quadrantsSection.append("table");

    quadrantsTable.append("thead")
      .append("tr")
      .selectAll("th")
      .data(["Quadrant", "Purpose"])
      .enter()
      .append("th")
      .text(d => d);

    const quadrantsBody = quadrantsTable.append("tbody");

    this.config.quadrants.forEach(quadrant => {
      const row = quadrantsBody.append("tr");

      row.append("td")
        .attr("class", "guidance-name")
        .text(quadrant.name);

      row.append("td")
        .text(quadrant.purpose);
    });
  }

  configureZoom() {
    this.zoom = d3.zoom()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [1000, 1000]])
      .extent([[0, 0], [1000, 1000]])
      .on("zoom", event => {
        this.viewport.attr("transform", event.transform);

        this.updateSelectedTooltip();
      });

    this.svg.call(this.zoom);
  }

  scrollLegendToQuadrant(index) {
    const legendElement = this.element("legendId");
    const heading = this.legend
      .selectAll(".legend-section h2")
      .filter((d, sectionIndex) => sectionIndex === index)
      .node();

    if (!legendElement || !heading) return;

    legendElement.scrollTo({
      top: heading.offsetTop - legendElement.offsetTop,
      behavior: "smooth"
    });
  }

  zoomToQuadrant(index) {
    const [x, y, width] = this.quadrants[index].box;
    const scale = 1000 / width;
    const transform = d3.zoomIdentity
      .translate(-x * scale, -y * scale)
      .scale(scale);

    this.svg.transition()
      .duration(500)
      .call(this.zoom.transform, transform);

    this.scrollLegendToQuadrant(index);
  }

  zoomToEntry(entry) {
    const scale = 2;
    const transform = d3.zoomIdentity
      .translate(this.width / 2 - entry.x * scale, this.height / 2 - entry.y * scale)
      .scale(scale);

    this.svg.transition()
      .duration(500)
      .call(this.zoom.transform, transform);
  }

  clearSelection() {
    this.selectionActive = false;
    this.selectedEntry = undefined;
    this.hideTooltip();

    this.root.selectAll(".blip")
      .classed("highlight", false)
      .classed("dimmed", false);

    d3.selectAll(".legend-item")
      .classed("highlight", false)
      .classed("dimmed", false);
  }

  clearSearch() {
    const search = this.element("searchId");

    if (search) {
      search.value = "";
    }

    this.hideTooltip();
    this.clearSelection();
  }

  resetZoom() {
    this.svg.transition()
      .duration(500)
      .call(this.zoom.transform, d3.zoomIdentity);

    this.element("legendId")?.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    this.clearSearch();
  }

  bindControls() {
    this.element("controlsId")?.querySelectorAll("button[data-zoom]").forEach(button => {
      button.addEventListener("click", () => {
        const value = button.getAttribute("data-zoom");

        value === "all"
          ? this.resetZoom()
          : this.zoomToQuadrant(Number(value));
      });
    });

    this.element("themeToggleId")?.addEventListener("click", () => {
      const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
      this.applyTheme(nextTheme, true);
      this.refreshThemeColours();
    });

    const search = this.element("searchId");

    search?.addEventListener("change", event => {
      this.goToEntry(event.target.value);
    });

    search?.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;

      event.preventDefault();
      this.goToEntry(event.target.value);
    });
  }

  refreshThemeColours() {
    if (!this.root) return;

    this.root.select("rect")
      .attr("fill", this.cssVar("--surface"));

    this.root.selectAll("line")
      .attr("stroke", this.cssVar("--grid"));

    this.root.selectAll("circle")
      .filter(function () {
        return d3.select(this).attr("fill") === "none";
      })
      .attr("stroke", this.cssVar("--grid"));

    this.root.selectAll(".ring-label")
      .attr("fill", (d, index) => this.ringColour(index));

    this.root.selectAll(".blip").each((d, index, nodes) => {
      const colour = this.ringColour(d.ring);
      d3.select(nodes[index]).select("circle").attr("fill", colour);
      d3.select(nodes[index]).select("path").attr("fill", colour);
    });
  }

  buildSearchOptions() {
    const list = this.element("searchOptionsId");

    if (!list) return;

    list.innerHTML = "";

    this.entries
      .toSorted((a, b) => a.label.localeCompare(b.label))
      .forEach(entry => {
        const option = document.createElement("option");
        option.value = entry.label;
        list.appendChild(option);
      });
  }

  scrollLegendToEntry(entry) {
    const legendElement = this.element("legendId");
    const legendItem = document.getElementById(`legend-item-${entry.id}`);

    if (!legendElement || !legendItem) return;

    const legendCanScroll = legendElement.scrollHeight > legendElement.clientHeight;

    if (!legendCanScroll) return;

    legendElement.scrollTo({
      top: legendItem.offsetTop - legendElement.offsetTop - 12,
      behavior: "smooth"
    });
  }

  goToEntry(label) {
    const entry = this.entryLookup.get(label.trim().toLowerCase());

    if (!entry) return;

    this.selectEntry(entry);

    const search = this.element("searchId");

    if (search) {
      search.value = "";
    }
  }
}

window.TechRadar = TechRadar;