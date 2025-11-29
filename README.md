<a id="readme-top"></a>
<div align="center">
    <a href="https://github.com/shinzo-labs/shinzo"><img src="https://github.com/user-attachments/assets/64f5e0ae-6924-41b1-b1da-1b22627e5c43" alt="Logo" width="256" height="256"></a>
    <h1 align="center">
        Shinzo: Complete observability platform for AI Agents and MCP servers
    </h1>
    <p align=center>
        <a href="https://github.com/shinzo-labs/shinzo/stargazers"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.github.com%2Frepos%2Fshinzo-labs%2Fshinzo%2Fstargazers&query=%24.length&logo=github&label=stars&color=e3b341" alt="Stars"></a>
        <a href="https://github.com/shinzo-labs/shinzo/forks"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.github.com%2Frepos%2Fshinzo-labs%2Fshinzo%2Fforks&query=%24.length&logo=github&label=forks&color=8957e5" alt="Forks"></a>
        <a href="https://github.com/shinzo-labs/shinzo/pulls"><img src="https://img.shields.io/badge/build-passing-green" alt="Build"></a>
        <a href="https://github.com/shinzo-labs/shinzo/graphs/contributors"><img src="https://img.shields.io/badge/contributors-welcome-339933?logo=github" alt="contributors welcome"></a>
        <a href="https://discord.gg/UYUdSdp5N8"><img src="https://discord-live-members-count-badge.vercel.app/api/discord-members?guildId=1079318797590216784" alt="Discord"></a>
    </p>
    <div align="center">
      <a href="https://youtu.be/OtBTAfbBr-w">
        <img src="https://github.com/user-attachments/assets/53783d00-2c47-4065-9614-bd381aaa21d6" alt="Shinzo Product Demo Video" width="560" height="315">
      </a>
    </div>
    Shinzo offers complete observability platform for agentic AI systems and MCP servers. Improve your AI deployment outcomes, identify inference inefficiencies, and gain insights into agent usage patterns.
    <p align=center>
        <a href="https://docs.shinzo.ai/"><strong>Explore the docs »</strong></a>
    </p>
</div>

