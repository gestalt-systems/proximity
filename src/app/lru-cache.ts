export class LRUCache<K, V> {
	private cache: Map<K, { value: V; last: number }>
	private max: number
	private ttl: number

	constructor(max = 1000, ttl = 3 * 60 * 60 * 1000) {
		this.cache = new Map<K, { value: V; last: number }>()
		this.max = max
		this.ttl = ttl
	}

	private evict() {
		const expire = performance.now() - this.ttl
		let lruKey: K | null = null
		let lruLast = Infinity

		this.cache.forEach((value, key) => {
			const { last } = value

			// least recently used entry seen so far
			if (last < lruLast) {
				lruKey = key
				lruLast = last
			}

			// remove if time since last access exceeds ttl
			if (expire > last) this.cache.delete(key)
		})

		// remove lru entry
		if (lruKey !== null) this.cache.delete(lruKey)
	}

	get(key: K): V | undefined {
		const entry = this.cache.get(key)
		if (entry) {
			entry.last = performance.now()
			return entry.value
		}
	}

	set(key: K, value: V): V {
		this.cache.set(key, { last: performance.now(), value })
		if (this.cache.size > this.max) {
			requestIdleCallback(this.evict.bind(this))
		}
		return value
	}

	clear(): void {
		this.cache.clear()
	}
}
