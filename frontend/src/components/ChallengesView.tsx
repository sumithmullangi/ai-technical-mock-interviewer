import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  Search,
  SlidersHorizontal,
  Code2,
  CheckCircle2,
  Copy,
  Check,
  X,
  Loader2,
  BookOpen,
  ShieldAlert,
} from 'lucide-react';
import type {
  ConfiguredSession,
  StartedSessionData,
  InterviewConfig,
} from '../types';
import { apiFetch } from '../utils/api';

export interface ChallengeItem {
  id: string;
  title: string;
  domain: string;
  domainCategory: 'distributed' | 'infrastructure' | 'fullstack' | 'data';
  domainLabel: string;
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Staff';
  language: 'Python' | 'Java' | 'SQL';
  summary: string;
  problemStatement: string;
  keyTopics: string[];
  expectedConcepts: string[];
  rubricWeight: string;
  starterCode: string;
}

export const DETAILED_CHALLENGES: ChallengeItem[] = [
  {
    id: 'ch-1',
    title: 'Distributed Rate Limiter with Sliding Window & Lua',
    domain: 'Backend Engineer (Distributed Systems)',
    domainCategory: 'distributed',
    domainLabel: 'Distributed Systems',
    difficulty: 'Senior',
    language: 'Python',
    summary: 'Design a thread-safe sliding window rate limiter capable of handling 50k QPS across microservices using Redis Lua scripts, atomic increments, and clock drift mitigation.',
    problemStatement: `You are designing a distributed rate limiter protecting tier-1 API endpoints handling up to 50,000 QPS.
Requirements:
1. Implement a sliding window log or sliding window counter algorithm that strictly enforces rate limits without boundary burst vulnerabilities.
2. Formulate atomic operations using Redis Lua scripts so that concurrent cluster requests cannot induce race conditions or over-admit traffic.
3. Account for multi-datacenter clock skew (NTP drift) and network partition fail-open vs. fail-closed semantics.`,
    keyTopics: ['Token Bucket', 'Sliding Window Counter', 'Redis Lua', 'Clock Skew', 'Fail-Open Semantics'],
    expectedConcepts: [
      'Sliding window boundary calculation',
      'Atomic EVALSHA script invocation',
      'Memory cleanup of expired bucket timestamps',
      'Degraded fallback when Redis cluster degrades',
    ],
    rubricWeight: 'Correctness (40%) • Scale (20%) • Edge Cases (25%)',
    starterCode: `import time
from typing import Optional

class DistributedRateLimiter:
    """
    Distributed sliding window rate limiter backed by Redis.
    Guarantees atomic execution and sub-millisecond check latency.
    """
    def __init__(self, redis_client, window_seconds: int = 60, max_requests: int = 100):
        self.redis = redis_client
        self.window = window_seconds
        self.max_requests = max_requests

    def is_allowed(self, client_id: str, cost: int = 1) -> tuple[bool, int]:
        """
        Evaluate if client request can proceed.
        Returns: (is_allowed: bool, remaining_tokens: int)
        """
        # TODO: Implement atomic Lua script execution
        now = time.time()
        pass
`,
  },
  {
    id: 'ch-2',
    title: 'Cache Stampede & Thundering Herd Mitigation',
    domain: 'Systems Infrastructure & Reliability',
    domainCategory: 'infrastructure',
    domainLabel: 'Infrastructure & SRE',
    difficulty: 'Staff',
    language: 'Python',
    summary: 'Implement probabilistic early expiration (XFetch algorithm) and distributed mutex locking to prevent database overload during high-traffic cache invalidations.',
    problemStatement: `High-frequency cached items (e.g. system configurations, homepage feeds) frequently cause severe database thundering herds when the TTL expires simultaneously across all application workers.
Requirements:
1. Implement the XFetch algorithm (probabilistic early recomputation) where background requests probabilistically refresh the cache as the TTL approaches expiration.
2. Implement a distributed mutex with a fencing token fallback to ensure only a single worker executes the heavy database query if the cache completely misses.
3. Ensure zero deadlocks and graceful degradation if the distributed lock backend times out.`,
    keyTopics: ['XFetch Algorithm', 'Probabilistic Expiration', 'Thundering Herd', 'Distributed Mutex'],
    expectedConcepts: [
      'Beta parameter tuning for XFetch formula',
      'Non-blocking background refresh trigger',
      'Fencing token verification on database write',
      'Stale-while-revalidate serving pattern',
    ],
    rubricWeight: 'Technical Depth (35%) • Edge Cases (30%) • Correctness (25%)',
    starterCode: `import math
import random
import time
from typing import Callable, Any, Optional

class ResilientCache:
    def __init__(self, storage_client, beta: float = 1.0):
        self.storage = storage_client
        self.beta = beta  # XFetch aggressiveness multiplier

    def get_or_compute(self, key: str, ttl: int, compute_fn: Callable[[], Any]) -> Any:
        """
        Fetches item or triggers probabilistic early compute.
        Formula: -beta * delta * ln(random()) > (ttl_expiry - now)
        """
        # TODO: Implement XFetch evaluation and distributed lock fallback
        pass
`,
  },
  {
    id: 'ch-3',
    title: 'Distributed Mutex with Fencing Tokens & TTL Leases',
    domain: 'Backend Engineer (Distributed Systems)',
    domainCategory: 'distributed',
    domainLabel: 'Distributed Systems',
    difficulty: 'Staff',
    language: 'Java',
    summary: 'Architect a consensus-backed distributed lock manager that generates monotonically increasing fencing tokens to prevent split-brain state mutations during GC pauses.',
    problemStatement: `Martin Kleppmann famously proved that standard TTL locks (like basic Redlock) are unsafe under stop-the-world garbage collection pauses or process descheduling.
Requirements:
1. Architect a distributed lock client that issues strictly monotonic fencing tokens (e.g. LockToken with sequence number).
2. The storage resource must validate that incoming write requests carry a token strictly greater than the highest token previously committed.
3. Implement heartbeat-driven lease renewal in a daemon thread, with automated self-cancellation if renewal heartbeats fail.`,
    keyTopics: ['Fencing Tokens', 'Lease Renewal', 'Stop-the-World GC', 'Split-Brain Mutation'],
    expectedConcepts: [
      'Monotonically increasing sequence allocation',
      'Resource-side fence verification invariant',
      'Asynchronous heartbeat daemon with lease time bound',
      'Safe release semantics with CAS comparison',
    ],
    rubricWeight: 'Architectural Depth (35%) • Correctness (35%) • Clarity (15%)',
    starterCode: `package com.interview.distributed;

import java.time.Duration;
import java.util.Optional;

public class DistributedLockManager {
    public static class LockHandle {
        public final String resourceId;
        public final long fencingToken;
        public final long leaseExpiryEpochMs;

        public LockHandle(String resourceId, long fencingToken, long leaseExpiryEpochMs) {
            this.resourceId = resourceId;
            this.fencingToken = fencingToken;
            this.leaseExpiryEpochMs = leaseExpiryEpochMs;
        }
    }

    public Optional<LockHandle> acquireLock(String resourceId, Duration leaseDuration) {
        // TODO: Allocate monotonic fencing token and register lease
        return Optional.empty();
    }

    public boolean releaseLock(LockHandle handle) {
        // TODO: Verify ownership via compare-and-swap before releasing
        return false;
    }
}
`,
  },
  {
    id: 'ch-4',
    title: 'Multi-Region Read Replica Lag & Failover Resolution',
    domain: 'Data & Analytics Pipeline Engineer',
    domainCategory: 'data',
    domainLabel: 'Data Pipelines',
    difficulty: 'Senior',
    language: 'SQL',
    summary: 'Implement read-your-writes causal consistency across geo-distributed PostgreSQL read replicas with semi-synchronous replication and automatic split-brain prevention.',
    problemStatement: `A global e-commerce service experiences checkout discrepancies when users write their cart to a primary region database and immediately read from a lagging read replica in their local geography.
Requirements:
1. Write PostgreSQL queries and DDL to establish a replication lag tracking table with write-ahead log (WAL) LSN offsets.
2. Formulate a routing heuristic where transactions requiring causal consistency ('read-your-writes') are dynamically routed to the primary when replica lag exceeds a threshold LSN.
3. Construct an idempotent failover query that resolves split-brain situations when promoting a standby replica.`,
    keyTopics: ['Replication Lag', 'WAL LSN Offsets', 'Causal Consistency', 'Read-Your-Writes'],
    expectedConcepts: [
      'pg_last_wal_replay_lsn vs pg_current_wal_lsn',
      'Session-level consistency token tracking',
      'Idempotent transaction outbox table',
      'Connection pooling failover logic',
    ],
    rubricWeight: 'Technical Depth (30%) • Correctness (40%) • Edge Cases (20%)',
    starterCode: `-- Schema & Lag Telemetry Query for Causal Consistency Routing
CREATE TABLE IF NOT EXISTS replica_heartbeats (
    replica_id VARCHAR(64) PRIMARY KEY,
    region VARCHAR(32) NOT NULL,
    last_replay_lsn PG_LSN NOT NULL,
    last_heartbeat_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- TODO: Formulate the query to identify if replica has caught up with required write LSN
-- PARAMETER: :required_write_lsn, :target_replica_id
`,
  },
  {
    id: 'ch-5',
    title: 'Real-Time WebSocket Pub/Sub with Ring Buffer Backpressure',
    domain: 'Full-Stack Web Architect',
    domainCategory: 'fullstack',
    domainLabel: 'Full-Stack Systems',
    difficulty: 'Senior',
    language: 'Python',
    summary: 'Construct an asynchronous WebSocket fanout broker with bounded ring buffers, backpressure load shedding, and client heartbeat re-synchronization under packet loss.',
    problemStatement: `A real-time financial trading dashboard broadcasts market quote ticks to 100,000 connected browser WebSocket clients. Slow clients on mobile connections buffer unbounded messages, causing OOM server crashes.
Requirements:
1. Construct an asynchronous fanout broker that decouples market ingestion from per-client WebSocket transmission using bounded ring buffers.
2. Implement load shedding policies: if a client's buffer reaches high-water mark (90%), conflate intermediate quote ticks and only retain latest best bid/ask.
3. Manage heartbeat pings and detect dead TCP sockets without stalling the broadcast loop.`,
    keyTopics: ['Ring Buffer', 'Backpressure Load Shedding', 'Message Conflation', 'Heartbeat Keep-Alive'],
    expectedConcepts: [
      'Bounded asyncio.Queue per subscriber',
      'Tick conflation on buffer saturation',
      'Non-blocking event loop execution',
      'Connection cleanup on disconnection',
    ],
    rubricWeight: 'Correctness (35%) • Edge Cases (30%) • Scale (20%)',
    starterCode: `import asyncio
from typing import Dict, Set

class MarketDataFanoutBroker:
    def __init__(self, max_queue_depth: int = 100):
        self.max_queue_depth = max_queue_depth
        self.subscribers: Dict[str, asyncio.Queue] = {}

    async def broadcast_tick(self, symbol: str, price: float, timestamp: float):
        """
        Broadcast tick to all connected clients.
        If a client queue is full, apply conflation or drop oldest.
        """
        # TODO: Implement non-blocking broadcast with backpressure
        pass

    async def register_client(self, client_id: str) -> asyncio.Queue:
        # TODO: Setup bounded queue with backpressure hooks
        pass
`,
  },
  {
    id: 'ch-6',
    title: 'Saga Pattern Coordinator with Compensating Transactions',
    domain: 'Backend Engineer (Distributed Systems)',
    domainCategory: 'distributed',
    domainLabel: 'Distributed Systems',
    difficulty: 'Senior',
    language: 'Java',
    summary: 'Build a distributed checkout workflow using the Saga choreography pattern with transactional outbox messaging and idempotent compensating rollback actions.',
    problemStatement: `An e-commerce order workflow spans three independent microservices: Order Service, Payment Gateway, and Inventory Service. Two-phase commit (2PC) is rejected due to latency and coordinator blocking.
Requirements:
1. Design an orchestrated Saga coordinator that executes the forward steps: Reserve Inventory -> Process Payment -> Confirm Order.
2. If payment processing fails or times out, the coordinator must trigger compensating rollback transactions (e.g. Release Inventory) in strict reverse sequence.
3. Ensure every step and compensating transaction carries an idempotency key to prevent double execution during network retries.`,
    keyTopics: ['Saga Pattern', 'Compensating Transactions', 'Idempotency Keys', 'Transactional Outbox'],
    expectedConcepts: [
      'Strict reverse sequence compensation execution',
      'Idempotency key enforcement on all service calls',
      'Persistent saga execution log for crash recovery',
      'Timeout detection with dead-letter queue escalation',
    ],
    rubricWeight: 'Correctness (40%) • Clarity (20%) • Edge Cases (25%)',
    starterCode: `package com.interview.saga;

import java.util.UUID;

public class OrderSagaCoordinator {
    public enum SagaStatus { PENDING, INVENTORY_RESERVED, COMPLETED, COMPENSATING, FAILED }

    public static class SagaContext {
        public final UUID orderId;
        public final UUID idempotencyKey;
        public SagaStatus status;

        public SagaContext(UUID orderId) {
            this.orderId = orderId;
            this.idempotencyKey = UUID.randomUUID();
            this.status = SagaStatus.PENDING;
        }
    }

    public boolean executeCheckoutSaga(SagaContext ctx) {
        // TODO: Execute Step 1: Reserve Inventory
        // TODO: Execute Step 2: Charge Payment
        // TODO: On failure, trigger backward compensating transactions
        return false;
    }
}
`,
  },
  {
    id: 'ch-7',
    title: 'LSM-Tree MemTable Flush & Write-Ahead Log Compaction',
    domain: 'Systems Infrastructure & Reliability',
    domainCategory: 'infrastructure',
    domainLabel: 'Infrastructure & SRE',
    difficulty: 'Staff',
    language: 'Java',
    summary: 'Implement a thread-safe concurrent MemTable that coordinates write-ahead logging (WAL), atomic threshold flush transitions, and background SSTable disk compaction.',
    problemStatement: `Design the core storage engine ingestion path inspired by RocksDB/Cassandra.
Requirements:
1. Maintain an in-memory concurrent skip list (MemTable) that accepts key-value mutations while appending each write to a sequential append-only WAL.
2. When the MemTable reaches size threshold (e.g. 64MB), atomically transition it to an immutable MemTable and allocate a fresh active MemTable with zero write stall.
3. Coordinate a background flush worker that writes immutable MemTables to sorted-string tables (SSTables) on disk and truncates the obsolete WAL segment.`,
    keyTopics: ['LSM-Tree', 'MemTable & SSTable', 'Write-Ahead Log (WAL)', 'Zero Write Stall'],
    expectedConcepts: [
      'Atomic swap of active and immutable MemTables',
      'Sequential disk I/O guarantees for WAL',
      'Concurrency control during background flush',
      'Bloom filter generation during SSTable serialization',
    ],
    rubricWeight: 'Technical Depth (40%) • Correctness (35%) • Scale (25%)',
    starterCode: `package com.interview.storage;

import java.util.concurrent.ConcurrentSkipListMap;
import java.util.concurrent.atomic.AtomicReference;

public class LSMStorageEngine {
    private final AtomicReference<ConcurrentSkipListMap<byte[], byte[]>> activeMemTable;
    private final AtomicReference<ConcurrentSkipListMap<byte[], byte[]>> immutableMemTable;
    private final long maxMemTableSizeBytes;

    public LSMStorageEngine(long maxMemTableSizeBytes) {
        this.maxMemTableSizeBytes = maxMemTableSizeBytes;
        this.activeMemTable = new AtomicReference<>(new ConcurrentSkipListMap<>());
        this.immutableMemTable = new AtomicReference<>(null);
    }

    public void put(byte[] key, byte[] value) {
        // TODO: Append to WAL, put into activeMemTable, and trigger flush if over limit
    }
}
`,
  },
  {
    id: 'ch-8',
    title: 'Deadlock Detection & Cycle Resolution in Transaction Graphs',
    domain: 'Systems Infrastructure & Reliability',
    domainCategory: 'infrastructure',
    domainLabel: 'Infrastructure & SRE',
    difficulty: 'Mid',
    language: 'Python',
    summary: 'Build a wait-for graph (WFG) deadlock detection engine that continuously analyzes lock dependency edges, discovers cycles using Tarjan/DFS, and aborts the minimum-cost transaction.',
    problemStatement: `A relational database engine manages concurrent row locks across multi-statement transactions. When circular wait conditions occur (T1 waits for T2, T2 waits for T1), the system locks up permanently.
Requirements:
1. Construct a dynamic directed Wait-For Graph (WFG) where nodes represent transactions and edges represent lock acquisition dependencies.
2. Implement cycle detection (e.g., using Tarjan's strongly connected components or cycle-finding DFS).
3. When a cycle is detected, select a victim transaction using a cost heuristic (e.g., fewest mutations made or youngest timestamp) and abort it to release all held locks.`,
    keyTopics: ['Wait-For Graph (WFG)', 'Cycle Detection', 'Deadlock Victim Selection', 'Tarjan Algorithm'],
    expectedConcepts: [
      'Directed graph edge insertion and deletion',
      'Depth-first search cycle identification',
      'Minimum-rollback victim selection heuristic',
      'Thread safety of lock table data structures',
    ],
    rubricWeight: 'Correctness (40%) • Depth (30%) • Clarity (15%)',
    starterCode: `from typing import Dict, Set, List, Optional

class WaitForGraph:
    def __init__(self):
        # Maps transaction_id -> set of transaction_ids it is waiting for
        self.graph: Dict[str, Set[str]] = {}
        self.tx_start_times: Dict[str, float] = {}

    def add_dependency(self, waiting_tx: str, holding_tx: str):
        # TODO: Add edge and evaluate for cycles
        pass

    def detect_and_resolve_deadlock(self) -> Optional[str]:
        """
        Detects if a cycle exists in the dependency graph.
        Returns the victim transaction ID that was selected for abort, or None.
        """
        # TODO: Detect cycle and pick victim with youngest start time
        return None
`,
  },
  {
    id: 'ch-9',
    title: 'Event-Driven Idempotent Payment Consumer with Outbox Table',
    domain: 'Data & Analytics Pipeline Engineer',
    domainCategory: 'data',
    domainLabel: 'Data Pipelines',
    difficulty: 'Senior',
    language: 'SQL',
    summary: 'Construct an idempotent Kafka event consumer storage layer in PostgreSQL using SELECT FOR UPDATE SKIP LOCKED, transactional outbox records, and deduplication keys.',
    problemStatement: `A distributed payment consumer receives webhook and queue events from stripe/adyen. Due to network retries, duplicate events are delivered frequently.
Requirements:
1. Formulate PostgreSQL DDL and transactions that atomically verify idempotency keys before processing ledger mutations.
2. Use SELECT ... FOR UPDATE SKIP LOCKED to allow multiple parallel worker processes to safely dequeue and process events without contention or lock serialization bottlenecks.
3. Ensure every successfully processed event commits both the balance update and the outbound audit notification in a single atomic database transaction (Transactional Outbox).`,
    keyTopics: ['Transactional Outbox', 'SKIP LOCKED', 'Idempotency Key', 'Atomic Balance Mutation'],
    expectedConcepts: [
      'SELECT ... FOR UPDATE SKIP LOCKED worker semantics',
      'Unique constraint on idempotency_key',
      'Atomic balance debit/credit with state check',
      'Outbox event insertion within same transaction boundary',
    ],
    rubricWeight: 'Correctness (45%) • Edge Cases (25%) • Technical Depth (20%)',
    starterCode: `-- Idempotent Payment Ingestion & Outbox Processing
CREATE TABLE IF NOT EXISTS processed_payments (
    idempotency_key VARCHAR(128) PRIMARY KEY,
    account_id UUID NOT NULL,
    amount_cents BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS transaction_outbox (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    dispatched BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- TODO: Formulate the atomic worker transaction that evaluates idempotency,
-- updates account balance, and writes to transaction_outbox.
`,
  },
];

