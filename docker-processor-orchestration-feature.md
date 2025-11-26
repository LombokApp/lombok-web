# Orchestration Design Summary (Profiles + Policies + Effective Profiles + Docker Exec Workflow)

This document summarizes the minimal design for the orchestration layer using:
- **ProfileSpec** (app-defined)
- **ProfilePolicy** (admin-defined)
- **EffectiveProfile** (combined view used by the scheduler)
- **Worker orchestration using Docker container labels, introspection, and `docker exec`**

Code examples are intentionally omitted.

---

## 1. ProfileSpec (defined by the app / job owner)

The ProfileSpec defines:
- The container image to run.
- Environment variables, mounts, command, and resource hints (GPU, memory, CPU).
- **Job classes**, each describing:
  - Per-class concurrency (`maxPerContainer`)
  - Whether jobs of this class should count toward global per-container caps
  - Optional scheduling hints (priority)
- Optional “desired” concurrency hints:
  - Suggested number of containers
  - Suggested max jobs per container

This spec represents **intent**, not hard limits.

---

## 2. ProfilePolicy (defined by the system administrator)

The ProfilePolicy defines:
- **Hard concurrency ceilings**:
  - Max containers globally (for that profile)
  - Max jobs per container (upper bound)
  - Optional max concurrent jobs globally (across containers)
- Host placement rules (allowed hosts, allow GPU, etc.)
- Cross-profile prioritization or quotas (optional)

Policies represent the **safety guardrails** and override any suggestions from the ProfileSpec.

---

## 3. EffectiveProfile (used by the scheduler at runtime)

The EffectiveProfile is computed by merging:
- ProfileSpec (intent)
- ProfilePolicy (limits)

The resulting EffectiveProfile contains:
- Actual max containers allowed globally
- Actual per-container job-cap (profile-level)
- Resolved job-class rules (per-class concurrency, whether to count toward global caps, priorities)
- Resource hints honored only if allowed by policy
- Allowed hosts / placement constraints

All scheduler decisions use the **EffectiveProfile** only.

---

## 4. Docker Worker Lifecycle and Discovery

### 4.1 Container Labeling
Every container created for a profile includes a standard label set:
- platform identifier
- profile ID
- profile hash (to identify config drift)
- worker role

Labels enable the scheduler to:
- Discover all active workers on orchestrator startup
- Rebuild in-memory worker state
- Distinguish workers belonging to different profile revisions

### 4.2 Container Introspection
The scheduler periodically or on-demand:
- Lists containers via Docker API
- Filters by labels
- Reconstructs worker pools and resource consumption

No persistent DB table is needed for containers; Docker is the source of truth.

---

## 5. Scheduler State (in-memory)

The orchestrator keeps a lightweight in-memory or ephemeral cached map of:
- WorkerState per worker:
  - Container ID
  - Associated profile
  - Busy job counts (total and per-class)
  - Last-used timestamp
- HostResourceState:
  - Allocated vs available resource tokens (e.g., GPU, memory)
- Global job counters (if needed for maxConcurrentJobsGlobal)

This state is rebuilt from Docker on orchestrator restart.

---

## 6. Scheduling Flow

1. A job is dequeued (contains profileId, jobClassId, payload, sync/async mode).
2. Using EffectiveProfile:
   - Filter eligible hosts.
   - Find a worker container with capacity based on:
     - Profile-level per-container cap
     - Job-class-level per-class cap
     - Global per-profile concurrency limits (optional)
3. If none found:
   - Check if a new worker can be spawned (respecting resource tokens and maxContainersGlobal).
   - Start a new container if allowed.
   - Otherwise requeue/delay the job.
4. Reserve capacity in WorkerState before dispatch.
5. Dispatch job via `docker exec` (see workflow below).
6. On completion or dispatch-ack:
   - Update WorkerState.
   - Mark job completed/accepted/etc.
7. Worker containers idle beyond TTL can be culled automatically.

---

## 7. Job Dispatch via `docker exec` + In-Container Agent

### Structure:
- Each worker container runs:
  - A long-lived **model server** / work server (inside container, listening on localhost).
  - A lightweight **agent executable/script** that:
    - Receives job parameters via `docker exec`
    - Forwards requests to the internal server over localhost
    - Prints structured JSON to stdout
    - Exits

### Sync Jobs
- Scheduler calls `docker exec agent --mode=sync ...`
- Agent forwards to the internal server and waits for completion.
- Result JSON is streamed back through the exec output.
- Scheduler interprets exec output as job result.

### Async Jobs
- Scheduler calls `docker exec agent --mode=async ...`
- Agent enqueues or submits the job internally and returns immediately with minimal info.
- Long-running work stays inside the worker container.
- Scheduler handles updates using its separate async mechanism (already implemented by you).

### Key property:
- **The orchestrator never needs network access to the container.**
- All communication uses the Docker exec stream.

---

## 8. Job Logging Model

- The worker’s internal server or code keeps **job-specific logging context**.
- For simple designs:
  - Logs for the job are kept in memory and returned in the job result (truncated as needed).
- For more advanced designs:
  - The agent provides a job-specific log file path.
  - Worker writes logs there for tailing or retrieval.
- Live logging is optional; a progress/heartbeat message may be sufficient.

---

## 9. Worker Cleanup

A periodic sweep:
- Stops workers that are idle beyond a configured TTL.
- Frees host resource tokens.
- Keeps total container count bounded.

---

## 10. Summary

This architecture provides:
- Flexible job typing (job classes)
- Admin-enforced hard concurrency/resource limits
- No persistent container state (all inferred from Docker)
- Simple reusable workers
- Generic job dispatch (exec-based, no container-external networking)
- Scaling from single host to multi-host with minimal changes

It remains thin, predictable, and controlled by explicit policy boundaries—without building a mini-Kubernetes.
