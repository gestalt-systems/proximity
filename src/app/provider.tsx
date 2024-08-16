import { DuckDBData as Data, MDConnection } from "@motherduck/wasm-client"
import assert from "assert"
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react"
import { LRUCache } from "./lru-cache"
import { PriorityQueue } from "./priority-queue"

type BaseRequest = { query: string; reject(reason?: string): void }

type ReadRequest = BaseRequest & { type: "read"; resolve(data: Data): void }
type ExecRequest = BaseRequest & { type: "exec"; resolve(): void }

type Request = ReadRequest | ExecRequest

const Priority = { High: 0, Normal: 1, Low: 2 } as const
type Priority = (typeof Priority)[keyof typeof Priority]
const PRIORITY_RANKS = Object.keys(Priority).length

type ReadParams = { query: string; useCache?: boolean; priority?: Priority }
type ExecParams = { query: string; priority?: Priority }

type Proximity = {
	isInitialized: boolean
	preread: (
		query: string,
		onRequest?: (request: ReadRequest) => void
	) => Promise<Data>
	read: (
		params: ReadParams,
		onRequest?: (request: ReadRequest) => void
	) => Promise<Data>
	exec: (
		params: ExecParams,
		onRequest?: (request: ExecRequest) => void
	) => Promise<void>
	cancelRequests: (requests: Request[]) => void
	clearRequests: () => void
}

const ProximityContext = createContext<Proximity | null>(null)

export function ProximityProvider({
	baseQuery,
	children,
}: {
	baseQuery: string | null
	children: React.ReactNode
}) {
	// TODO: Support creating and orchestrating multiple concurrent connections.
	const connection = MDConnection.create({
		mdToken: process.env.NEXT_PUBLIC_MOTHERDUCK_TOKEN!,
	})

	// Connections share a DuckDB WASM instance, and will not repeat the initialization process.
	const [isInitialized, setIsDatabaseInitialized] = useState(false)
	useEffect(() => {
		// This initialization process happens asynchronously.
		// Any query evaluated before initialization is complete will be queued.
		connection.isInitialized().then(() => setIsDatabaseInitialized(true))
	}, [connection])

	const pendingRef = useRef<Promise<void> | null>(null)
	const cacheRef = useRef(new LRUCache<string, Promise<Data>>())
	const queueRef = useRef(new PriorityQueue<Request>(PRIORITY_RANKS))

	const submit = useCallback(
		async (request: Request) => {
			const response = await connection.safeEvaluateQuery(request.query)
			if (response.status === "error") return request.reject()
			assert(response.status === "success")

			if (request.type === "read") request.resolve(response.result.data)
			else request.resolve()
		},
		[connection]
	)

	const next = useCallback(() => {
		const pending = pendingRef.current
		const queue = queueRef.current
		const request = queue.dequeue()
		if (pending || !request) return
		pendingRef.current = submit(request)
		pendingRef.current.finally(() => {
			pendingRef.current = null
			next()
		})
	}, [submit])

	const read = useCallback(
		async (
			{ query, useCache = true, priority = Priority.Normal }: ReadParams,
			onRequest?: (request: ReadRequest) => void
		): Promise<Data> => {
			const cache = cacheRef.current
			const cached = cache.get(query)
			if (useCache && cached) return cached

			const queue = queueRef.current
			const result = new Promise<Data>((resolve, reject) => {
				const request: ReadRequest = { query, type: "read", resolve, reject }
				// TODO: consolidate requests
				queue.enqueue(request, priority)
				onRequest?.(request)
				next()
			})

			if (useCache) cache.set(query, result)
			return result
		},
		[next]
	)

	const preread = useCallback(
		async (
			query: string,
			onRequest?: (request: ReadRequest) => void
		): Promise<Data> => {
			return read({ query, useCache: true, priority: Priority.Low }, onRequest)
		},
		[read]
	)

	const exec = useCallback(
		async (
			{ query, priority = Priority.Normal }: ExecParams,
			onRequest?: (request: ExecRequest) => void
		): Promise<void> => {
			const queue = queueRef.current
			const result = new Promise<void>((resolve, reject) => {
				const request: ExecRequest = { query, type: "exec", resolve, reject }
				queue.enqueue(request, priority)
				onRequest?.(request)
				next()
			})

			return result
		},
		[next]
	)

	const cancelRequests = useCallback((requests: Request[]) => {
		const set = new Set<Request>(requests)
		if (!set.size) return
		const queue = queueRef.current
		queue.remove((request) => {
			if (!set.has(request)) return false
			request.reject("cancelled")
			return true
		})
	}, [])

	const clearRequests = useCallback(() => {
		queueRef.current.remove((request) => {
			request.reject("cleared")
			return true
		})
	}, [])

	const [baseTable, setBaseTable] = useState<string | null>(null)

	useEffect(() => {
		cacheRef.current.clear()
		queueRef.current.clear()
		// TODO: resest indices
		// TODO: drop current sourceTable from db
		// TODO: create sourceTable in db from query
		// setBaseTable(query)
	}, [baseQuery])

	return (
		<ProximityContext.Provider
			value={{
				isInitialized,
				preread,
				read,
				exec,
				cancelRequests,
				clearRequests,
			}}
		>
			{children}
		</ProximityContext.Provider>
	)
}

export function useProximity(): Proximity {
	const proximity = useContext(ProximityContext)
	if (!proximity) throw new Error("useProximity must be in a ProximityProvider")
	return proximity
}