interface ChallengesViewProps {
  onStartSession: (session: StartedSessionData) => void;
  onConfigSaved: (session: ConfiguredSession) => void;
  onSwitchToStudio?: () => void;
}

export const ChallengesView: React.FC<ChallengesViewProps> = ({
  onStartSession,
  onConfigSaved,
  onSwitchToStudio,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [inspectingChallenge, setInspectingChallenge] = useState<ChallengeItem | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [launchStage, setLaunchStage] = useState<'idle' | 'validating' | 'starting'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtered challenge list
  const filteredChallenges = useMemo(() => {
    return DETAILED_CHALLENGES.filter((ch) => {
      // Category filter
      if (selectedCategory !== 'all' && ch.domainCategory !== selectedCategory) {
        return false;
      }
      // Difficulty filter
      if (selectedDifficulty !== 'all' && ch.difficulty !== selectedDifficulty) {
        return false;
      }
      // Language filter
      if (selectedLanguage !== 'all' && ch.language !== selectedLanguage) {
        return false;
      }
      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = ch.title.toLowerCase().includes(query);
        const matchesSummary = ch.summary.toLowerCase().includes(query);
        const matchesTopics = ch.keyTopics.some((t) => t.toLowerCase().includes(query));
        return matchesTitle || matchesSummary || matchesTopics;
      }
      return true;
    });
  }, [searchQuery, selectedCategory, selectedDifficulty, selectedLanguage]);

  const handleLaunchChallenge = async (ch: ChallengeItem) => {
    setLaunchingId(ch.id);
    setLaunchStage('validating');
    setErrorMessage(null);

    const customConfig: InterviewConfig = {
      role: ch.domain,
      difficulty: ch.difficulty,
      primaryLanguage: ch.language,
      questionCount: 5,
    };

    const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

    try {
      // Step 1: Configure backend session
      const configRes = await apiFetch(`${apiBase}/api/v1/interviews/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: customConfig.role.trim(),
          difficulty: customConfig.difficulty,
          primaryLanguage: customConfig.primaryLanguage,
          questionCount: customConfig.questionCount,
        }),
      });

      if (!configRes.ok) {
        const errJson = await configRes.json().catch(() => null);
        throw new Error(errJson?.detail || 'Failed to configure challenge session.');
      }

      const configuredData: ConfiguredSession = await configRes.json();
      onConfigSaved(configuredData);

      // Step 2: Start session and fetch Question 1
      setLaunchStage('starting');
      const sid = configuredData.sessionId || configuredData.session_id;
      const startRes = await apiFetch(`${apiBase}/api/v1/interviews/${sid}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!startRes.ok) {
        const errJson = await startRes.json().catch(() => null);
        throw new Error(errJson?.detail || 'Failed to start challenge session.');
      }

      const startedData: StartedSessionData = await startRes.json();
      onStartSession(startedData);
    } catch (err: unknown) {
      setLaunchStage('idle');
      setLaunchingId(null);
      setErrorMessage(
        err instanceof TypeError && err.message === 'Failed to fetch'
          ? 'Unable to connect to FastAPI backend on port 8000.'
          : err instanceof Error
          ? err.message
          : 'Failed to launch challenge session.'
      );
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="w-full relative z-10 animate-fadeIn">
      <div className="editorial-frame border-b border-[#E5DFD5] dark:border-[#232328]">
        {/* Workspace Specimen Datum Strip */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-2.5 border-b border-[#E5DFD5] dark:border-[#232328] text-[10px] font-mono tracking-[0.25em] uppercase text-[#7A7875] dark:text-slate-400 select-none bg-[#F8F6F1]/90 dark:bg-[#141417]/90 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]"></span>
            <span className="font-semibold text-[#111111] dark:text-[#F4F4F5]">
              TECHNICAL PROBLEM BANK // SYSTEM DESIGN & ALGORITHMIC REPOSITORY
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <span>{DETAILED_CHALLENGES.length} CURATED SPECS</span>
            <span className="text-[#F59E0B]">•</span>
            <span>REAL-TIME EVALUATION</span>
            <span className="text-[#F59E0B]">•</span>
            <span>ZERO CLIENT EXECUTION</span>
          </div>
        </div>

        {/* Directory Command Header */}
        <section className="px-4 sm:px-8 lg:px-12 py-8 sm:py-10 border-b border-[#E5DFD5] dark:border-[#232328] bg-[#FAF8F5]/80 dark:bg-[#141417]/90 relative transition-colors">
          <div className="editorial-crosshair -top-2.5 -left-2.5 text-[#E5DFD5] dark:text-[#27272E]">+</div>
          <div className="editorial-crosshair -top-2.5 -right-2.5 text-[#E5DFD5] dark:text-[#27272E]">+</div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#E5DFD5] dark:border-[#27272E] bg-white dark:bg-[#18181C] text-[10px] font-mono tracking-widest uppercase text-[#3A0F34] dark:text-[#F59E0B] mb-3 shadow-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] animate-pulse"></span>
                <span>CURATED TECHNICAL CHALLENGES</span>
              </div>
              <h1 className="font-didone text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#111111] dark:text-[#F4F4F5] leading-[1.05]">
                Engineering Challenge Bank
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-[#555555] dark:text-slate-300 font-sans leading-relaxed">
                Practice high-concurrency systems design, algorithmic invariants, and distributed state coordination. Select any challenge to immediately calibrate and initiate a live technical interview session.
              </p>
            </div>

            {onSwitchToStudio && (
              <div className="flex items-center gap-2.5 font-mono text-xs">
                <button
                  type="button"
                  onClick={onSwitchToStudio}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5DFD5] dark:border-[#27272E] bg-white dark:bg-[#18181C] text-[#3A0F34] dark:text-[#F4F4F5] hover:bg-[#FAF8F5] dark:hover:bg-[#232328] transition-all cursor-pointer font-semibold uppercase tracking-wider text-[11px] shadow-xs hover:shadow-sm"
                >
                  <span>Open Studio Console</span>
                  <ArrowRight className="h-3 w-3 text-[#F59E0B]" />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Global Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="mx-4 sm:mx-8 my-4 p-4 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50/90 dark:bg-rose-950/60 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-3 shadow-xs"
          >
            <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-sans">
              <span className="font-semibold font-mono">Launch Notice: </span>
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-600 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-200 font-mono text-xs"
            >
              [Dismiss]
            </button>
          </div>
        )}

        {/* Search & Multi-Facet Filtering Bar */}
        <section className="px-4 sm:px-8 py-6 border-b border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] transition-colors">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7A7875] dark:text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search challenges (e.g. Lua, Raft, Backpressure, Mutex)..."
                className="w-full pl-9 pr-3.5 py-2.5 text-xs font-mono border border-[#E5DFD5] dark:border-[#27272E] bg-[#FAF8F5] dark:bg-[#111113] text-[#111111] dark:text-[#F4F4F5] placeholder:text-[#8A8782] dark:placeholder:text-slate-500 focus:border-[#3A0F34] dark:focus:border-[#F59E0B] focus:outline-none rounded-xl transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7A7875] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#F8F6F1]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Domain Filter */}
              <div className="flex items-center rounded-xl border border-[#E5DFD5] dark:border-[#27272E] divide-x divide-[#E5DFD5] dark:divide-[#27272E] bg-[#FAF8F5] dark:bg-[#111113] text-[11px] font-mono overflow-hidden shadow-2xs">
                {[
                  { id: 'all', label: 'All Domains' },
                  { id: 'distributed', label: 'Distributed' },
                  { id: 'infrastructure', label: 'Infra & SRE' },
                  { id: 'fullstack', label: 'Full-Stack' },
                  { id: 'data', label: 'Data Pipelines' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 transition cursor-pointer uppercase ${
                      selectedCategory === cat.id
                        ? 'bg-[#3A0F34] text-white dark:bg-[#F59E0B] dark:text-[#09090B] font-bold'
                        : 'text-[#555555] dark:text-slate-300 hover:text-[#111111] dark:hover:text-[#F8F6F1] hover:bg-white dark:hover:bg-[#18181C]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Language Filter */}
              <div className="flex items-center rounded-xl border border-[#E5DFD5] dark:border-[#27272E] divide-x divide-[#E5DFD5] dark:divide-[#27272E] bg-[#FAF8F5] dark:bg-[#111113] text-[11px] font-mono overflow-hidden shadow-2xs">
                {[
                  { id: 'all', label: 'All Langs' },
                  { id: 'Python', label: 'Python' },
                  { id: 'Java', label: 'Java' },
                  { id: 'SQL', label: 'SQL' },
                ].map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setSelectedLanguage(lang.id)}
                    className={`px-3 py-1.5 transition cursor-pointer uppercase ${
                      selectedLanguage === lang.id
                        ? 'bg-[#3A0F34] text-white dark:bg-[#F59E0B] dark:text-[#09090B] font-bold'
                        : 'text-[#555555] dark:text-slate-300 hover:text-[#111111] dark:hover:text-[#F8F6F1] hover:bg-white dark:hover:bg-[#18181C]'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              {/* Seniority Filter */}
              <div className="flex items-center rounded-xl border border-[#E5DFD5] dark:border-[#27272E] divide-x divide-[#E5DFD5] dark:divide-[#27272E] bg-[#FAF8F5] dark:bg-[#111113] text-[11px] font-mono overflow-hidden shadow-2xs">
                {[
                  { id: 'all', label: 'All Levels' },
                  { id: 'Mid', label: 'Mid' },
                  { id: 'Senior', label: 'Senior' },
                  { id: 'Staff', label: 'Staff' },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSelectedDifficulty(lvl.id)}
                    className={`px-3 py-1.5 transition cursor-pointer uppercase ${
                      selectedDifficulty === lvl.id
                        ? 'bg-[#3A0F34] text-white dark:bg-[#F59E0B] dark:text-[#09090B] font-bold'
                        : 'text-[#555555] dark:text-slate-300 hover:text-[#111111] dark:hover:text-[#F8F6F1] hover:bg-white dark:hover:bg-[#18181C]'
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Filter Count Status */}
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-[#7A7875] dark:text-slate-400">
            <span>
              Showing <strong className="text-[#111111] dark:text-[#F4F4F5]">{filteredChallenges.length}</strong> of{' '}
              {DETAILED_CHALLENGES.length} engineering challenges
            </span>
            {(selectedCategory !== 'all' || selectedDifficulty !== 'all' || selectedLanguage !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedDifficulty('all');
                  setSelectedLanguage('all');
                  setSearchQuery('');
                }}
                className="text-[#3A0F34] dark:text-[#F59E0B] hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </section>

        {/* Challenge Cards Grid */}
        <section className="px-4 sm:px-8 py-10 bg-[#F8F6F1] dark:bg-[#111113] transition-colors">
          {filteredChallenges.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] shadow-xs">
              <SlidersHorizontal className="h-8 w-8 text-[#7A7875] dark:text-slate-400 mx-auto mb-3" />
              <h3 className="font-didone text-lg font-bold text-[#111111] dark:text-[#F4F4F5]">No matching challenges found</h3>
              <p className="text-xs text-[#555555] dark:text-slate-300 mt-1 font-sans">
                Try loosening your search query or selecting "All Domains" and "All Levels".
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedDifficulty('all');
                  setSelectedLanguage('all');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 rounded-xl border border-[#3A0F34] dark:border-[#F59E0B] bg-[#3A0F34] dark:bg-[#F59E0B] text-white dark:text-[#09090B] text-xs font-mono uppercase font-bold transition shadow-xs"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredChallenges.map((ch) => {
                const isLaunching = launchingId === ch.id;
                return (
                  <div
                    key={ch.id}
                    className="relative p-6 rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] flex flex-col justify-between hover:border-[#3A0F34] dark:hover:border-[#F59E0B]/70 transition-all duration-200 group shadow-xs hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[10px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full border border-[#E5DFD5] dark:border-[#27272E] bg-[#FAF8F5] dark:bg-[#18181C] text-[#3A0F34] dark:text-[#F59E0B]">
                          {ch.domainLabel}
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <span className="px-2 py-0.5 rounded-full bg-[#3A0F34] dark:bg-[#F59E0B] text-white dark:text-[#09090B] font-bold">
                            {ch.difficulty}
                          </span>
                          <span className="px-2 py-0.5 rounded-full border border-[#E5DFD5] dark:border-[#27272E] bg-[#FAF8F5] dark:bg-[#111113] text-[#555555] dark:text-slate-300 font-semibold">
                            {ch.language}
                          </span>
                        </div>
                      </div>

                      {/* Title & Summary */}
                      <h3 className="font-didone text-lg font-bold text-[#111111] dark:text-[#F4F4F5] leading-snug group-hover:text-[#3A0F34] dark:group-hover:text-[#F59E0B] transition-colors">
                        {ch.title}
                      </h3>
                      <p className="mt-2.5 text-xs text-[#555555] dark:text-slate-300 font-sans leading-relaxed">
                        {ch.summary}
                      </p>

                      {/* Key Topics */}
                      <div className="mt-4 flex flex-wrap gap-1.5 font-mono text-[9px] text-[#7A7875] dark:text-slate-400">
                        {ch.keyTopics.map((k) => (
                          <span key={k} className="px-2 py-0.5 rounded-md bg-[#FAF8F5] dark:bg-[#111113] border border-[#E5DFD5] dark:border-[#27272E]">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-6 pt-4 border-t border-[#E5DFD5] dark:border-[#232328] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setInspectingChallenge(ch)}
                        className="text-[11px] font-mono text-[#555555] dark:text-slate-300 hover:text-[#111111] dark:hover:text-[#F8F6F1] hover:underline transition cursor-pointer flex items-center gap-1"
                      >
                        <BookOpen className="h-3.5 w-3.5 text-[#3A0F34] dark:text-[#F59E0B]" />
                        <span>Inspect Spec</span>
                      </button>

                      <button
                        type="button"
                        disabled={launchStage !== 'idle'}
                        onClick={() => handleLaunchChallenge(ch)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#3A0F34] to-[#52174A] hover:from-[#2A0B26] hover:to-[#3E1137] dark:from-[#F59E0B] dark:to-[#D97706] dark:hover:from-[#D97706] dark:hover:to-[#B45309] text-white dark:text-[#09090B] text-[11px] font-mono font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-50 shadow-xs hover:shadow-md hover:scale-[1.02]"
                      >
                        {isLaunching ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F59E0B] dark:text-[#09090B]" />
                            <span>
                              {launchStage === 'validating' ? 'Validating...' : 'Starting...'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span>Practice</span>
                            <ArrowRight className="h-3 w-3 text-[#F59E0B] dark:text-[#09090B]" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Challenge Detail & Starter Code Inspector Modal */}
      {inspectingChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#F8F6F1] dark:bg-[#141417] border border-[#E5DFD5] dark:border-[#27272E] rounded-3xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#3A0F34] text-[#F59E0B] dark:bg-[#F59E0B] dark:text-[#09090B] shadow-xs">
                  <Code2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#7A7875] dark:text-slate-400 block">
                    {inspectingChallenge.domainLabel} • {inspectingChallenge.difficulty} • {inspectingChallenge.language}
                  </span>
                  <h2 className="font-didone text-xl font-bold text-[#111111] dark:text-[#F4F4F5]">
                    {inspectingChallenge.title}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingChallenge(null)}
                className="p-1.5 rounded-full text-[#7A7875] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#F8F6F1] hover:bg-[#FAF8F5] dark:hover:bg-[#18181C] transition cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs font-sans text-[#333333] dark:text-slate-200 divide-y divide-[#E5DFD5] dark:divide-[#27272E]/50">
              {/* Problem Statement */}
              <div>
                <h3 className="font-mono font-bold text-[#3A0F34] dark:text-[#F59E0B] uppercase tracking-wider text-[11px] mb-2">
                  Architectural Problem Statement
                </h3>
                <p className="whitespace-pre-line leading-relaxed text-[#444444] dark:text-slate-300">
                  {inspectingChallenge.problemStatement}
                </p>
              </div>

              {/* Rubric Weights & Expected Concepts */}
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-mono font-bold text-[#3A0F34] dark:text-[#F59E0B] uppercase tracking-wider text-[11px] mb-2">
                    Evaluation Weighting
                  </h4>
                  <p className="font-mono text-xs text-[#555555] dark:text-slate-300 bg-white dark:bg-[#111113] p-3 rounded-xl border border-[#E5DFD5] dark:border-[#27272E]">
                    {inspectingChallenge.rubricWeight}
                  </p>
                </div>

                <div>
                  <h4 className="font-mono font-bold text-[#3A0F34] dark:text-[#F59E0B] uppercase tracking-wider text-[11px] mb-2">
                    Core Architectural Vectors
                  </h4>
                  <ul className="space-y-1.5 text-[11px] text-[#555555] dark:text-slate-300">
                    {inspectingChallenge.expectedConcepts.map((c) => (
                      <li key={c} className="flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#3A0F34] dark:text-[#F59E0B] shrink-0 mt-0.5" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Starter Code Preview */}
              <div className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-mono font-bold text-[#3A0F34] dark:text-[#F59E0B] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <span>Starter Interface Signature</span>
                    <span className="text-[10px] text-[#7A7875] dark:text-slate-400">({inspectingChallenge.language})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => copyCode(inspectingChallenge.starterCode)}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-[#3A0F34] dark:text-[#F59E0B] hover:underline cursor-pointer"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-3 w-3 text-[#F59E0B]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Stub</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative bg-[#111111] text-[#F8F6F1] p-4 rounded-2xl font-mono text-xs overflow-x-auto border border-[#E5DFD5] dark:border-[#27272E] shadow-xs">
                  <pre>{inspectingChallenge.starterCode}</pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] flex items-center justify-between gap-4">
              <span className="text-[10px] font-mono text-[#7A7875] dark:text-slate-400">
                Initiates server-authoritative mock interview with live coding editor.
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setInspectingChallenge(null)}
                  className="px-4 py-2 rounded-xl border border-[#E5DFD5] dark:border-[#27272E] bg-white dark:bg-[#111113] text-xs font-mono font-semibold text-[#555555] dark:text-slate-300 hover:bg-[#F8F6F1] dark:hover:bg-[#18181C] transition cursor-pointer shadow-xs"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={launchStage !== 'idle'}
                  onClick={() => {
                    const ch = inspectingChallenge;
                    setInspectingChallenge(null);
                    handleLaunchChallenge(ch);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3A0F34] to-[#52174A] hover:from-[#2A0B26] hover:to-[#3E1137] dark:from-[#F59E0B] dark:to-[#D97706] dark:hover:from-[#D97706] dark:hover:to-[#B45309] text-white dark:text-[#09090B] text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-50 shadow-xs hover:shadow-md hover:scale-[1.02]"
                >
                  <span>Practice This Challenge</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#F59E0B] dark:text-[#09090B]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