<details>
  <summary>📋 Table of Contents</summary>

  - [🤖 About Shinzo](#about-shinzo)
  - [🏗️ Platform Architecture](#platform-architecture)
  - [⚙️ Installation](#installation)
  - [🗺️ Roadmap](#roadmap)
  - [🤝 Contributing](#contributing)
  - [📄 License](#license)
  - [📞 Contact](#contact)
  - [📚 Additional Resources](##additional-resources)
</details>

## 🤖 About Shinzo

 Shinzo is an open source observability platform that enables developers to ingest and analyze the performance data of their agentic AI systems. All data is [OpenTelemetry](https://opentelemetry.io/docs/) compliant and can be connected to other [OpenTelemetry-compatible software](https://opentelemetry.io/ecosystem/vendors/).

## 🏗️ Platform Architecture

- **OpenTelemetry Collector**: High-performance OpenTelemetry backend service that ingests and serves telemetry data from agent interactions.
- **Postgres Database**: Stores OpenTelemetry data efficiently and securely.
- **Analytics Web App**: Frontend dashboard for real-time analytics, trace analysis, performance profiling, tool usage stats, and more.

## ⚙️ Installation

### Prerequisites

#### Database
- PostgreSQL 15+ (running externally, not in Docker)
- See [db/README.md](./db/README.md) for setup instructions

#### Docker Deployment
- [Docker](https://docs.docker.com/get-started/#download-and-install-docker)
- [Docker Compose](https://docs.docker.com/compose/install/)

#### Local Development
- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/installation)

### Env Configs

Fill out env files with given variables:
- `.env`
- `backend/.env`
- `frontend/.env`

### Quick Start

#### 1. Database Setup

Follow steps in [db/README.md](./db/README.md) to set up your external PostgreSQL database.

#### 2. Environment Configuration

Copy the example environment files and update them:

```bash
# Backend configuration
cp backend/.env.example backend/.env
# Edit backend/.env with your database URL and other settings

# Frontend configuration
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your API URL and other frontend settings
```

**Important Port Configuration:**
- Backend runs on port **8000** (configurable via `BACKEND_PORT`)
- Frontend runs on port **3000** (configurable via `PORT` in frontend/.env)
- OpenTelemetry GRPC on port **4317** (configurable via `OTEL_GRPC_PORT`)
- OpenTelemetry HTTP on port **4318** (configurable via `OTEL_HTTP_PORT`)

#### 3. Local Development

```bash
# Install dependencies
cd backend && pnpm install

# Start the backend
pnpm start
```

#### 4. Docker Deployment

```bash
# Start supporting services (Redis, Kafka)
docker-compose up -d redis kafka

# Or start all services including backend and frontend
docker-compose up --build -d
```

#### 5. Verify Setup

Check that the backend is running:
```bash
curl http://localhost:8000/health
```

### Managing Services

#### Stop all services
```bash
docker-compose down
```

#### Start specific service
```bash
docker-compose up -d <backend|frontend|redis|kafka>
```

#### View logs
```bash
docker-compose logs -f <service-name>
```

### Troubleshooting

#### Database Connection Issues

- **Local development**: Use `localhost` in your DATABASE_URL
- **Docker backend connecting to host database**: Use `host.docker.internal` instead of `localhost` in DATABASE_URL
- **Connection refused**: Ensure PostgreSQL is running and accepting connections on the correct port
- **Authentication failed**: Verify username, password, and database name in DATABASE_URL

#### Docker Issues

- If using `sudo` with `docker-compose`, use `sudo -E` to preserve environment variables
- Ensure `pnpm` is up-to-date: `pnpm up --latest`
- For build issues, try: `docker-compose build --no-cache`

#### Environment Variables

- Copy `.env.example` files and customize them for your environment
- Ensure JWT_SECRET is set to a secure value in production
- Verify all required environment variables are set

## 🗺️ Roadmap

> _Note: For the complete roadmap timeline with all issues, see the [Roadmap](https://github.com/orgs/shinzo-labs/projects/1/views/4) page on Github._

- ✅ **Phase 0** _(June 2025)_
  - ✅ 🏗️ System Architecture Design
  - ✅ 🤝 Contributor Operations

- ✅ **Phase 1** _(July 2025)_
  - ✅ 📏 OpenTelemetry MCP Semantic Conventions
  - ✅ 🛠️ TypeScript Instrumentation SDK

- ✅ **Phase 2** _(August 2025)_
  - ✅ 📡 Telemetry Collector
  - ✅ 📊 Analytics Dashboard

- ✅ **Phase 3** _(September 2025)_
  - ✅ 🐍 Python Instrumentation SDK
  - ✅ 🏅 SOC2 Type II Kick-Off

- ⬜️ **Phase 4** _(Q4 2025)_
  - ✅ 🟡 Token Analytics
  - ✅ 🛡️ Session Management Insights
  - ⬜️ 🧠 Agent Interaction Analytics

- ⬜️ **Phase 5 & Beyond** _(Q1 2026)_
  - ⬜️ 🏅 SOC2 Type II Certification
  - ⬜️ 🧠 Agentic Recommendations
  - ⬜️ 🦦 Go MCP Instrumentation SDK
  - ⬜️ 💠 C# MCP Instrumentation SDK

- ⬜️ **Phase 6** _(Q2 2026+)_
  - ⬜️ 🚀 AI Routing Gateway
  - ⬜️ 🚨 Incident Alerting System
  - ⬜️ ☕ Java MCP Instrumentation SDK
  - ⬜️ 🦀 Rust MCP Instrumentation SDK

## 🤝 Contributing

Contributions to Shinzo are appreciated, whether you are a veteran building sophisticated enterprise AI agent systems or a newcomer just testing the waters. Shinzo accepts contributions both in terms of direct code contributions as well as non-technical support like community engagement, user testing, and professional partnerships. Feel free to join the conversation on our [Discord server](https://discord.gg/UYUdSdp5N8) and checkout  the [Contributing](./CONTRIBUTING.md) page to learn how you can become a contributor.

## 📄 License

Shinzo is [fair-code](https://faircode.io) software distributed under the [Sustainable Use License](./LICENSE.md) and [Shinzo Enterprise License](./LICENSE_EE.md).

- **Source Available**: Always visible source code
- **Self-Hostable**: Deploy anywhere
- **Extensible**: Add your own features or functionality

Enterprise licenses are available for additional features and support through [Shinzo Labs](mailto:austin@shinzolabs.com).

We believe that the fair-code license model offers a strong compromise between democratizing the benefits of open software while ensuring long-term sustainability of software maintenance and operations. Our specific license model is adapted from [n8n](https://github.com/n8n-io/n8n/tree/master), with additional context for the origin of the licenses [here](https://docs.n8n.io/reference/license/).

Some of this software's capabilities enable developers and businesses to collect data on usage of products by respective end users. Shinzo Labs accepts no responsibility for how this software is used by other developers, and by using this software you accept all terms of the relevant licenses, including the section on [No Liability](./LICENSE.md#no-liability).

## 📞 Contact

Contact Austin Born (austin@shinzolabs.com, [@austinbuilds](https://x.com/austinbuilds)) if you have any questions or comments related to this software.

## 📚 Additional Resources

* [Model Context Protocol](https://modelcontextprotocol.io/introduction)
* [OpenTelemetry](https://opentelemetry.io/docs/)

<p align="right">(<a href="">back to top</a>)</p>
