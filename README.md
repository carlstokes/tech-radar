# Tech Radar
A simple, configurable Technology Radar application for communicating an organisation's technology strategy.

A Technology Radar provides a visual framework for communicating an organisation's view of technology. Rather than simply cataloguing technologies, it communicates strategic direction by identifying which technologies are recommended for adoption, which are being evaluated, and which should be avoided.

Technology Radars help architecture and engineering teams communicate technical priorities, encourage informed discussion, and provide consistent guidance for technology decisions. They also provide a useful reference point when planning future initiatives.

This project is a lightweight, browser-based implementation written in HTML, CSS, and JavaScript, making it easy to host as a static website using GitHub Pages.

Unlike many Technology Radar implementations, this project supports multiple configurable radars from a single application, making it suitable for engineering, architecture, enterprise, platform, security, or other technology domains.

Technology Radars are commonly used to:

- Communicate technology strategy.
- Share architectural standards and guidance.
- Highlight emerging technologies worth exploring.
- Identify technologies that should be adopted, monitored, or retired.
- Encourage consistency across engineering teams.
- Support technology governance and decision-making.

## Features
- Multiple configurable radars.
- Interactive search and technology highlighting.
- Zoom directly to individual quadrants.
- Light and dark themes.
- Configurable rings and quadrants.
- JSON-based radar configuration.
- Static deployment with no backend dependencies.

## Radar Structure
Every Technology Radar consists of **four rings** and **four quadrants**, creating sixteen segments in which technologies are positioned.

The names and descriptions of both the rings and quadrants are configurable for each radar, allowing organisations to tailor the radar to their own terminology and governance model. However, every radar must define exactly **four rings** and **four quadrants**.

### Rings
The **four rings** represent an organisation's recommendation or level of confidence in a technology.

A common set of rings is:

| Ring | Description |
|------|-------------|
| **Adopt** | Technologies that are proven, well understood, and recommended for production use. |
| **Trial** | Technologies that have demonstrated value and are suitable for wider evaluation or controlled adoption. |
| **Assess** | Technologies that warrant investigation and experimentation before broader adoption. |
| **Hold** | Technologies that should generally be avoided for new work or are being phased out. |

The names, and descriptions of the rings are fully configurable.

### Quadrants
The **four quadrants** group related technologies into categories.

Common examples include:

- Languages & Frameworks
- Platforms
- Infrastructure
- Tools

Quadrant names and descriptions are fully configurable, allowing each radar to represent different organisational domains or technology landscapes.

## Configuration
The application is driven entirely by JSON configuration.

The `radars/radars.json` file defines the available radars, the default radar, and the files that should be loaded.

```json
{
  "default": "engineering",
  "radars": [
    {
      "id": "engineering",
      "label": "Engineering",
      "file": "engineering.json"
    }
  ]
}
```

Each radar is then defined in its own JSON file.

```text
radars/
├── radars.json
├── engineering.json
├── architecture.json
└── enterprise.json
```
A radar configuration contains:

- General information (`title`, `caption`, `date`).
- Four configurable quadrants.
- Four configurable rings.
- A collection of radar entries.

Each entry specifies:

- The quadrant it belongs to.
- The ring it belongs to.
- A label.
- A short description.
- An optional movement indicator.
- An optional hyperlink.

For example:

```json
{
  "label": "Dapr",
  "quadrant": 2,
  "ring": 1,
  "reason": "Simplifies service-to-service communication.",
  "moved": 1,
  "link": "https://docs.dapr.io"
}
```

Adding a new radar simply requires:

1. Creating a new radar JSON file.
2. Adding an entry to `radars.json`.

## Display Options
The appearance of the radar can be customised using URL query parameters. These are useful when embedding the radar in documentation or presenting a simplified view.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `radar` | Default radar | Selects the radar to display. |
| `sidebar` | `true` | Shows or hides the legend. |
| `guidance` | `true` | Shows or hides the guidance section. |
| `controls` | `true` | Shows or hides the toolbar. |
| `title` | `true` | Shows or hides the radar title, caption and date. |
| `theme` | `system` | Sets the theme (`light`, `dark` or `system`). |

### Examples
Display the Enterprise radar:

```
?radar=enterprise
```

Hide the guidance section:

```
?guidance=false
```

Show only the radar and legend:

```
?controls=false&guidance=false
```

Force the dark theme:

```
?theme=dark
```

Combine multiple options:

```
?radar=architecture&theme=dark&guidance=false
```

## Running Locally
Clone the repository and serve the project using any local web server.

For example:

```
bash python -m http.server
```

Then browse to:

```
http://localhost:8000
```

## Hosting
The tech-radar is entirely static and can be hosted using GitHub Pages or any web server capable of serving static content.

## Acknowledgements
This project was inspired by the excellent [Zalando Tech Radar](https://github.com/zalando/tech-radar) and the [Thoughtworks Technology Radar](https://www.thoughtworks.com/radar).

While the concept and overall approach draw inspiration from Zalando's work, this implementation has been substantially rewritten with its own codebase, data format, configuration model, and user interface.
