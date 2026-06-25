# Tech Radar
An interactive Technology Radar for communicating an organisation's technology strategy.

A Technology Radar provides a visual framework for communicating an organisation's view of technology. Rather than simply cataloguing technologies, it communicates strategic direction by identifying which technologies are recommended for adoption, which are being evaluated, and which should be avoided.

Technology Radars help architecture and engineering teams communicate technical priorities, encourage informed discussion, and provide consistent guidance for technology decisions. They also provide a useful reference point when planning future initiatives.

This project is a lightweight, browser-based implementation written in HTML, CSS, and JavaScript, making it easy to host as a static website using GitHub Pages.

Technology Radars are commonly used to:

- Communicate technology strategy.
- Share architectural standards and guidance.
- Highlight emerging technologies worth exploring.
- Identify technologies that should be adopted, monitored, or retired.
- Encourage consistency across engineering teams.
- Support technology governance and decision-making.

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

The names, colours, and descriptions of the rings are fully configurable.

### Quadrants
The **four quadrants** group related technologies into categories.

Common examples include:

- Languages & Frameworks
- Platforms
- Infrastructure
- Tools

Quadrant names and descriptions are fully configurable, allowing each radar to represent different organisational domains or technology landscapes.

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

## Where we're at
This is rougth and ready first version to learn from with a bunch of different radar examples.

## Acknowledgements

This project was inspired by the excellent [Zalando Tech Radar](https://github.com/zalando/tech-radar).

While the concept and overall approach draw inspiration from Zalando's work, this implementation has been substantially rewritten with its own codebase, data format, configuration model, and user interface.